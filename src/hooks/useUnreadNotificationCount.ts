import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export function useUnreadNotificationCount() {
  const { userId } = useAuth();
  return useQuery({ queryKey: ["unread-notification-count", userId], enabled: !!userId, refetchInterval: 30_000, queryFn: async () => { const { count, error } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false); if (error) throw error; return count ?? 0; } });
}
