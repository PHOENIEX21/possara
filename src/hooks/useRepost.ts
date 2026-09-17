import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export function useRepost() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!userId) throw new Error("Sign in to share a post to your profile.");

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
        .select("id,content,media_urls,type,category_id,topic,status,deleted_at,profiles(full_name,username)")
        .eq("id", postId)
        .eq("status", "published")
        .is("deleted_at", null)
        .single();
      if (originalError || !original) throw new Error("This post is no longer available to share.");

      const profile = Array.isArray((original as any).profiles) ? (original as any).profiles[0] : (original as any).profiles;
      const originalAuthor = profile?.full_name || (profile?.username ? `@${profile.username}` : "a POSSARA member");
      const repostContent = `Shared from ${originalAuthor}\n\n${original.content}`.slice(0, 4000);

      const { error } = await supabase.from("posts").insert({
        author_id: userId,
        content: repostContent,
        media_urls: original.media_urls,
        type: original.type ?? "general",
        category_id: original.category_id,
        topic: original.topic,
        status: "published",
        visibility: "public",
        shared_from_post_id: original.id,
      });
      if (error) throw error;
      return { alreadyShared: false };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed-posts"] }),
  });
}
