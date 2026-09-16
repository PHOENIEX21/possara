import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

function normaliseImage(file: File) {
  const lowerName = file.name.toLowerCase();
  const extFromName = lowerName.split(".").pop() ?? "";
  const isJpeg = file.type === "image/jpeg" || file.type === "image/jpg" || ["jpg", "jpeg", "jfif"].includes(extFromName);
  const isPng = file.type === "image/png" || extFromName === "png";
  const isWebp = file.type === "image/webp" || extFromName === "webp";

  if (!isJpeg && !isPng && !isWebp) {
    throw new Error("Use a JPG, JPEG, PNG or WebP profile photo.");
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Profile photo must be 8 MB or smaller.");
  }

  if (isPng) return { ext: "png", contentType: "image/png" };
  if (isWebp) return { ext: "webp", contentType: "image/webp" };
  return { ext: "jpg", contentType: "image/jpeg" };
}

export function useAvatarUpload() {
  const { userId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!userId) throw new Error("Sign in before changing your profile photo.");

      const { ext, contentType } = normaliseImage(file);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error("Your session expired. Sign in again before changing your profile photo.");
      }

      const path = `${userId}/avatar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
        contentType,
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = publicUrlData.publicUrl;
      if (!publicUrl) {
        await supabase.storage.from("avatars").remove([path]);
        throw new Error("The photo uploaded, but POSSARA could not create its public URL.");
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId)
        .select("avatar_url")
        .single();

      if (profileError) {
        await supabase.storage.from("avatars").remove([path]);
        throw new Error(`Profile photo could not be saved: ${profileError.message}`);
      }

      if (!data?.avatar_url) {
        throw new Error("The photo uploaded, but your profile did not update. Please try again.");
      }

      return data.avatar_url as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["own-profile"] });
      qc.invalidateQueries({ queryKey: ["profile-by-username"] });
      qc.invalidateQueries({ queryKey: ["active-stories"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}
