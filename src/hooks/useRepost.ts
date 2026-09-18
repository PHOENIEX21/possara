import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export function useRepost() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!userId) throw new Error("Sign in to pass a post on to your profile.");

      const { data: existing, error: existingError } = await supabase
        .from("posts")
        .select("id")
        .eq("author_id", userId)
        .eq("shared_from_post_id", postId)
        .eq("status", "published")
        .is("deleted_at", null)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) return { alreadyShared: true };

      const { data: original, error: originalError } = await supabase
        .from("posts")
        .select("id,type,category_id,topic,status,deleted_at,shared_from_post_id")
        .eq("id", postId)
        .eq("status", "published")
        .is("deleted_at", null)
        .single();
      if (originalError || !original) throw new Error("This post is no longer available to pass on.");

      const sourcePostId = original.shared_from_post_id ?? original.id;

      const { error } = await supabase.from("posts").insert({
        author_id: userId,
        content: "",
        media_urls: null,
        type: original.type ?? "general",
        category_id: original.category_id,
        topic: original.topic,
        status: "published",
        visibility: "public",
        shared_from_post_id: sourcePostId,
      });
      if (error) throw error;
      return { alreadyShared: false };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["post-detail"] });
    },
  });
}
