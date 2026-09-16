import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import type { OpportunityWithOrg } from "./useOpportunities";

export function useSavedOpportunities() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["saved-opportunities", userId], enabled: !!userId,
    queryFn: async (): Promise<OpportunityWithOrg[]> => {
      const { data: saves, error: savesError } = await supabase.from("saves").select("opportunity_id").eq("user_id", userId as string).not("opportunity_id", "is", null);
      if (savesError) throw savesError;
      const opportunityIds = (saves ?? []).map((s) => s.opportunity_id).filter((id): id is string => !!id);
      if (!opportunityIds.length) return [];
      const { data, error } = await supabase.from("opportunities").select("*, organizations(name, verified, is_sponsored), opportunity_categories(name, icon, color)").in("id", opportunityIds).order("created_at", { ascending: false });
      if (error) throw error;
      return (data as OpportunityWithOrg[]) ?? [];
    },
  });
}
