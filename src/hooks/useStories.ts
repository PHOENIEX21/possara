import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import type { Profile } from "../types/database";

export interface StoryWithAuthor {
  id: string;
  author_id: string;
  media_url: string | null;
  storage_path: string | null;
  audience: "public" | "followers";
  caption: string | null;
  created_at: string;
  expires_at: string;
  profiles: Pick<Profile, "full_name" | "avatar_url"> | null;
}

export interface AuthorWithStories {
  authorId: string;
  author: Pick<Profile, "full_name" | "avatar_url"> | null;
  stories: StoryWithAuthor[];
}

async function attachSignedUrls(rows: StoryWithAuthor[]): Promise<StoryWithAuthor[]> {
  return Promise.all(
    rows.map(async (story) => {
      if (!story.storage_path) return story;
      const { data, error } = await supabase.storage.from("moments").createSignedUrl(story.storage_path, 60 * 10);
      if (error) return { ...story, media_url: null };
      return { ...story, media_url: data.signedUrl };
    })
  );
}

export function useActiveStories() {
  return useQuery({
    queryKey: ["active-stories"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<AuthorWithStories[]> => {
      const { data, error } = await supabase
        .from("stories")
        .select("*, profiles(full_name, avatar_url)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = await attachSignedUrls((data as StoryWithAuthor[] | null) ?? []);
      const byAuthor = new Map<string, AuthorWithStories>();
      rows.forEach((story) => {
        if (!byAuthor.has(story.author_id)) {
          byAuthor.set(story.author_id, { authorId: story.author_id, author: story.profiles, stories: [] });
        }
        byAuthor.get(story.author_id)!.stories.push(story);
      });
      return [...byAuthor.values()];
    },
  });
}

export function useMyStories() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["my-stories", userId],
    enabled: !!userId,
    queryFn: async (): Promise<StoryWithAuthor[]> => {
      const { data, error } = await supabase
        .from("stories")
        .select("*, profiles(full_name, avatar_url)")
        .eq("author_id", userId as string)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return attachSignedUrls((data as StoryWithAuthor[]) ?? []);
    },
  });
}

export function usePostStory() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ imageFile, caption, audience = "public" }: { imageFile: File; caption: string; audience?: "public" | "followers" }) => {
      if (!userId) throw new Error("Sign in to post a Moment.");
      if (!imageFile.type.match(/^image\/(jpeg|png|webp)$/)) throw new Error("Use a JPG, PNG, or WebP image.");
      if (imageFile.size > 8 * 1024 * 1024) throw new Error("Image must be 8 MB or smaller.");

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Your session expired. Sign in again before posting a Moment.");

      const ext = imageFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("moments").upload(path, imageFile, {
        contentType: imageFile.type,
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw new Error(`Moment upload failed: ${uploadError.message}`);

      const { data, error } = await supabase
        .from("stories")
        .insert({ author_id: userId, storage_path: path, media_url: null, caption: caption || null, audience })
        .select("id")
        .single();
      if (error) {
        await supabase.storage.from("moments").remove([path]);
        throw new Error(`Moment could not be published: ${error.message}`);
      }
      return data.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-stories"] });
      queryClient.invalidateQueries({ queryKey: ["my-stories"] });
    },
  });
}

export function useDeleteStory() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (story: StoryWithAuthor) => {
      if (!userId || story.author_id !== userId) throw new Error("You can only delete your own Moment.");

      const { error: deleteRowError } = await supabase.from("stories").delete().eq("id", story.id).eq("author_id", userId);
      if (deleteRowError) throw new Error(`Moment could not be deleted: ${deleteRowError.message}`);

      if (story.storage_path) {
        const { error: storageError } = await supabase.storage.from("moments").remove([story.storage_path]);
        if (storageError) throw new Error(`Moment was removed, but its image cleanup failed: ${storageError.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-stories"] });
      queryClient.invalidateQueries({ queryKey: ["my-stories"] });
    },
  });
}
