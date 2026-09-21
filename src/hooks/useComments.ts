import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import type { Comment, Profile } from "../types/database";

export type CommentReactionType = "like" | "spark" | "insightful" | "useful";
export type CommentOrganization = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  verified: boolean | null;
  verification_status: string | null;
};

export interface CommentWithAuthor extends Comment {
  profiles: Pick<Profile, "full_name" | "avatar_url" | "username"> | null;
  organizations: CommentOrganization | null;
  reaction_count: number;
  reaction_counts: Record<CommentReactionType, number>;
  viewer_reaction: CommentReactionType | null;
}

const COMMENT_REACTION_TYPES: CommentReactionType[] = ["like", "spark", "insightful", "useful"];

function emptyCounts(): Record<CommentReactionType, number> {
  return { like: 0, spark: 0, insightful: 0, useful: 0 };
}

export function useComments(postId: string, enabled: boolean, actingOrganizationId: string | null = null) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["comments", postId, userId, actingOrganizationId],
    enabled,
    queryFn: async (): Promise<CommentWithAuthor[]> => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, profiles(full_name, avatar_url, username), organizations(id,name,slug,logo_url,verified,verification_status)")
        .eq("post_id", postId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const rows = (data ?? []) as Array<Comment & {
        profiles: Pick<Profile, "full_name" | "avatar_url" | "username"> | null;
        organizations: CommentOrganization | null;
      }>;
      if (!rows.length) return [];

      const ids = rows.map((row) => row.id);
      const { data: reactions, error: reactionError } = await supabase
        .from("comment_reactions")
        .select("comment_id,user_id,organization_id,type")
        .in("comment_id", ids);
      if (reactionError) throw reactionError;

      const counts = new Map<string, Record<CommentReactionType, number>>();
      const viewer = new Map<string, CommentReactionType>();
      for (const reaction of reactions ?? []) {
        if (!COMMENT_REACTION_TYPES.includes(reaction.type as CommentReactionType)) continue;
        const type = reaction.type as CommentReactionType;
        const currentCounts = counts.get(reaction.comment_id) ?? emptyCounts();
        currentCounts[type] += 1;
        counts.set(reaction.comment_id, currentCounts);

        const isViewerActor = actingOrganizationId
          ? reaction.organization_id === actingOrganizationId
          : !reaction.organization_id && !!userId && reaction.user_id === userId;
        if (isViewerActor) viewer.set(reaction.comment_id, type);
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

export function useCreateComment(postId: string, actingOrganizationId: string | null = null) {
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
        organization_id: actingOrganizationId,
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
        .update({ content: clean, edited_at: new Date().toISOString() })
        .eq("id", commentId)
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

export function useToggleCommentReaction(postId: string, actingOrganizationId: string | null = null) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, reaction, currentReaction }: { commentId: string; reaction: CommentReactionType; currentReaction: CommentReactionType | null }) => {
      if (!userId) throw new Error("Sign in to react.");

      let deleteQuery = supabase.from("comment_reactions").delete().eq("comment_id", commentId);
      deleteQuery = actingOrganizationId
        ? deleteQuery.eq("organization_id", actingOrganizationId)
        : deleteQuery.eq("user_id", userId).is("organization_id", null);
      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;

      if (currentReaction !== reaction) {
        const { error } = await supabase.from("comment_reactions").insert({
          comment_id: commentId,
          user_id: userId,
          organization_id: actingOrganizationId,
          type: reaction,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", postId] }),
  });
}

export type CommentReactionPerson = {
  user_id: string;
  organization_id: string | null;
  type: CommentReactionType;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  organization: CommentOrganization | null;
};

export function useCommentReactionPeople(commentId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["comment-reaction-people", commentId],
    enabled: enabled && !!commentId,
    queryFn: async (): Promise<CommentReactionPerson[]> => {
      if (!commentId) return [];
      const { data: rows, error } = await supabase
        .from("comment_reactions")
        .select("user_id,organization_id,type,created_at")
        .eq("comment_id", commentId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      const userIds = [...new Set((rows ?? []).filter((row) => !row.organization_id).map((row) => row.user_id))];
      const orgIds = [...new Set((rows ?? []).map((row) => row.organization_id).filter((id): id is string => !!id))];

      const [{ data: profiles }, { data: organizations }] = await Promise.all([
        userIds.length
          ? supabase.from("profiles").select("id,full_name,username,avatar_url").in("id", userIds)
          : Promise.resolve({ data: [] as {id:string;full_name:string|null;username:string|null;avatar_url:string|null}[] }),
        orgIds.length
          ? supabase.from("organizations").select("id,name,slug,logo_url,verified,verification_status").in("id", orgIds)
          : Promise.resolve({ data: [] as CommentOrganization[] }),
      ]);

      const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      const organizationById = new Map((organizations ?? []).map((organization) => [organization.id, organization]));

      return (rows ?? []).map((row) => {
        const profile = row.organization_id ? null : profileById.get(row.user_id);
        return {
          user_id: row.user_id,
          organization_id: row.organization_id ?? null,
          type: row.type as CommentReactionType,
          full_name: profile?.full_name ?? null,
          username: profile?.username ?? null,
          avatar_url: profile?.avatar_url ?? null,
          organization: row.organization_id ? organizationById.get(row.organization_id) ?? null : null,
        };
      });
    },
  });
}
