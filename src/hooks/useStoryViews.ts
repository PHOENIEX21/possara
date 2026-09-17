import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export type StoryViewer = {
  viewerId: string;
  viewedAt: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
};

export function useRecordStoryView() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storyId, authorId }: { storyId: string; authorId: string }) => {
      if (!userId || userId === authorId) return;
      const { error } = await supabase.from("story_views").upsert(
        {
          story_id: storyId,
          viewer_id: userId,
          viewed_at: new Date().toISOString(),
        },
        { onConflict: "story_id,viewer_id" },
      );
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["story-viewers", variables.storyId] });
    },
  });
}

export function useStoryViewers(storyId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["story-viewers", storyId],
    enabled: !!storyId && enabled,
    refetchInterval: enabled ? 15_000 : false,
    queryFn: async (): Promise<StoryViewer[]> => {
      const { data: rows, error } = await supabase
        .from("story_views")
        .select("viewer_id, viewed_at")
        .eq("story_id", storyId as string)
        .order("viewed_at", { ascending: false });
      if (error) throw error;
      if (!rows?.length) return [];

      const viewerIds = rows.map((row) => row.viewer_id);
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", viewerIds);
      if (profileError) throw profileError;

      const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      return rows.map((row) => {
        const profile = profileById.get(row.viewer_id);
        return {
          viewerId: row.viewer_id,
          viewedAt: row.viewed_at,
          fullName: profile?.full_name ?? null,
          username: profile?.username ?? null,
          avatarUrl: profile?.avatar_url ?? null,
        };
      });
    },
  });
}
