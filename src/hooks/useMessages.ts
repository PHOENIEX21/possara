import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import type { Profile } from "../types/database";

export interface ConversationPreview { otherUserId: string; otherUser: Pick<Profile, "full_name" | "avatar_url" | "username"> | null; lastMessage: string; lastMessageAt: string; unread: boolean; }

export function useConversations() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["conversations", userId], enabled: !!userId,
    queryFn: async (): Promise<ConversationPreview[]> => {
      const { data, error } = await supabase.from("messages").select("sender_id, recipient_id, content, read, created_at").or(`sender_id.eq.${userId},recipient_id.eq.${userId}`).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      const byOther = new Map<string, { content: string; created_at: string; unread: boolean }>();
      (data ?? []).forEach((m) => { const otherId = m.sender_id === userId ? m.recipient_id : m.sender_id; if (!byOther.has(otherId)) byOther.set(otherId, { content: m.content, created_at: m.created_at, unread: m.recipient_id === userId && !m.read }); });
      const otherIds = [...byOther.keys()]; if (!otherIds.length) return [];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url, username").in("id", otherIds);
      const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
      return otherIds.map((id) => ({ otherUserId: id, otherUser: profileById.get(id) ?? null, lastMessage: byOther.get(id)!.content, lastMessageAt: byOther.get(id)!.created_at, unread: byOther.get(id)!.unread })).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    },
  });
}

export function useThread(otherUserId: string | undefined) {
  const { userId } = useAuth();
  return useQuery({ queryKey: ["message-thread", userId, otherUserId], enabled: !!userId && !!otherUserId, refetchInterval: 5_000, queryFn: async () => { const { data, error } = await supabase.from("messages").select("*").or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`).order("created_at", { ascending: true }).limit(200); if (error) throw error; return data ?? []; } });
}

export function useSendMessage(otherUserId: string) {
  const { userId } = useAuth(); const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (content: string) => { if (!userId) throw new Error("Sign in to send messages."); if (content.length > 4000) throw new Error("Messages can be up to 4000 characters."); const { error } = await supabase.from("messages").insert({ sender_id: userId, recipient_id: otherUserId, content }); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["message-thread", userId, otherUserId] }); queryClient.invalidateQueries({ queryKey: ["conversations"] }); } });
}

export function useMarkThreadRead(otherUserId: string) {
  const { userId } = useAuth(); const queryClient = useQueryClient();
  return useMutation({ mutationFn: async () => { if (!userId) return; const { error } = await supabase.from("messages").update({ read: true }).eq("recipient_id", userId).eq("sender_id", otherUserId).eq("read", false); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["conversations"] }); } });
}
