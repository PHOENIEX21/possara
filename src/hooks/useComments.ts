import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import type { Comment, Profile } from "../types/database";

export interface CommentWithAuthor extends Comment {
  profiles: Pick<Profile, "full_name" | "avatar_url" | "username"> | null;
}

export function useComments(postId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["comments", postId],
    enabled,
    queryFn: async (): Promise<CommentWithAuthor[]> => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, profiles(full_name, avatar_url, username)")
        .eq("post_id", postId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as CommentWithAuthor[]) ?? [];
    },
  });
}

export function useCreateComment(postId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      if (!userId) throw new Error("Sign in to comment.");
      const { error } = await supabase.from("comments").insert({ post_id: postId, author_id: userId, content });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}
