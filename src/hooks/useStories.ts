import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import type { Profile } from "../types/database";

export interface StoryWithAuthor { id: string; author_id: string; media_url: string | null; storage_path: string | null; audience: "public" | "followers"; caption: string | null; created_at: string; expires_at: string; profiles: Pick<Profile, "full_name" | "avatar_url"> | null; }
export interface AuthorWithStories { authorId: string; author: Pick<Profile, "full_name" | "avatar_url"> | null; stories: StoryWithAuthor[]; }

async function attachSignedUrls(rows: StoryWithAuthor[]): Promise<StoryWithAuthor[]> {
  return Promise.all(rows.map(async (story) => { if (!story.storage_path) return story; const { data, error } = await supabase.storage.from("moments").createSignedUrl(story.storage_path, 60 * 10); if (error) return { ...story, media_url: null }; return { ...story, media_url: data.signedUrl }; }));
}

export function useActiveStories() {
  return useQuery({ queryKey: ["active-stories"], refetchInterval: 60_000, queryFn: async (): Promise<AuthorWithStories[]> => { const { data, error } = await supabase.from("stories").select("*, profiles(full_name, avatar_url)").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: true }); if (error) throw error; const rows = await attachSignedUrls((data as StoryWithAuthor[] | null) ?? []); const byAuthor = new Map<string, AuthorWithStories>(); rows.forEach((story) => { if (!byAuthor.has(story.author_id)) byAuthor.set(story.author_id, { authorId: story.author_id, author: story.profiles, stories: [] }); byAuthor.get(story.author_id)!.stories.push(story); }); return [...byAuthor.values()]; } });
}
export function useMyStories() {
  const { userId } = useAuth();
  return useQuery({ queryKey: ["my-stories", userId], enabled: !!userId, queryFn: async (): Promise<StoryWithAuthor[]> => { const { data, error } = await supabase.from("stories").select("*, profiles(full_name, avatar_url)").eq("author_id", userId as string).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: true }); if (error) throw error; return attachSignedUrls((data as StoryWithAuthor[]) ?? []); } });
}
export function usePostStory() {
  const { userId } = useAuth(); const queryClient = useQueryClient();
  return useMutation({ mutationFn: async ({ imageFile, caption, audience = "public" }: { imageFile: File; caption: string; audience?: "public" | "followers" }) => { if (!userId) throw new Error("Sign in to post a Moment."); if (!imageFile.type.match(/^image\/(jpeg|png|webp)$/)) throw new Error("Use a JPG, PNG, or WebP image."); if (imageFile.size > 8 * 1024 * 1024) throw new Error("Image must be 8 MB or smaller."); const ext = imageFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg"; const path = `${userId}/${Date.now()}.${ext}`; const { error: uploadError } = await supabase.storage.from("moments").upload(path, imageFile, { contentType: imageFile.type }); if (uploadError) throw uploadError; const { error } = await supabase.from("stories").insert({ author_id: userId, storage_path: path, media_url: null, caption: caption || null, audience }); if (error) { await supabase.storage.from("moments").remove([path]); throw error; } }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["active-stories"] }); queryClient.invalidateQueries({ queryKey: ["my-stories"] }); } });
}
