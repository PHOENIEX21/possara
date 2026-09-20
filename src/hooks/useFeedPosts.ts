import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import type { Post, Profile, UserRole } from "../types/database";

export type PostReactionType = "like" | "spark" | "insightful" | "useful";
export type PostReactionPreview = {
  user_id: string;
  type: PostReactionType;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

const POST_REACTION_TYPES: PostReactionType[] = ["like", "spark", "insightful", "useful"];

function emptyReactionCounts(): Record<PostReactionType, number> {
  return { like: 0, spark: 0, insightful: 0, useful: 0 };
}

export interface SharedPostPreview {
  id: string;
  author_id: string | null;
  content: string;
  media_urls: string[] | null;
  profiles: Pick<Profile, "full_name" | "avatar_url" | "username"> | null;
}

export interface PostWithAuthor extends Post {
  profiles: Pick<Profile, "full_name" | "avatar_url" | "username" | "headline" | "profession"> | null;
  shared_from_post: SharedPostPreview | null;
  spark_count: number;
  viewer_reacted: boolean;
  reaction_count: number;
  reaction_counts: Record<PostReactionType, number>;
  reaction_preview: PostReactionPreview[];
  viewer_reaction: PostReactionType | null;
  author_role: UserRole | null;
  comment_count: number;
  share_count: number;
}
interface UseFeedPostsOptions {
  postType?: "general" | "resource" | "opportunity" | "event";
  categorySlug?: string;
  categorySlugs?: string[];
  noCategoryOnly?: boolean;
  topic?: string;
  authorId?: string;
  limit?: number;
}

export function useFeedPosts(options: UseFeedPostsOptions = {}) {
  const { postType, categorySlug, categorySlugs, noCategoryOnly, topic, authorId, limit = 30 } = options;
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["feed-posts", postType, categorySlug, categorySlugs, noCategoryOnly, topic, authorId, limit, userId],
    queryFn: async (): Promise<PostWithAuthor[]> => {
      let categoryIds: string[] | undefined;
      const slugsToResolve = categorySlugs ?? (categorySlug ? [categorySlug] : undefined);
      if (slugsToResolve?.length) {
        const { data: cats } = await supabase.from("opportunity_categories").select("id").in("slug", slugsToResolve);
        categoryIds = (cats ?? []).map((c) => c.id);
      }
      let query = supabase
        .from("posts")
        .select("*")
        .eq("status", "published")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (postType) query = query.eq("type", postType);
      if (noCategoryOnly) query = query.is("category_id", null);
      else if (categoryIds) query = query.in("category_id", categoryIds);
      if (topic) query = query.eq("topic", topic);
      if (authorId) query = query.eq("author_id", authorId);
      const { data: posts, error } = await query;
      if (error) throw error;
      if (!posts?.length) return [];
      const postIds = posts.map((p) => p.id);
      const profileIds = [...new Set(posts.map((p) => p.author_id).filter((id): id is string => !!id))];
      const { data: feedProfiles } = await supabase.from("profiles").select("id,full_name,avatar_url,username,headline,profession").in("id", profileIds.length ? profileIds : ["00000000-0000-0000-0000-000000000000"]);
      const feedProfileById = new Map((feedProfiles ?? []).map((profile) => [profile.id, profile]));
      const sharedIds = [...new Set(posts.map((p) => p.shared_from_post_id).filter((id): id is string => !!id))];
      const { data: sharedRows } = sharedIds.length ? await supabase.from("posts").select("id,author_id,content,media_urls").in("id", sharedIds) : { data: [] as {id:string;author_id:string|null;content:string;media_urls:string[]|null}[] };
      const sharedAuthorIds = [...new Set((sharedRows ?? []).map((p) => p.author_id).filter((id): id is string => !!id))];
      const { data: sharedProfiles } = sharedAuthorIds.length ? await supabase.from("profiles").select("id,full_name,avatar_url,username").in("id", sharedAuthorIds) : { data: [] as {id:string;full_name:string|null;avatar_url:string|null;username:string|null}[] };
      const sharedProfileById = new Map((sharedProfiles ?? []).map((profile) => [profile.id, profile]));
      const sharedById = new Map((sharedRows ?? []).map((shared) => [shared.id, { ...shared, profiles: shared.author_id ? sharedProfileById.get(shared.author_id) ?? null : null }]));
      const { data: reactions } = await supabase
        .from("reactions")
        .select("post_id,user_id,type,created_at")
        .in("post_id", postIds)
        .in("type", POST_REACTION_TYPES)
        .order("created_at", { ascending: false });
      const authorIds = [...new Set(posts.map((p) => p.author_id).filter((id): id is string => !!id))];
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", authorIds.length ? authorIds : ["00000000-0000-0000-0000-000000000000"]);
      const roleByUser = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      const [{ data: comments }, { data: shares }] = await Promise.all([
        supabase.from("comments").select("post_id").in("post_id", postIds).is("deleted_at", null),
        supabase.from("posts").select("shared_from_post_id").in("shared_from_post_id", postIds).eq("status","published").is("deleted_at",null),
      ]);
      const commentCountByPost = new Map<string, number>();
      (comments ?? []).forEach((c) => { if (c.post_id) commentCountByPost.set(c.post_id, (commentCountByPost.get(c.post_id) ?? 0) + 1); });
      const shareCountByPost = new Map<string, number>();
      (shares ?? []).forEach((share) => { if (share.shared_from_post_id) shareCountByPost.set(share.shared_from_post_id, (shareCountByPost.get(share.shared_from_post_id) ?? 0) + 1); });

      const reactionCountsByPost = new Map<string, Record<PostReactionType, number>>();
      const reactionTotalByPost = new Map<string, number>();
      const viewerReactionByPost = new Map<string, PostReactionType>();
      const previewRefsByPost = new Map<string, { user_id: string; type: PostReactionType }[]>();
      (reactions ?? []).forEach((r) => {
        if (!r.post_id || !POST_REACTION_TYPES.includes(r.type as PostReactionType)) return;
        const type = r.type as PostReactionType;
        const current = reactionCountsByPost.get(r.post_id) ?? emptyReactionCounts();
        current[type] += 1;
        reactionCountsByPost.set(r.post_id, current);
        reactionTotalByPost.set(r.post_id, (reactionTotalByPost.get(r.post_id) ?? 0) + 1);
        if (userId && r.user_id === userId) viewerReactionByPost.set(r.post_id, type);

        if (r.user_id) {
          const preview = previewRefsByPost.get(r.post_id) ?? [];
          if (preview.length < 2 && !preview.some((item) => item.user_id === r.user_id)) {
            preview.push({ user_id: r.user_id, type });
            previewRefsByPost.set(r.post_id, preview);
          }
        }
      });

      const previewUserIds = [...new Set([...previewRefsByPost.values()].flat().map((item) => item.user_id))];
      let previewProfileById = new Map<string, { id: string; full_name: string | null; username: string | null; avatar_url: string | null }>();
      if (previewUserIds.length) {
        const { data: previewProfiles } = await supabase.from("profiles").select("id,full_name,username,avatar_url").in("id", previewUserIds);
        previewProfileById = new Map((previewProfiles ?? []).map((profile) => [profile.id, profile]));
      }

      return posts.map((p) => {
        const counts = reactionCountsByPost.get(p.id) ?? emptyReactionCounts();
        const viewerReaction = viewerReactionByPost.get(p.id) ?? null;
        const reactionPreview: PostReactionPreview[] = (previewRefsByPost.get(p.id) ?? []).map((item) => {
          const profile = previewProfileById.get(item.user_id);
          return {
            user_id: item.user_id,
            type: item.type,
            full_name: profile?.full_name ?? null,
            username: profile?.username ?? null,
            avatar_url: profile?.avatar_url ?? null,
          };
        });
        const sharedFromPost = p.shared_from_post_id ? sharedById.get(p.shared_from_post_id) ?? null : null;
        return {
          ...p,
          profiles: p.author_id ? feedProfileById.get(p.author_id) ?? null : null,
          shared_from_post: sharedFromPost,
          spark_count: counts.spark,
          viewer_reacted: viewerReaction === "spark",
          reaction_count: reactionTotalByPost.get(p.id) ?? 0,
          reaction_counts: counts,
          reaction_preview: reactionPreview,
          viewer_reaction: viewerReaction,
          author_role: p.author_id ? roleByUser.get(p.author_id) ?? null : null,
          comment_count: commentCountByPost.get(p.id) ?? 0,
          share_count: shareCountByPost.get(p.id) ?? 0,
        };
      });
    },
  });
}

export function useCreatePost() {
  const { userId } = useAuth(); const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ content, imageFile, type = "general", categoryId, topic }: { content: string; imageFile: File | null; type?: "general" | "resource" | "opportunity" | "event"; categoryId?: string | null; topic?: string | null; }) => {
      if (!userId) throw new Error("You need to be signed in to post.");
      let mediaUrls: string[] | null = null;
      if (imageFile) {
        if (!imageFile.type.match(/^image\/(jpeg|png|webp)$/)) throw new Error("Use a JPG, PNG, or WebP image.");
        if (imageFile.size > 8 * 1024 * 1024) throw new Error("Image must be 8 MB or smaller.");
        const safe = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${userId}/${Date.now()}-${safe}`;
        const { error: uploadError } = await supabase.storage.from("opportunity-media").upload(path, imageFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from("opportunity-media").getPublicUrl(path);
        mediaUrls = [publicUrlData.publicUrl];
      }
      const { error } = await supabase.from("posts").insert({
        author_id: userId,
        content,
        media_urls: mediaUrls,
        type,
        category_id: categoryId ?? null,
        topic: topic ?? null,
        status: "published",
        visibility: "public",
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["feed-posts"] }); },
  });
}

export function useTogglePostReaction() {
  const { userId } = useAuth(); const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, reaction, currentReaction }: { postId: string; reaction: PostReactionType; currentReaction: PostReactionType | null }) => {
      if (!userId) throw new Error("Sign in to react to posts.");

      const { error: deleteError } = await supabase
        .from("reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId)
        .in("type", POST_REACTION_TYPES);
      if (deleteError) throw deleteError;

      if (currentReaction !== reaction) {
        const { error: insertError } = await supabase.from("reactions").insert({ post_id: postId, user_id: userId, type: reaction });
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["feed-posts"] }); },
  });
}
