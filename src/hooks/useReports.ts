import { useMutation } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export function useSubmitReport() {
  const { userId } = useAuth();
  return useMutation({ mutationFn: async (input: { postId?: string; opportunityId?: string; reason: string }) => { if (!userId) throw new Error("Sign in to report something."); const { error } = await supabase.from("reports").insert({ reporter_id: userId, post_id: input.postId ?? null, opportunity_id: input.opportunityId ?? null, reason: input.reason }); if (error) throw error; } });
}
