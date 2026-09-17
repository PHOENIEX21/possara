import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import type { Comment, Profile } from "../types/database";

export interface CommentWithAuthor extends Comment {
  profiles: Pick<Profile, "full_name" | "avatar_url" | "username"> | null;
  like_count: number;
  viewer_liked: boolean;
}

export function useComments(postId: string, enabled: boolean) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["comments", postId, userId],
    enabled,
    queryFn: async (): Promise<CommentWithAuthor[]> => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, profiles(full_name, avatar_url, username)")
        .eq("post_id", postId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as Array<Comment & { profiles: CommentWithAuthor["profiles"] }>;
      const ids = rows.map((row) => row.id);
      if (!ids.length) return [];
      const { data: likes, error: likesError } = await supabase
        .from("comment_likes")
        .select("comment_id,user_id")
        .in("comment_id", ids);
      if (likesError) throw likesError;
      const countByComment = new Map<string, number>();
      const likedByViewer = new Set<string>();
      (likes ?? []).forEach((like) => {
        countByComment.set(like.comment_id, (countByComment.get(like.comment_id) ?? 0) + 1);
        if (userId && like.user_id === userId) likedByViewer.add(like.comment_id);
      });
      return rows.map((row) => ({
        ...row,
        like_count: countByComment.get(row.id) ?? 0,
        viewer_liked: likedByViewer.has(row.id),
      }));
    },
  });
}

export function useCreateComment(postId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: string | { content: string; parentId?: string | null }) => {
      if (!userId) throw new Error("Sign in to comment.");
      const payload = typeof input === "string" ? { content: input, parentId: null } : input;
      const content = payload.content.trim();
      if (!content) throw new Error("Comment cannot be empty.");
      if (content.length > 1200) throw new Error("Comments can be up to 1200 characters.");
      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        author_id: userId,
        parent_id: payload.parentId ?? null,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}

export function useToggleCommentLike(postId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, liked }: { commentId: string; liked: boolean }) => {
      if (!userId) throw new Error("Sign in to like comments.");
      if (liked) {
        const { error } = await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", postId] }),
  });
}

export function useEditComment(postId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      if (!userId) throw new Error("Sign in to edit comments.");
      const clean = content.trim();
      if (!clean) throw new Error("Comment cannot be empty.");
      if (clean.length > 1200) throw new Error("Comments can be up to 1200 characters.");
      const { error } = await supabase
        .from("comments")
        .update({ content: clean, edited_at: new Date().toISOString() })
        .eq("id", commentId)
        .eq("author_id", userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", postId] }),
  });
}

export function useDeleteComment(postId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      if (!userId) throw new Error("Sign in to manage comments.");
      const { error } = await supabase
        .from("comments")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", commentId)
        .eq("author_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}
