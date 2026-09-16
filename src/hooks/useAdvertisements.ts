import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export function useActiveAdvertisements() {
  return useQuery({ queryKey: ["advertisements", "active"], queryFn: async () => { const { data, error } = await supabase.from("advertisements").select("*").eq("status", "active").order("created_at", { ascending: false }); if (error) throw error; return data ?? []; } });
}
export function useSubmitAdvertisement() {
  const { userId } = useAuth(); const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (input: { organizationName: string; title: string; description: string; link: string; imageFile: File | null; }) => { if (!userId) throw new Error("Sign in to submit an advertisement."); let imageUrl: string | null = null; if (input.imageFile) { if (!input.imageFile.type.match(/^image\/(jpeg|png|webp)$/)) throw new Error("Use a JPG, PNG, or WebP image."); if (input.imageFile.size > 8 * 1024 * 1024) throw new Error("Image must be 8 MB or smaller."); const safe = input.imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "-"); const path = `ads/${userId}/${Date.now()}-${safe}`; const { error: uploadError } = await supabase.storage.from("opportunity-media").upload(path, input.imageFile); if (uploadError) throw uploadError; const { data: publicUrlData } = supabase.storage.from("opportunity-media").getPublicUrl(path); imageUrl = publicUrlData.publicUrl; } const { error } = await supabase.from("advertisements").insert({ submitted_by: userId, organization_name: input.organizationName, title: input.title, description: input.description, link: input.link, image_url: imageUrl, status: "pending" }); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["advertisements"] }); } });
}
