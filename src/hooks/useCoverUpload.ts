import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

function normaliseCover(file: File) {
  const lowerName = file.name.toLowerCase();
  const extFromName = lowerName.split(".").pop() ?? "";
  const isJpeg = file.type === "image/jpeg" || file.type === "image/jpg" || ["jpg", "jpeg", "jfif"].includes(extFromName);
  const isPng = file.type === "image/png" || extFromName === "png";
  const isWebp = file.type === "image/webp" || extFromName === "webp";

  if (!isJpeg && !isPng && !isWebp) {
    throw new Error("Use a JPG, JPEG, PNG or WebP cover photo.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Cover photo must be 10 MB or smaller.");
  }

  if (isPng) return { ext: "png", contentType: "image/png" };
  if (isWebp) return { ext: "webp", contentType: "image/webp" };
  return { ext: "jpg", contentType: "image/jpeg" };
}

export function useCoverUpload() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!userId) throw new Error("Sign in before changing your cover photo.");

      const { ext, contentType } = normaliseCover(file);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error("Your session expired. Sign in again before changing your cover photo.");
      }

      const path = `${userId}/cover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
        contentType,
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) {
        throw new Error(`Cover upload failed: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = publicUrlData.publicUrl;
      if (!publicUrl) {
        await supabase.storage.from("avatars").remove([path]);
        throw new Error("The cover uploaded, but POSSARA could not create its public URL.");
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .update({ cover_url: publicUrl })
        .eq("id", userId)
        .select("cover_url")
        .single();

      if (profileError) {
        await supabase.storage.from("avatars").remove([path]);
        throw new Error(`Cover photo could not be saved: ${profileError.message}`);
      }
      if (!data?.cover_url) {
        throw new Error("The cover uploaded, but your profile did not update. Please try again.");
      }

      return data.cover_url as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["own-profile"] });
      queryClient.invalidateQueries({ queryKey: ["profile-by-username"] });
      queryClient.invalidateQueries({ queryKey: ["profile-by-id"] });
    },
  });
}
