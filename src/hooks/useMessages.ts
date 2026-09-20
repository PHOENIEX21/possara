import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import type { Profile } from "../types/database";

export interface ConversationPreview {
  otherUserId: string;
  otherUser: Pick<Profile, "full_name" | "avatar_url" | "username"> | null;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
}

export type MessageReactionType = "spark" | "love" | "laugh" | "insightful" | "support";

export interface ThreadReaction {
  message_id: string;
  user_id: string;
  reaction: MessageReactionType;
  created_at: string;
}

export interface ThreadMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read: boolean | null;
  created_at: string;
  reply_to_id: string | null;
  forwarded_from_id: string | null;
  edited_at: string | null;
  sender_deleted_at: string | null;
  recipient_deleted_at: string | null;
  image_path: string | null;
  image_mime_type: string | null;
  image_name: string | null;
  image_url?: string | null;
  audio_path: string | null;
  audio_duration_seconds: number | null;
  audio_mime_type: string | null;
  audio_url?: string | null;
  reactions: ThreadReaction[];
}

export interface SendMessageInput {
  content: string;
  replyToId?: string | null;
  forwardedFromId?: string | null;
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const AUDIO_TYPES = new Set(["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"]);
const SIGNED_URL_SECONDS = 60 * 30;
const SIGNED_URL_REUSE_MS = 25 * 60 * 1000;
const signedMediaCache = new Map<string, { url: string; reusableUntil: number }>();

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) || "file";
}

function invalidateMessaging(queryClient: ReturnType<typeof useQueryClient>, userId?: string | null, otherUserId?: string) {
  queryClient.invalidateQueries({ queryKey: ["message-thread", userId, otherUserId] });
  queryClient.invalidateQueries({ queryKey: ["conversations"] });
  queryClient.invalidateQueries({ queryKey: ["unread-message-count"] });
}

function previewText(row: { content?: string | null; image_path?: string | null; audio_path?: string | null }) {
  const text = row.content?.trim();
  if (text) return text;
  if (row.image_path) return "📷 Photo";
  if (row.audio_path) return "🎤 Voice note";
  return "Message";
}

async function stableSignedUrl(bucket: "message-media" | "voice-notes", path: string) {
  const key = `${bucket}:${path}`;
  const cached = signedMediaCache.get(key);
  if (cached && cached.reusableUntil > Date.now()) return cached.url;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) return null;
  signedMediaCache.set(key, { url: data.signedUrl, reusableUntil: Date.now() + SIGNED_URL_REUSE_MS });
  return data.signedUrl;
}

async function attachPrivateMedia(message: any): Promise<ThreadMessage> {
  const [imageUrl, audioUrl] = await Promise.all([
    message.image_path ? stableSignedUrl("message-media", message.image_path) : Promise.resolve(null),
    message.audio_path ? stableSignedUrl("voice-notes", message.audio_path) : Promise.resolve(null),
  ]);
  return { ...message, image_url: imageUrl, audio_url: audioUrl } as ThreadMessage;
}

export function useConversations() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["conversations", userId],
    enabled: !!userId,
    queryFn: async (): Promise<ConversationPreview[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("sender_id, recipient_id, content, image_path, audio_path, read, created_at, sender_deleted_at, recipient_deleted_at")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;

      const byOther = new Map<string, { content: string; created_at: string; unread: boolean }>();
      (data ?? []).forEach((m: any) => {
        const mine = m.sender_id === userId;
        if ((mine && m.sender_deleted_at) || (!mine && m.recipient_deleted_at)) return;
        const otherId = mine ? m.recipient_id : m.sender_id;
        if (!byOther.has(otherId)) {
          byOther.set(otherId, {
            content: previewText(m),
            created_at: m.created_at,
            unread: m.recipient_id === userId && !m.read,
          });
        }
      });

      const otherIds = [...byOther.keys()];
      if (!otherIds.length) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, username")
        .in("id", otherIds);
      const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      return otherIds
        .map((id) => ({
          otherUserId: id,
          otherUser: (profileById.get(id) as ConversationPreview["otherUser"]) ?? null,
          lastMessage: byOther.get(id)!.content,
          lastMessageAt: byOther.get(id)!.created_at,
          unread: byOther.get(id)!.unread,
        }))
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    },
  });
}

export function useThread(otherUserId: string | undefined) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["message-thread", userId, otherUserId],
    enabled: !!userId && !!otherUserId,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<ThreadMessage[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
        .order("created_at", { ascending: true })
        .limit(300);
      if (error) throw error;

      const visible = (data ?? []).filter((m: any) => {
        const mine = m.sender_id === userId;
        return mine ? !m.sender_deleted_at : !m.recipient_deleted_at;
      });
      const ids = visible.map((m: any) => m.id);
      let reactions: ThreadReaction[] = [];
      if (ids.length) {
        const { data: reactionRows, error: reactionError } = await supabase
          .from("message_reactions")
          .select("message_id, user_id, reaction, created_at")
          .in("message_id", ids);
        if (reactionError) throw reactionError;
        reactions = (reactionRows ?? []) as ThreadReaction[];
      }

      const enriched = await Promise.all(visible.map((m: any) => attachPrivateMedia({
        ...m,
        reactions: reactions.filter((r) => r.message_id === m.id),
      })));
      return enriched;
    },
  });
}

export function useSendMessage(otherUserId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: string | SendMessageInput) => {
      if (!userId) throw new Error("Sign in to send messages.");
      const payload: SendMessageInput = typeof input === "string" ? { content: input } : input;
      const content = payload.content.trim();
      if (!content) throw new Error("Message cannot be empty.");
      if (content.length > 4000) throw new Error("Messages can be up to 4000 characters.");
      const { error } = await supabase.from("messages").insert({
        sender_id: userId,
        recipient_id: otherUserId,
        content,
        reply_to_id: payload.replyToId ?? null,
        forwarded_from_id: payload.forwardedFromId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateMessaging(queryClient, userId, otherUserId),
  });
}

export function useSendPhotoMessage(otherUserId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, caption = "", replyToId = null }: { file: File; caption?: string; replyToId?: string | null }) => {
      if (!userId) throw new Error("Sign in to send photos.");
      if (!IMAGE_TYPES.has(file.type)) throw new Error("Use a JPG, PNG or WebP photo.");
      if (file.size > 8 * 1024 * 1024) throw new Error("Message photos must be 8 MB or smaller.");
      const cleanCaption = caption.trim();
      if (cleanCaption.length > 4000) throw new Error("Captions can be up to 4000 characters.");
      const name = safeFileName(file.name);
      const path = `${userId}/${otherUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${name}`;
      const { error: uploadError } = await supabase.storage.from("message-media").upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
      if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);
      const { error: messageError } = await supabase.from("messages").insert({
        sender_id: userId,
        recipient_id: otherUserId,
        content: cleanCaption,
        reply_to_id: replyToId,
        image_path: path,
        image_mime_type: file.type,
        image_name: name,
      });
      if (messageError) {
        await supabase.storage.from("message-media").remove([path]);
        throw messageError;
      }
    },
    onSuccess: () => invalidateMessaging(queryClient, userId, otherUserId),
  });
}

export function useSendVoiceMessage(otherUserId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ blob, durationSeconds, mimeType }: { blob: Blob; durationSeconds: number; mimeType: string }) => {
      if (!userId) throw new Error("Sign in to send voice notes.");
      const normalizedType = mimeType.split(";")[0];
      if (!AUDIO_TYPES.has(normalizedType)) throw new Error("This browser produced an unsupported voice-note format.");
      if (blob.size > 2 * 1024 * 1024) throw new Error("Voice note is too large. Keep it under 90 seconds.");
      const ext = normalizedType.includes("mp4") ? "m4a" : normalizedType.includes("ogg") ? "ogg" : normalizedType.includes("mpeg") ? "mp3" : normalizedType.includes("wav") ? "wav" : "webm";
      const path = `${userId}/${otherUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("voice-notes").upload(path, blob, { contentType: normalizedType, cacheControl: "3600", upsert: false });
      if (uploadError) throw new Error(`Voice-note upload failed: ${uploadError.message}`);
      const { error: messageError } = await supabase.from("messages").insert({
        sender_id: userId,
        recipient_id: otherUserId,
        content: "",
        audio_path: path,
        audio_duration_seconds: Math.max(1, Math.min(90, Math.round(durationSeconds))),
        audio_mime_type: normalizedType,
      });
      if (messageError) {
        await supabase.storage.from("voice-notes").remove([path]);
        throw messageError;
      }
    },
    onSuccess: () => invalidateMessaging(queryClient, userId, otherUserId),
  });
}

export function useForwardMessage() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ message, targetUserId }: { message: ThreadMessage; targetUserId: string }) => {
      if (!userId) throw new Error("Sign in to forward messages.");
      if (!targetUserId || targetUserId === userId) throw new Error("Choose another POSSARA member.");
      let imagePath: string | null = null;
      let audioPath: string | null = null;
      try {
        if (message.image_path) {
          const { data: imageBlob, error: downloadError } = await supabase.storage.from("message-media").download(message.image_path);
          if (downloadError || !imageBlob) throw new Error("Could not copy this photo for forwarding.");
          const name = safeFileName(message.image_name || "photo.jpg");
          imagePath = `${userId}/${targetUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${name}`;
          const { error: uploadError } = await supabase.storage.from("message-media").upload(imagePath, imageBlob, { contentType: message.image_mime_type || imageBlob.type || "image/jpeg", upsert: false });
          if (uploadError) throw uploadError;
        }
        if (message.audio_path) {
          const { data: audioBlob, error: downloadError } = await supabase.storage.from("voice-notes").download(message.audio_path);
          if (downloadError || !audioBlob) throw new Error("Could not copy this voice note for forwarding.");
          const ext = message.audio_mime_type?.includes("mp4") ? "m4a" : message.audio_mime_type?.includes("ogg") ? "ogg" : message.audio_mime_type?.includes("mpeg") ? "mp3" : "webm";
          audioPath = `${userId}/${targetUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: uploadError } = await supabase.storage.from("voice-notes").upload(audioPath, audioBlob, { contentType: message.audio_mime_type || audioBlob.type || "audio/webm", upsert: false });
          if (uploadError) throw uploadError;
        }
        const { error } = await supabase.from("messages").insert({
          sender_id: userId,
          recipient_id: targetUserId,
          content: message.content,
          forwarded_from_id: message.forwarded_from_id ?? message.id,
          image_path: imagePath,
          image_mime_type: imagePath ? message.image_mime_type : null,
          image_name: imagePath ? message.image_name : null,
          audio_path: audioPath,
          audio_duration_seconds: audioPath ? message.audio_duration_seconds : null,
          audio_mime_type: audioPath ? message.audio_mime_type : null,
        });
        if (error) throw error;
        return targetUserId;
      } catch (error) {
        if (imagePath) await supabase.storage.from("message-media").remove([imagePath]);
        if (audioPath) await supabase.storage.from("voice-notes").remove([audioPath]);
        throw error;
      }
    },
    onSuccess: (targetUserId) => invalidateMessaging(queryClient, userId, targetUserId),
  });
}

export function useMarkThreadRead(otherUserId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from("messages")
        .update({ read: true })
        .eq("recipient_id", userId)
        .eq("sender_id", otherUserId)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => invalidateMessaging(queryClient, userId, otherUserId),
  });
}

export function useToggleMessageReaction(otherUserId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, reaction, currentReaction }: { messageId: string; reaction: MessageReactionType; currentReaction?: MessageReactionType | null }) => {
      if (!userId) throw new Error("Sign in to react to messages.");
      if (currentReaction === reaction) {
        const { error } = await supabase.from("message_reactions").delete().eq("message_id", messageId).eq("user_id", userId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("message_reactions").upsert(
        { message_id: messageId, user_id: userId, reaction },
        { onConflict: "message_id,user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["message-thread", userId, otherUserId] }),
  });
}

export function useEditMessage(otherUserId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      if (!userId) throw new Error("Sign in to edit messages.");
      const clean = content.trim();
      if (!clean) throw new Error("Message cannot be empty.");
      if (clean.length > 4000) throw new Error("Messages can be up to 4000 characters.");
      const { error } = await supabase
        .from("messages")
        .update({ content: clean, edited_at: new Date().toISOString() })
        .eq("id", messageId)
        .eq("sender_id", userId);
      if (error) throw error;
    },
    onSuccess: () => invalidateMessaging(queryClient, userId, otherUserId),
  });
}

export function useDeleteMessageForMe(otherUserId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, sentByMe }: { messageId: string; sentByMe: boolean }) => {
      if (!userId) throw new Error("Sign in to manage messages.");
      const update = sentByMe
        ? { sender_deleted_at: new Date().toISOString() }
        : { recipient_deleted_at: new Date().toISOString() };
      let query = supabase.from("messages").update(update).eq("id", messageId);
      query = sentByMe ? query.eq("sender_id", userId) : query.eq("recipient_id", userId);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => invalidateMessaging(queryClient, userId, otherUserId),
  });
}


export function useMessageRequests(){
 const {userId}=useAuth();
 return useQuery({queryKey:["message-requests",userId],enabled:!!userId,queryFn:async()=>{const {data,error}=await supabase.from("messages").select("id,sender_id,recipient_id,content,created_at,recipient_deleted_at").eq("recipient_id",userId as string).is("recipient_deleted_at",null).order("created_at",{ascending:false}).limit(300);if(error)throw error;const senders=[...new Set((data??[]).map((m:any)=>m.sender_id))];if(!senders.length)return [];const {data:sent,error:sentError}=await supabase.from("messages").select("recipient_id").eq("sender_id",userId as string).in("recipient_id",senders);if(sentError)throw sentError;const replied=new Set((sent??[]).map((m:any)=>m.recipient_id));const latest=new Map<string,any>();(data??[]).forEach((m:any)=>{if(!replied.has(m.sender_id)&&!latest.has(m.sender_id))latest.set(m.sender_id,m);});const ids=[...latest.keys()];if(!ids.length)return [];const {data:profiles}=await supabase.from("profiles").select("id,full_name,username,avatar_url").in("id",ids);const byId=new Map((profiles??[]).map((p:any)=>[p.id,p]));return ids.map(id=>({senderId:id,message:latest.get(id),profile:byId.get(id)??null}));}});
}
export function useDeclineMessageRequest(){const {userId}=useAuth();const qc=useQueryClient();return useMutation({mutationFn:async(senderId:string)=>{if(!userId)throw new Error("Sign in first.");const {error}=await supabase.from("messages").update({recipient_deleted_at:new Date().toISOString()}).eq("recipient_id",userId).eq("sender_id",senderId).is("recipient_deleted_at",null);if(error)throw error;},onSuccess:()=>{qc.invalidateQueries({queryKey:["message-requests"]});qc.invalidateQueries({queryKey:["conversations"]});}});}
