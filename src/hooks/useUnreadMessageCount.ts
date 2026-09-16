import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export function useUnreadMessageCount() {
  const { userId } = useAuth();
  return useQuery({ queryKey: ["unread-message-count", userId], enabled: !!userId, refetchInterval: 15_000, queryFn: async () => { const { count, error } = await supabase.from("messages").select("id", { count: "exact", head: true }).eq("recipient_id", userId as string).eq("read", false); if (error) throw error; return count ?? 0; } });
}
