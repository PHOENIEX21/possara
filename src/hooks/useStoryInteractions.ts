import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import type { StoryReaction } from "../lib/storyReactions";

export type StoryInteraction = { id: string; story_id: string; user_id: string; kind: "like" | "reply"; reaction_type: StoryReaction; body: string | null; created_at: string; profile?: { full_name: string | null; username: string | null; avatar_url: string | null } | null };

export function useStoryInteractions(storyId: string | undefined) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["story-interactions", storyId, userId],
    enabled: !!storyId && !!userId,
    queryFn: async (): Promise<StoryInteraction[]> => {
      const { data, error } = await supabase.from("story_interactions").select("id,story_id,user_id,kind,reaction_type,body,created_at,profile:profiles(full_name,username,avatar_url)").eq("story_id", storyId as string).order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(row=>({...row,profile:Array.isArray(row.profile)?row.profile[0]??null:row.profile})) as StoryInteraction[];
    },
  });
}

export function useToggleStoryLike(storyId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reaction: StoryReaction | null) => {
      if (!userId) throw new Error("Sign in to react to a Moment.");
      if (!reaction) {
        const { error } = await supabase.from("story_interactions").delete().eq("story_id", storyId).eq("user_id", userId).eq("kind", "like");
        if (error) throw error;
      } else {
        const { data: existing, error: readError } = await supabase.from("story_interactions").select("id").eq("story_id",storyId).eq("user_id",userId).eq("kind","like").maybeSingle();
        if(readError)throw readError;
        const { error } = existing
          ? await supabase.from("story_interactions").update({reaction_type:reaction}).eq("id",existing.id)
          : await supabase.from("story_interactions").insert({ story_id: storyId, user_id: userId, kind: "like", reaction_type:reaction });
        if (error?.code === "23505") {
          const {error:retryError}=await supabase.from("story_interactions").update({reaction_type:reaction}).eq("story_id",storyId).eq("user_id",userId).eq("kind","like");
          if(retryError)throw retryError;
        } else if(error)throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["story-interactions", storyId] }),
  });
}

export function useReplyToStory(storyId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!userId) throw new Error("Sign in to reply to a Moment.");
      const text = body.trim();
      if (!text) throw new Error("Write a reply first.");
      if (text.length > 500) throw new Error("Replies can be up to 500 characters.");
      const { error } = await supabase.from("story_interactions").insert({ story_id: storyId, user_id: userId, kind: "reply", body: text });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["story-interactions", storyId] }),
  });
}
