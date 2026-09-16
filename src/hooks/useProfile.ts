import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import type { Profile } from "../types/database";

export function useProfileByUsername(username: string | undefined) {
  return useQuery({ queryKey: ["profile-by-username", username], enabled: !!username, queryFn: async (): Promise<Profile | null> => { const { data, error } = await supabase.from("profiles").select("*").eq("username", username as string).single(); if (error) throw error; return data; } });
}
export function useOwnProfile() {
  const { userId } = useAuth();
  return useQuery({ queryKey: ["own-profile", userId], enabled: !!userId, queryFn: async (): Promise<Profile | null> => { const { data, error } = await supabase.from("profiles").select("*").eq("id", userId as string).single(); if (error) throw error; return data; } });
}
export function useUpdateOwnProfile() {
  const { userId } = useAuth(); const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (updates: Partial<Profile>) => { if (!userId) throw new Error("Sign in to edit your profile."); const { error } = await supabase.from("profiles").update(updates).eq("id", userId); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["own-profile"] }); queryClient.invalidateQueries({ queryKey: ["profile-by-username"] }); } });
}
