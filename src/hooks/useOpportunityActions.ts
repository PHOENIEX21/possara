import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export function useOpportunityViewerState(opportunityId: string) {
  const { userId } = useAuth();
  return useQuery({ queryKey: ["opportunity-viewer-state", opportunityId, userId], enabled: !!userId, queryFn: async () => { const [{ data: reaction }, { data: save }] = await Promise.all([supabase.from("reactions").select("id").eq("opportunity_id", opportunityId).eq("user_id", userId as string).eq("type", "useful").maybeSingle(), supabase.from("saves").select("id").eq("opportunity_id", opportunityId).eq("user_id", userId as string).maybeSingle()]); return { reacted: !!reaction, saved: !!save }; } });
}
export function useToggleOpportunityUseful(opportunityId: string) {
  const { userId } = useAuth(); const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (currentlyReacted: boolean) => { if (!userId) throw new Error("Sign in to mark an opportunity as useful."); if (currentlyReacted) { const { error } = await supabase.from("reactions").delete().eq("opportunity_id", opportunityId).eq("user_id", userId).eq("type", "useful"); if (error) throw error; } else { const { error } = await supabase.from("reactions").insert({ opportunity_id: opportunityId, user_id: userId, type: "useful" }); if (error) throw error; } }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["opportunity-viewer-state", opportunityId] }); } });
}
export function useToggleOpportunitySave(opportunityId: string) {
  const { userId } = useAuth(); const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (currentlySaved: boolean) => { if (!userId) throw new Error("Sign in to save an opportunity."); if (currentlySaved) { const { error } = await supabase.from("saves").delete().eq("opportunity_id", opportunityId).eq("user_id", userId); if (error) throw error; } else { const { error } = await supabase.from("saves").insert({ opportunity_id: opportunityId, user_id: userId }); if (error) throw error; } }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["opportunity-viewer-state", opportunityId] }); queryClient.invalidateQueries({ queryKey: ["saved-opportunities"] }); } });
}
