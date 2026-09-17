import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export type MessageDirectoryMember = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  headline: string | null;
  online: boolean;
  last_seen_at: string | null;
};

export function useMessageDirectory(search = "") {
  const { userId } = useAuth();
  const normalizedSearch = search.trim().toLowerCase();

  return useQuery({
    queryKey: ["message-directory", userId, normalizedSearch],
    enabled: !!userId,
    refetchInterval: 25_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<MessageDirectoryMember[]> => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc("get_message_directory", {
        search_text: normalizedSearch || null,
        result_limit: normalizedSearch ? 50 : 100,
      });
      if (error) throw error;
      return (data ?? []) as MessageDirectoryMember[];
    },
  });
}

export function useOnlineMemberCount() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["online-member-count", userId],
    enabled: !!userId,
    refetchInterval: 25_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!userId) return 0;
      const { data, error } = await supabase.rpc("get_online_member_count");
      if (error) throw error;
      return Number(data ?? 0);
    },
  });
}
