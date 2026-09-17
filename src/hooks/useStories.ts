import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import type { Profile } from "../types/database";

export type MomentBackground = "midnight" | "plum" | "sunset" | "ocean" | "emerald" | "gold";

export interface StoryWithAuthor {
  id: string;
  author_id: string;
  media_url: string | null;
  storage_path: string | null;
  audience: "public" | "followers";
  caption: string | null;
  story_type: "image" | "text";
  text_body: string | null;
  background_style: MomentBackground;
  music_path: string | null;
  music_mime_type: string | null;
  music_title: string | null;
  music_url?: string | null;
  created_at: string;
  expires_at: string;
  profiles: Pick<Profile, "full_name" | "avatar_url"> | null;
}

export interface AuthorWithStories {
  authorId: string;
  author: Pick<Profile, "full_name" | "avatar_url"> | null;
  stories: StoryWithAuthor[];
}

export type PostStoryInput = {
  imageFile?: File | null;
  textBody?: string;
  caption?: string;
  musicFile?: File | null;
  musicTitle?: string;
  audience?: "public" | "followers";
  backgroundStyle?: MomentBackground;
};

const ALLOWED_MUSIC = new Set(["audio/mpeg", "audio/mp4", "audio/webm", "audio/ogg", "audio/wav"]);
const MUSIC_EXTENSION_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  webm: "audio/webm",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  wav: "audio/wav",
};
const SIGNED_URL_SECONDS = 60 * 10;
const SIGNED_URL_REUSE_MS = 8 * 60 * 1000;
const signedMomentCache = new Map<string, { url: string; reusableUntil: number }>();

function resolveMusicMime(file: File) {
  const raw = file.type.toLowerCase().split(";")[0].trim();
  if (raw === "audio/x-m4a" || raw === "audio/m4a") return "audio/mp4";
  if (ALLOWED_MUSIC.has(raw)) return raw;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MUSIC_EXTENSION_MIME[ext] ?? "";
}

async function stableSignedUrl(bucket: "moments" | "moment-music", path: string) {
  const key = `${bucket}:${path}`;
  const cached = signedMomentCache.get(key);
  if (cached && cached.reusableUntil > Date.now()) return cached.url;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_SECONDS);
  if (!data?.signedUrl) return null;
  signedMomentCache.set(key, { url: data.signedUrl, reusableUntil: Date.now() + SIGNED_URL_REUSE_MS });
  return data.signedUrl;
}

async function attachSignedUrls(rows: StoryWithAuthor[]): Promise<StoryWithAuthor[]> {
  return Promise.all(rows.map(async (story) => {
    let mediaUrl = story.media_url;
    let musicUrl: string | null = null;

    if (story.storage_path) {
      const signed = await stableSignedUrl("moments", story.storage_path);
      if (signed) mediaUrl = signed;
    }

    if (story.music_path) {
      musicUrl = await stableSignedUrl("moment-music", story.music_path);
    }

    return { ...story, media_url: mediaUrl, music_url: musicUrl };
  }));
}

export function useActiveStories() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["active-stories", userId ?? "guest"],
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
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
    refetchOnWindowFocus: true,
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
    mutationFn: async (input: PostStoryInput) => {
      if (!userId) throw new Error("Sign in to post a Moment.");

      const imageFile = input.imageFile ?? null;
      const musicFile = input.musicFile ?? null;
      const textBody = (input.textBody ?? input.caption ?? "").trim();
      if (!imageFile && !textBody) throw new Error("Add a photo or write something for your Moment.");
      if (textBody.length > 700) throw new Error("Moment text can be up to 700 characters.");

      if (imageFile) {
        if (!imageFile.type.match(/^image\/(jpeg|png|webp)$/)) throw new Error("Use a JPG, PNG, or WebP image.");
        if (imageFile.size > 8 * 1024 * 1024) throw new Error("Moment image must be 8 MB or smaller.");
      }

      const musicMime = musicFile ? resolveMusicMime(musicFile) : "";
      if (musicFile) {
        if (!musicMime) throw new Error("Use MP3, M4A/MP4, WebM, OGG, or WAV audio.");
        if (musicFile.size > 3 * 1024 * 1024) throw new Error("Moment music must be 3 MB or smaller.");
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Your session expired. Sign in again before posting a Moment.");

      let imagePath: string | null = null;
      let musicPath: string | null = null;

      try {
        if (imageFile) {
          const ext = imageFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
          imagePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error } = await supabase.storage.from("moments").upload(imagePath, imageFile, {
            contentType: imageFile.type,
            cacheControl: "3600",
            upsert: false,
          });
          if (error) throw new Error(`Moment image upload failed: ${error.message}`);
        }

        if (musicFile) {
          const ext = musicFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || (musicMime === "audio/mp4" ? "m4a" : "mp3");
          musicPath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error } = await supabase.storage.from("moment-music").upload(musicPath, musicFile, {
            contentType: musicMime,
            cacheControl: "3600",
            upsert: false,
          });
          if (error) throw new Error(`Moment music upload failed: ${error.message}`);
        }

        const { data, error } = await supabase
          .from("stories")
          .insert({
            author_id: userId,
            storage_path: imagePath,
            media_url: null,
            caption: null,
            story_type: imageFile ? "image" : "text",
            text_body: textBody || null,
            background_style: input.backgroundStyle ?? "midnight",
            music_path: musicPath,
            music_mime_type: musicFile ? musicMime : null,
            music_title: (input.musicTitle || musicFile?.name || "").trim().slice(0, 120) || null,
            audience: input.audience ?? "public",
          })
          .select("id")
          .single();

        if (error) throw new Error(`Moment could not be published: ${error.message}`);
        return data.id as string;
      } catch (error) {
        if (imagePath) await supabase.storage.from("moments").remove([imagePath]);
        if (musicPath) await supabase.storage.from("moment-music").remove([musicPath]);
        throw error;
      }
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

      const cleanup: Promise<unknown>[] = [];
      if (story.storage_path) cleanup.push(supabase.storage.from("moments").remove([story.storage_path]));
      if (story.music_path) cleanup.push(supabase.storage.from("moment-music").remove([story.music_path]));
      if (cleanup.length) await Promise.allSettled(cleanup);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-stories"] });
      queryClient.invalidateQueries({ queryKey: ["my-stories"] });
    },
  });
}
