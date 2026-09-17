import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import type { Profile } from "../types/database";

export type MessageReaction = "spark" | "love" | "laugh" | "insightful" | "support";

export type MessageRow = {
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
  replyPreview?: { id: string; content: string; sender_id: string } | null;
  reactions?: { user_id: string; reaction: MessageReaction }[];
};

export interface ConversationPreview {
  otherUserId: string;
  otherUser: Pick<Profile, "full_name" | "avatar_url" | "username"> | null;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
}

export function useConversations() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["conversations", userId],
    enabled: !!userId,
    refetchInterval: 15_000,
    queryFn: async (): Promise<ConversationPreview[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("sender_id, recipient_id, content, read, created_at, sender_deleted_at, recipient_deleted_at")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;

      const byOther = new Map<string, { content: string; created_at: string; unread: boolean }>();
      for (const message of data ?? []) {
        const mine = message.sender_id === userId;
        if ((mine && message.sender_deleted_at) || (!mine && message.recipient_deleted_at)) continue;
        const otherId = mine ? message.recipient_id : message.sender_id;
        if (!byOther.has(otherId)) {
          byOther.set(otherId, {
            content: message.content,
            created_at: message.created_at,
            unread: !mine && !message.read,
          });
        }
      }

      const otherIds = [...byOther.keys()];
      if (!otherIds.length) return [];
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, username")
        .in("id", otherIds);
      if (profileError) throw profileError;
      const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      return otherIds
        .map((id) => ({
          otherUserId: id,
          otherUser: profileById.get(id) ?? null,
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
    queryFn: async (): Promise<MessageRow[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, content, read, created_at, reply_to_id, forwarded_from_id, edited_at, sender_deleted_at, recipient_deleted_at")
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
        .order("created_at", { ascending: true })
        .limit(300);
      if (error) throw error;

      const visible = (data ?? []).filter((message) => {
        const mine = message.sender_id === userId;
        return mine ? !message.sender_deleted_at : !message.recipient_deleted_at;
      }) as MessageRow[];

      const ids = visible.map((message) => message.id);
      const replyIds = [...new Set(visible.map((message) => message.reply_to_id).filter(Boolean))] as string[];
      const [reactionResult, replyResult] = await Promise.all([
        ids.length
          ? supabase.from("message_reactions").select("message_id, user_id, reaction").in("message_id", ids)
          : Promise.resolve({ data: [], error: null }),
        replyIds.length
          ? supabase.from("messages").select("id, content, sender_id").in("id", replyIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (reactionResult.error) throw reactionResult.error;
      if (replyResult.error) throw replyResult.error;

      const reactionsByMessage = new Map<string, { user_id: string; reaction: MessageReaction }[]>();
      for (const row of reactionResult.data ?? []) {
        const current = reactionsByMessage.get(row.message_id) ?? [];
        current.push({ user_id: row.user_id, reaction: row.reaction as MessageReaction });
        reactionsByMessage.set(row.message_id, current);
      }
      const repliesById = new Map((replyResult.data ?? []).map((row) => [row.id, row]));

      return visible.map((message) => ({
        ...message,
        reactions: reactionsByMessage.get(message.id) ?? [],
        replyPreview: message.reply_to_id ? repliesById.get(message.reply_to_id) ?? null : null,
      }));
    },
  });
}

export function useSendMessage(otherUserId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ content, replyToId = null, forwardedFromId = null }: { content: string; replyToId?: string | null; forwardedFromId?: string | null }) => {
      if (!userId) throw new Error("Sign in to send messages.");
      const clean = content.trim();
      if (!clean) throw new Error("Write a message first.");
      if (clean.length > 4000) throw new Error("Messages can be up to 4000 characters.");
      const { error } = await supabase.from("messages").insert({
        sender_id: userId,
        recipient_id: otherUserId,
        content: clean,
        reply_to_id: replyToId,
        forwarded_from_id: forwardedFromId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-thread", userId, otherUserId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["message-thread", userId, otherUserId] });
    },
  });
}

export function useEditMessage(otherUserId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      if (!userId) throw new Error("Sign in first.");
      const clean = content.trim();
      if (!clean) throw new Error("Message cannot be empty.");
      const { error } = await supabase
        .from("messages")
        .update({ content: clean, edited_at: new Date().toISOString() })
        .eq("id", messageId)
        .eq("sender_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-thread", userId, otherUserId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useDeleteMessageForMe(otherUserId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (message: MessageRow) => {
      if (!userId) return;
      const patch = message.sender_id === userId
        ? { sender_deleted_at: new Date().toISOString() }
        : { recipient_deleted_at: new Date().toISOString() };
      const { error } = await supabase.from("messages").update(patch).eq("id", message.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-thread", userId, otherUserId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useReactToMessage(otherUserId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, reaction }: { messageId: string; reaction: MessageReaction }) => {
      if (!userId) throw new Error("Sign in first.");
      const { error } = await supabase.from("message_reactions").upsert(
        { message_id: messageId, user_id: userId, reaction },
        { onConflict: "message_id,user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["message-thread", userId, otherUserId] }),
  });
}
