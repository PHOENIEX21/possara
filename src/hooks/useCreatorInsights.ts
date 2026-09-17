import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export type CreatorInsightPost = {
  id: string;
  content: string;
  createdAt: string;
  reactions: number;
  comments: number;
  engagement: number;
};

export type CreatorInsights = {
  windowDays: number;
  postsPublished: number;
  reactionsReceived: number;
  commentsReceived: number;
  newFollowers: number;
  recentSevenDayEngagement: number;
  previousSevenDayEngagement: number;
  momentumPercent: number | null;
  topPosts: CreatorInsightPost[];
};

export function useCreatorInsights(windowDays = 30) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["creator-insights", userId, windowDays],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<CreatorInsights> => {
      const now = Date.now();
      const since = new Date(now - windowDays * 86_400_000).toISOString();
      const sevenDaysAgo = now - 7 * 86_400_000;
      const fourteenDaysAgo = now - 14 * 86_400_000;

      const [{ data: posts, error: postsError }, { data: followers, error: followersError }] = await Promise.all([
        supabase.from("posts").select("id,content,created_at").eq("author_id", userId as string).is("deleted_at", null).gte("created_at", since).order("created_at", { ascending: false }).limit(200),
        supabase.from("follows").select("follower_id,created_at").eq("following_id", userId as string).gte("created_at", since).limit(1000),
      ]);
      if (postsError) throw postsError;
      if (followersError) throw followersError;

      const postRows = posts ?? [];
      const postIds = postRows.map((post) => post.id);
      let reactions: { post_id: string | null; user_id: string; created_at: string }[] = [];
      let comments: { post_id: string; author_id: string; created_at: string }[] = [];

      if (postIds.length) {
        const [{ data: reactionRows, error: reactionError }, { data: commentRows, error: commentError }] = await Promise.all([
          supabase.from("reactions").select("post_id,user_id,created_at").in("post_id", postIds).gte("created_at", since).limit(5000),
          supabase.from("comments").select("post_id,author_id,created_at").in("post_id", postIds).is("deleted_at", null).gte("created_at", since).limit(5000),
        ]);
        if (reactionError) throw reactionError;
        if (commentError) throw commentError;
        reactions = (reactionRows ?? []).filter((row) => row.post_id && row.user_id !== userId) as typeof reactions;
        comments = (commentRows ?? []).filter((row) => row.author_id !== userId) as typeof comments;
      }

      const reactionCounts = new Map<string, number>();
      const commentCounts = new Map<string, number>();
      reactions.forEach((row) => { if (row.post_id) reactionCounts.set(row.post_id, (reactionCounts.get(row.post_id) ?? 0) + 1); });
      comments.forEach((row) => commentCounts.set(row.post_id, (commentCounts.get(row.post_id) ?? 0) + 1));

      const topPosts: CreatorInsightPost[] = postRows.map((post) => {
        const reactionCount = reactionCounts.get(post.id) ?? 0;
        const commentCount = commentCounts.get(post.id) ?? 0;
        return { id: post.id, content: post.content, createdAt: post.created_at, reactions: reactionCount, comments: commentCount, engagement: reactionCount + commentCount };
      }).sort((a, b) => b.engagement - a.engagement || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

      const engagementEvents = [...reactions.map((row) => row.created_at), ...comments.map((row) => row.created_at)];
      const recent = engagementEvents.filter((value) => new Date(value).getTime() >= sevenDaysAgo).length;
      const previous = engagementEvents.filter((value) => { const time = new Date(value).getTime(); return time >= fourteenDaysAgo && time < sevenDaysAgo; }).length;
      const momentumPercent = previous === 0 ? (recent > 0 ? 100 : null) : Math.round(((recent - previous) / previous) * 100);

      return {
        windowDays,
        postsPublished: postRows.length,
        reactionsReceived: reactions.length,
        commentsReceived: comments.length,
        newFollowers: (followers ?? []).length,
        recentSevenDayEngagement: recent,
        previousSevenDayEngagement: previous,
        momentumPercent,
        topPosts,
      };
    },
  });
}
