import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import type { Comment, Profile } from "../types/database";

export type CommentReactionType = "like" | "spark" | "insightful" | "useful";

export interface CommentWithAuthor extends Comment {
  profiles: Pick<Profile, "full_name" | "avatar_url" | "username"> | null;
  reaction_count: number;
  reaction_counts: Record<CommentReactionType, number>;
  viewer_reaction: CommentReactionType | null;
}

const COMMENT_REACTION_TYPES: CommentReactionType[] = ["like", "spark", "insightful", "useful"];

function emptyCounts(): Record<CommentReactionType, number> {
  return { like: 0, spark: 0, insightful: 0, useful: 0 };
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

      const rows = (data ?? []) as Array<Comment & { profiles: Pick<Profile, "full_name" | "avatar_url" | "username"> | null }>;
      if (!rows.length) return [];

      const ids = rows.map((row) => row.id);
      const { data: reactions, error: reactionError } = await supabase
        .from("comment_reactions")
        .select("comment_id,user_id,type")
        .in("comment_id", ids);
      if (reactionError) throw reactionError;

      const counts = new Map<string, Record<CommentReactionType, number>>();
      const viewer = new Map<string, CommentReactionType>();
      for (const reaction of reactions ?? []) {
        if (!COMMENT_REACTION_TYPES.includes(reaction.type as CommentReactionType)) continue;
        const type = reaction.type as CommentReactionType;
        const current = counts.get(reaction.comment_id) ?? emptyCounts();
        current[type] += 1;
        counts.set(reaction.comment_id, current);
        if (userId && reaction.user_id === userId) viewer.set(reaction.comment_id, type);
      }

      return rows.map((row) => {
        const reactionCounts = counts.get(row.id) ?? emptyCounts();
        return {
          ...row,
          reaction_count: Object.values(reactionCounts).reduce((sum, value) => sum + value, 0),
          reaction_counts: reactionCounts,
          viewer_reaction: viewer.get(row.id) ?? null,
        };
      });
    },
  });
}

export function useCreateComment(postId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: string | { content: string; parentId?: string | null }) => {
      if (!userId) throw new Error("Sign in to comment.");
      const content = typeof input === "string" ? input : input.content;
      const parentId = typeof input === "string" ? null : input.parentId ?? null;
      const clean = content.trim();
      if (!clean) throw new Error("Write something first.");
      if (clean.length > 4000) throw new Error("Comments can be up to 4,000 characters.");
      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        author_id: userId,
        parent_id: parentId,
        content: clean,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}

export function useEditComment(postId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      if (!userId) throw new Error("Sign in first.");
      const clean = content.trim();
      if (!clean) throw new Error("A comment cannot be empty.");
      const { data, error } = await supabase
        .from("comments")
        .update({ content: clean })
        .eq("id", commentId)
        .eq("author_id", userId)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("That comment could not be edited.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", postId] }),
  });
}

export function useDeleteComment(postId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      if (!userId) throw new Error("Sign in first.");
      const { data, error } = await supabase
        .from("comments")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", commentId)
        .eq("author_id", userId)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("That comment could not be deleted.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}

export function useToggleCommentReaction(postId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, reaction, currentReaction }: { commentId: string; reaction: CommentReactionType; currentReaction: CommentReactionType | null }) => {
      if (!userId) throw new Error("Sign in to react.");
      if (currentReaction === reaction) {
        const { error } = await supabase.from("comment_reactions").delete().eq("comment_id", commentId).eq("user_id", userId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("comment_reactions").upsert({
        comment_id: commentId,
        user_id: userId,
        type: reaction,
      }, { onConflict: "comment_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", postId] }),
  });
}

export type CommentReactionPerson = {
  user_id: string;
  type: CommentReactionType;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export function useCommentReactionPeople(commentId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["comment-reaction-people", commentId],
    enabled: enabled && !!commentId,
    queryFn: async (): Promise<CommentReactionPerson[]> => {
      if (!commentId) return [];
      const { data: rows, error } = await supabase
        .from("comment_reactions")
        .select("user_id,type,created_at")
        .eq("comment_id", commentId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const ids = [...new Set((rows ?? []).map((row) => row.user_id))];
      if (!ids.length) return [];
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id,full_name,username,avatar_url")
        .in("id", ids);
      if (profileError) throw profileError;
      const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      return (rows ?? []).map((row) => {
        const profile = profileById.get(row.user_id);
        return {
          user_id: row.user_id,
          type: row.type as CommentReactionType,
          full_name: profile?.full_name ?? null,
          username: profile?.username ?? null,
          avatar_url: profile?.avatar_url ?? null,
        };
      });
    },
  });
}
