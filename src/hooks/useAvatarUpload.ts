import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export function useAvatarUpload() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      if (!userId) throw new Error("Sign in before changing your profile photo.");
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Use a JPG, PNG or WebP image.");
      if (file.size > 8 * 1024 * 1024) throw new Error("Profile photo must be 8 MB or smaller.");

      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = publicUrlData.publicUrl;
      const { data, error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId)
        .select("avatar_url")
        .single();
      if (profileError) {
        await supabase.storage.from("avatars").remove([path]);
        throw new Error(`Profile update failed: ${profileError.message}`);
      }
      return data.avatar_url as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["own-profile"] });
      qc.invalidateQueries({ queryKey: ["profile-by-username"] });
      qc.invalidateQueries({ queryKey: ["active-stories"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
