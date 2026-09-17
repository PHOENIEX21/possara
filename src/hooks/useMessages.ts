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
  reactions: ThreadReaction[];
}

export interface SendMessageInput {
  content: string;
  replyToId?: string | null;
  forwardedFromId?: string | null;
}

function invalidateMessaging(queryClient: ReturnType<typeof useQueryClient>, userId?: string | null, otherUserId?: string) {
  queryClient.invalidateQueries({ queryKey: ["message-thread", userId, otherUserId] });
  queryClient.invalidateQueries({ queryKey: ["conversations"] });
}

export function useConversations() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["conversations", userId],
    enabled: !!userId,
    queryFn: async (): Promise<ConversationPreview[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("sender_id, recipient_id, content, read, created_at, sender_deleted_at, recipient_deleted_at")
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
            content: m.content,
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

      return visible.map((m: any) => ({
        ...m,
        reactions: reactions.filter((r) => r.message_id === m.id),
      })) as ThreadMessage[];
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
