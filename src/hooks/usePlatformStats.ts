import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { PlatformStats } from "../types/database";

export function usePlatformStats() {
  return useQuery({ queryKey: ["platform-stats"], queryFn: async (): Promise<PlatformStats> => { const { data, error } = await supabase.from("platform_stats").select("*").single(); if (error) throw error; return data; }, refetchInterval: 60_000 });
}
