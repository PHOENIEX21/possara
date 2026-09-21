import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { MemberStats as MemberStatsRow } from "../types/database";

export function useMemberStats() {
  return useQuery({ queryKey: ["member-stats"], queryFn: async (): Promise<MemberStatsRow> => { const { data, error } = await supabase.rpc("get_public_member_stats"); if (error) throw error; const row=Array.isArray(data)?data[0]:data; return row as MemberStatsRow; }, refetchInterval: 60_000 });
}
