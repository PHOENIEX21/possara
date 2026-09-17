import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import type { Profile } from "../types/database";

export type MessageReaction = "spark" | "love" | "laugh" | "insightful" | "support";

export interface RichMessage {
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
  reply_to?: Pick<RichMessage, "id" | "content" | "sender_id"> | null;
  message_reactions?: { user_id: string; reaction: MessageReaction }[];
}

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

      const visible = (data ?? []).filter((m) =>
        m.sender_id === userId ? !m.sender_deleted_at : !m.recipient_deleted_at,
      );
      const byOther = new Map<string, { content: string; created_at: string; unread: boolean }>();
      visible.forEach((m) => {
        const otherId = m.sender_id === userId ? m.recipient_id : m.sender_id;
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
      const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
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
    queryFn: async (): Promise<RichMessage[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, content, read, created_at, reply_to_id, forwarded_from_id, edited_at, sender_deleted_at, recipient_deleted_at, reply_to:reply_to_id(id, content, sender_id), message_reactions(user_id, reaction)")
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
        .order("created_at", { ascending: true })
        .limit(300);
      if (error) throw error;
      return ((data ?? []) as unknown as RichMessage[]).filter((m) =>
        m.sender_id === userId ? !m.sender_deleted_at : !m.recipient_deleted_at,
      );
    },
  });
}

export function useSendMessage(otherUserId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ content, replyToId, forwardedFromId }: { content: string; replyToId?: string | null; forwardedFromId?: string | null }) => {
      if (!userId) throw new Error("Sign in to send messages.");
      const clean = content.trim();
      if (!clean) throw new Error("Write a message first.");
      if (clean.length > 4000) throw new Error("Messages can be up to 4000 characters.");
      const { error } = await supabase.from("messages").insert({
        sender_id: userId,
        recipient_id: otherUserId,
        content: clean,
        reply_to_id: replyToId ?? null,
        forwarded_from_id: forwardedFromId ?? null,
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
    mutationFn: async (message: RichMessage) => {
      if (!userId) return;
      const field = message.sender_id === userId ? "sender_deleted_at" : "recipient_deleted_at";
      const { error } = await supabase.from("messages").update({ [field]: new Date().toISOString() }).eq("id", message.id);
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
      const { error } = await supabase
        .from("message_reactions")
        .upsert({ message_id: messageId, user_id: userId, reaction }, { onConflict: "message_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["message-thread", userId, otherUserId] }),
  });
}

export function useRemoveMessageReaction(otherUserId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      if (!userId) return;
      const { error } = await supabase.from("message_reactions").delete().eq("message_id", messageId).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["message-thread", userId, otherUserId] }),
  });
}

export function useTypingIndicator(otherUserId: string | undefined) {
  const { userId } = useAuth();
  const [otherTyping, setOtherTyping] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const channel = useMemo(() => {
    if (!userId || !otherUserId) return null;
    const room = [userId, otherUserId].sort().join(":");
    return supabase.channel(`typing:${room}`);
  }, [userId, otherUserId]);

  useEffect(() => {
    if (!channel || !otherUserId) return;
    channel.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload?.userId !== otherUserId) return;
      setOtherTyping(!!payload?.typing);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      if (payload?.typing) timeoutRef.current = window.setTimeout(() => setOtherTyping(false), 1800);
    });
    channel.subscribe();
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      void supabase.removeChannel(channel);
    };
  }, [channel, otherUserId]);

  const setTyping = (typing: boolean) => {
    if (!channel || !userId) return;
    void channel.send({ type: "broadcast", event: "typing", payload: { userId, typing } });
  };

  return { otherTyping, setTyping };
}
