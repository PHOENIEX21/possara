import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { MemberStats as MemberStatsRow } from "../types/database";

export function useMemberStats() {
  return useQuery({ queryKey: ["member-stats"], queryFn: async (): Promise<MemberStatsRow> => { const { data, error } = await supabase.from("member_stats").select("*").single(); if (error) throw error; return data as MemberStatsRow; }, refetchInterval: 60_000 });
}
