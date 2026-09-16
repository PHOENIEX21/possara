import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import type { Post, Profile, UserRole } from "../types/database";

export interface PostWithAuthor extends Post {
  profiles: Pick<Profile, "full_name" | "avatar_url" | "username" | "headline" | "profession"> | null;
  spark_count: number;
  viewer_reacted: boolean;
  author_role: UserRole | null;
  comment_count: number;
}
interface UseFeedPostsOptions {
  postType?: "general" | "resource" | "opportunity" | "event";
  categorySlug?: string;
  categorySlugs?: string[];
  noCategoryOnly?: boolean;
  topic?: string;
}

export function useFeedPosts(options: UseFeedPostsOptions = {}) {
  const { postType, categorySlug, categorySlugs, noCategoryOnly, topic } = options;
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["feed-posts", postType, categorySlug, categorySlugs, noCategoryOnly, topic, userId],
    queryFn: async (): Promise<PostWithAuthor[]> => {
      let categoryIds: string[] | undefined;
      const slugsToResolve = categorySlugs ?? (categorySlug ? [categorySlug] : undefined);
      if (slugsToResolve?.length) {
        const { data: cats } = await supabase.from("opportunity_categories").select("id").in("slug", slugsToResolve);
        categoryIds = (cats ?? []).map((c) => c.id);
      }
      let query = supabase
        .from("posts")
        .select("*, profiles(full_name, avatar_url, username, headline, profession)")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(30);
      if (postType) query = query.eq("type", postType);
      if (noCategoryOnly) query = query.is("category_id", null);
      else if (categoryIds) query = query.in("category_id", categoryIds);
      if (topic) query = query.eq("topic", topic);
      const { data: posts, error } = await query;
      if (error) throw error;
      if (!posts?.length) return [];
      const postIds = posts.map((p) => p.id);
      const { data: reactions } = await supabase.from("reactions").select("post_id, user_id").in("post_id", postIds).eq("type", "spark");
      const authorIds = [...new Set(posts.map((p) => p.author_id).filter((id): id is string => !!id))];
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", authorIds.length ? authorIds : ["00000000-0000-0000-0000-000000000000"]);
      const roleByUser = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      const { data: comments } = await supabase.from("comments").select("post_id").in("post_id", postIds).is("deleted_at", null);
      const commentCountByPost = new Map<string, number>();
      (comments ?? []).forEach((c) => { if (c.post_id) commentCountByPost.set(c.post_id, (commentCountByPost.get(c.post_id) ?? 0) + 1); });
      const countByPost = new Map<string, number>();
      const viewerReactedSet = new Set<string>();
      (reactions ?? []).forEach((r) => { if (!r.post_id) return; countByPost.set(r.post_id, (countByPost.get(r.post_id) ?? 0) + 1); if (userId && r.user_id === userId) viewerReactedSet.add(r.post_id); });
      return posts.map((p) => ({ ...p, spark_count: countByPost.get(p.id) ?? 0, viewer_reacted: viewerReactedSet.has(p.id), author_role: p.author_id ? roleByUser.get(p.author_id) ?? null : null, comment_count: commentCountByPost.get(p.id) ?? 0 }));
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
      const { error } = await supabase.from("posts").insert({ author_id: userId, content, media_urls: mediaUrls, type, category_id: categoryId ?? null, topic: topic ?? null });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["feed-posts"] }); },
  });
}

export function useTogglePostReaction() {
  const { userId } = useAuth(); const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, currentlyReacted }: { postId: string; currentlyReacted: boolean }) => {
      if (!userId) throw new Error("Sign in to react to posts.");
      if (currentlyReacted) {
        const { error } = await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", userId).eq("type", "spark");
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reactions").insert({ post_id: postId, user_id: userId, type: "spark" });
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["feed-posts"] }); },
  });
}
