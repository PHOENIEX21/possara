import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import { useActiveOrganizationIdentity } from "./useActiveOrganizationIdentity";
import type { Post, Profile, UserRole } from "../types/database";

export type PostReactionType = "like" | "spark" | "insightful" | "useful";
export type PostReactionPreview = {
  user_id: string;
  organization_id: string | null;
  type: PostReactionType;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  organization_name: string | null;
  organization_slug: string | null;
  organization_logo_url: string | null;
  organization_verified: boolean;
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
  organizations: { id: string; name: string; slug: string; logo_url: string | null; verified: boolean | null; verification_status: string | null } | null;
  viewer_is_organization_member: boolean;
  viewer_can_manage_organization: boolean;
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
  postId?: string;
  postType?: "general" | "resource" | "opportunity" | "event";
  categorySlug?: string;
  categorySlugs?: string[];
  noCategoryOnly?: boolean;
  topic?: string;
  topics?: string[];
  authorId?: string;
  organizationId?: string;
  enabled?: boolean;
  limit?: number;
}

export function useFeedPosts(options: UseFeedPostsOptions = {}) {
  const { postId, postType, categorySlug, categorySlugs, noCategoryOnly, topic, topics, authorId, organizationId, enabled = true, limit = 30 } = options;
  const { userId } = useAuth();
  const activeOrganization = useActiveOrganizationIdentity();
  const actingOrganizationId = activeOrganization?.id ?? null;
  return useQuery({
    queryKey: ["feed-posts", postId, postType, categorySlug, categorySlugs, noCategoryOnly, topic, topics, authorId, organizationId, limit, userId, actingOrganizationId],
    enabled,
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
        .or("classification_status.is.null,classification_status.eq.accepted")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (postId) query = query.eq("id", postId);
      if (postType) query = query.eq("type", postType);
      if (noCategoryOnly) query = query.is("category_id", null);
      else if (categoryIds) query = query.in("category_id", categoryIds);
      if (topic) query = query.eq("topic", topic);
      else if (topics?.length) query = query.in("topic", topics);
      if (authorId) query = query.eq("author_id", authorId);
      if (organizationId) query = query.eq("organization_id", organizationId);
      const { data: posts, error } = await query;
      if (error) throw error;
      if (!posts?.length) return [];
      const postIds = posts.map((p) => p.id);
      const profileIds = [...new Set(posts.map((p) => p.author_id).filter((id): id is string => !!id))];
      const { data: feedProfiles } = await supabase.from("profiles").select("id,full_name,avatar_url,username,headline,profession").in("id", profileIds.length ? profileIds : ["00000000-0000-0000-0000-000000000000"]);
      const feedProfileById = new Map((feedProfiles ?? []).map((profile) => [profile.id, profile]));

      const organizationIds = [...new Set(posts.map((p) => p.organization_id).filter((id): id is string => !!id))];
      const { data: feedOrganizations } = organizationIds.length
        ? await supabase.from("organizations").select("id,name,slug,logo_url,verified,verification_status").in("id", organizationIds)
        : { data: [] as {id:string;name:string;slug:string;logo_url:string|null;verified:boolean|null;verification_status:string|null}[] };
      const organizationById = new Map((feedOrganizations ?? []).map((organization) => [organization.id, organization]));
      const organizationMemberIds = new Set<string>();
      const organizationManagerIds = new Set<string>();
      if (userId && organizationIds.length) {
        const { data: memberships } = await supabase
          .from("organization_members")
          .select("organization_id,role")
          .eq("user_id", userId)
          .in("organization_id", organizationIds);
        for (const membership of memberships ?? []) {
          organizationMemberIds.add(membership.organization_id);
          if (membership.role === "owner" || membership.role === "recruiter") organizationManagerIds.add(membership.organization_id);
        }
      }

      const sharedIds = [...new Set(posts.map((p) => p.shared_from_post_id).filter((id): id is string => !!id))];
      const { data: sharedRows } = sharedIds.length ? await supabase.from("posts").select("id,author_id,content,media_urls").in("id", sharedIds) : { data: [] as {id:string;author_id:string|null;content:string;media_urls:string[]|null}[] };
      const sharedAuthorIds = [...new Set((sharedRows ?? []).map((p) => p.author_id).filter((id): id is string => !!id))];
      const { data: sharedProfiles } = sharedAuthorIds.length ? await supabase.from("profiles").select("id,full_name,avatar_url,username").in("id", sharedAuthorIds) : { data: [] as {id:string;full_name:string|null;avatar_url:string|null;username:string|null}[] };
      const sharedProfileById = new Map((sharedProfiles ?? []).map((profile) => [profile.id, profile]));
      const sharedById = new Map((sharedRows ?? []).map((shared) => [shared.id, { ...shared, profiles: shared.author_id ? sharedProfileById.get(shared.author_id) ?? null : null }]));
      const { data: reactions } = await supabase
        .from("reactions")
        .select("post_id,user_id,organization_id,type,created_at")
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
      const previewRefsByPost = new Map<string, { user_id: string; organization_id: string | null; type: PostReactionType }[]>();
      (reactions ?? []).forEach((r) => {
        if (!r.post_id || !POST_REACTION_TYPES.includes(r.type as PostReactionType)) return;
        const type = r.type as PostReactionType;
        const current = reactionCountsByPost.get(r.post_id) ?? emptyReactionCounts();
        current[type] += 1;
        reactionCountsByPost.set(r.post_id, current);
        reactionTotalByPost.set(r.post_id, (reactionTotalByPost.get(r.post_id) ?? 0) + 1);

        const isViewerActor = actingOrganizationId
          ? r.organization_id === actingOrganizationId
          : !r.organization_id && !!userId && r.user_id === userId;
        if (isViewerActor) viewerReactionByPost.set(r.post_id, type);

        if (r.user_id) {
          const preview = previewRefsByPost.get(r.post_id) ?? [];
          const actorKey = r.organization_id ? "org:"+r.organization_id : "user:"+r.user_id;
          if (preview.length < 2 && !preview.some((item) => (item.organization_id ? "org:"+item.organization_id : "user:"+item.user_id) === actorKey)) {
            preview.push({ user_id: r.user_id, organization_id: r.organization_id ?? null, type });
            previewRefsByPost.set(r.post_id, preview);
          }
        }
      });

      const previewRefs = [...previewRefsByPost.values()].flat();
      const previewUserIds = [...new Set(previewRefs.filter((item) => !item.organization_id).map((item) => item.user_id))];
      const previewOrganizationIds = [...new Set(previewRefs.map((item) => item.organization_id).filter((id): id is string => !!id))];
      let previewProfileById = new Map<string, { id: string; full_name: string | null; username: string | null; avatar_url: string | null }>();
      let previewOrganizationById = new Map<string, {id:string;name:string;slug:string;logo_url:string|null;verified:boolean|null}>();
      if (previewUserIds.length) {
        const { data: previewProfiles } = await supabase.from("profiles").select("id,full_name,username,avatar_url").in("id", previewUserIds);
        previewProfileById = new Map((previewProfiles ?? []).map((profile) => [profile.id, profile]));
      }
      if (previewOrganizationIds.length) {
        const { data: previewOrganizations } = await supabase.from("organizations").select("id,name,slug,logo_url,verified").in("id", previewOrganizationIds);
        previewOrganizationById = new Map((previewOrganizations ?? []).map((organization) => [organization.id, organization]));
      }

      return posts.map((p) => {
        const counts = reactionCountsByPost.get(p.id) ?? emptyReactionCounts();
        const viewerReaction = viewerReactionByPost.get(p.id) ?? null;
        const reactionPreview: PostReactionPreview[] = (previewRefsByPost.get(p.id) ?? []).map((item) => {
          const profile = item.organization_id ? null : previewProfileById.get(item.user_id);
          const reactionOrganization = item.organization_id ? previewOrganizationById.get(item.organization_id) : null;
          return {
            user_id: item.user_id,
            organization_id: item.organization_id,
            type: item.type,
            full_name: profile?.full_name ?? null,
            username: profile?.username ?? null,
            avatar_url: profile?.avatar_url ?? null,
            organization_name: reactionOrganization?.name ?? null,
            organization_slug: reactionOrganization?.slug ?? null,
            organization_logo_url: reactionOrganization?.logo_url ?? null,
            organization_verified: reactionOrganization?.verified === true,
          };
        });
        const sharedFromPost = p.shared_from_post_id ? sharedById.get(p.shared_from_post_id) ?? null : null;
        return {
          ...p,
          profiles: p.author_id ? feedProfileById.get(p.author_id) ?? null : null,
          organizations: p.organization_id ? organizationById.get(p.organization_id) ?? null : null,
          viewer_is_organization_member: !!p.organization_id && organizationMemberIds.has(p.organization_id),
          viewer_can_manage_organization: !!p.organization_id && organizationManagerIds.has(p.organization_id),
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
    mutationFn: async ({ content, imageFile, mediaFiles, musicFile, feeling, type = "general", categoryId, topic, organizationId }: { content: string; imageFile?: File | null; mediaFiles?: File[]; musicFile?: File | null; feeling?: string | null; type?: "general" | "resource" | "opportunity" | "event"; categoryId?: string | null; topic?: string | null; organizationId?: string | null; }) => {
      if (!userId) throw new Error("You need to be signed in to post.");

      const files = mediaFiles?.length ? mediaFiles : imageFile ? [imageFile] : [];
      if (files.length > 10) throw new Error("A post can include up to 10 images.");
      for (const file of files) {
        if (!file.type.match(/^image\/(jpeg|png|webp)$/)) throw new Error("Use JPG, PNG, or WebP images.");
        if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name} is larger than 8 MB.`);
      }

      const uploadedMediaPaths: string[] = [];
      let musicPath: string | null = null;
      let musicTitle: string | null = null;
      let musicMimeType: string | null = null;

      try {
        const mediaUrls: string[] = [];
        for (const [index, file] of files.entries()) {
          const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
          const path = `${userId}/${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
          const { error: uploadError } = await supabase.storage.from("opportunity-media").upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
          if (uploadError) throw new Error(`Could not upload ${file.name}: ${uploadError.message}`);
          uploadedMediaPaths.push(path);
          const { data: publicUrlData } = supabase.storage.from("opportunity-media").getPublicUrl(path);
          mediaUrls.push(publicUrlData.publicUrl);
        }

        if (musicFile) {
          if (!musicFile.type.match(/^audio\/(mpeg|mp4|webm|ogg|wav|x-wav)$/)) throw new Error("Use MP3, M4A/MP4, WebM, OGG or WAV audio.");
          if (musicFile.size > 6 * 1024 * 1024) throw new Error("Music must be 6 MB or smaller.");
          const safeMusic = musicFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
          musicPath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeMusic}`;
          const { error: musicError } = await supabase.storage.from("post-music").upload(musicPath, musicFile);
          if (musicError) throw new Error(`Music upload failed: ${musicError.message}`);
          musicTitle = musicFile.name.replace(/\.[^.]+$/, "");
          musicMimeType = musicFile.type;
        }

        const { error } = await supabase.from("posts").insert({
          author_id: userId,
          organization_id: organizationId ?? null,
          content,
          media_urls: mediaUrls.length ? mediaUrls : null,
          type,
          category_id: categoryId ?? null,
          topic: topic ?? null,
          feeling: feeling ?? null,
          music_path: musicPath,
          music_title: musicTitle,
          music_mime_type: musicMimeType,
          status: "published",
          visibility: "public",
        });
        if (error) throw error;
      } catch (error) {
        if (uploadedMediaPaths.length) await supabase.storage.from("opportunity-media").remove(uploadedMediaPaths);
        if (musicPath) await supabase.storage.from("post-music").remove([musicPath]);
        throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["feed-posts"] }); },
  });
}

export function useTogglePostReaction() {
  const { userId } = useAuth(); const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, reaction, currentReaction, organizationId }: { postId: string; reaction: PostReactionType; currentReaction: PostReactionType | null; organizationId?: string | null }) => {
      if (!userId) throw new Error("Sign in to react to posts.");

      let deleteQuery = supabase.from("reactions").delete().eq("post_id", postId);
      deleteQuery = organizationId
        ? deleteQuery.eq("organization_id", organizationId)
        : deleteQuery.eq("user_id", userId).is("organization_id", null);
      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;

      if (currentReaction !== reaction) {
        const { error: insertError } = await supabase.from("reactions").insert({ post_id: postId, user_id: userId, organization_id: organizationId ?? null, type: reaction });
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["feed-posts"] }); },
  });
}
