import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import type { OpportunityWithOrg } from "./useOpportunities";

export function useMatchedOpportunities() {
  const { userId } = useAuth();
  const nowIso = new Date().toISOString();
  return useQuery({
    queryKey: ["matched-opportunities", userId],
    queryFn: async (): Promise<{ matched: boolean; opportunities: OpportunityWithOrg[] }> => {
      let goalCategories: string[] = [];
      if (userId) {
        const { data: profile } = await supabase.from("profiles").select("goal_categories").eq("id", userId).single();
        goalCategories = profile?.goal_categories ?? [];
      }
      if (goalCategories.length === 0) {
        const { data, error } = await supabase.from("opportunities").select("*, organizations(name, verified, is_sponsored), opportunity_categories(name, icon, color)").eq("status", "active").or(`deadline.is.null,deadline.gte.${nowIso}`).order("created_at", { ascending: false }).limit(10);
        if (error) throw error;
        return { matched: false, opportunities: (data as OpportunityWithOrg[]) ?? [] };
      }
      const { data: categories } = await supabase.from("opportunity_categories").select("id").in("slug", goalCategories);
      const categoryIds = (categories ?? []).map((c) => c.id);
      if (!categoryIds.length) return { matched: true, opportunities: [] };
      const { data, error } = await supabase.from("opportunities").select("*, organizations(name, verified, is_sponsored), opportunity_categories(name, icon, color)").eq("status", "active").in("category_id", categoryIds).or(`deadline.is.null,deadline.gte.${nowIso}`).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return { matched: true, opportunities: (data as OpportunityWithOrg[]) ?? [] };
    },
  });
}
