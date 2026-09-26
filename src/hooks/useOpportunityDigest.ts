import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export function useOpportunityDigest() {
  const { userId } = useAuth();
  const client = useQueryClient();
  return useQuery({
    queryKey: ["opportunity-digest", userId],
    enabled: !!userId,
    staleTime: 60 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const { error } = await supabase.rpc("refresh_opportunity_notifications");
      // Allow the web release to precede its database migration safely.
      if (error?.code === "PGRST202") return false;
      if (error) throw error;
      await Promise.all([
        client.invalidateQueries({ queryKey: ["notifications", userId] }),
        client.invalidateQueries({ queryKey: ["unread-notification-count", userId] }),
      ]);
      return true;
    },
  });
}
