import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export type SkillDirectoryItem = {
  id: string;
  name: string;
  member_count: number;
};

export function useSkillDirectory(search = "", limit = 60) {
  return useQuery({
    queryKey: ["skill-directory", search, limit],
    staleTime: 60_000,
    queryFn: async (): Promise<SkillDirectoryItem[]> => {
      const { data, error } = await supabase.rpc("get_skill_directory", {
        p_search: search.trim() || null,
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as SkillDirectoryItem[];
    },
  });
}
