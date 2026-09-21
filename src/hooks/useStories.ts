import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import { resolveMusicTrack } from "./useMusicLibrary";
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
  music_track_key: string | null;
  music_creator: string | null;
  music_clip_start_seconds: number | null;
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
  imageFiles?: File[];
  textBody?: string;
  caption?: string;
  musicFile?: File | null;
  musicTitle?: string;
  musicTrackKey?: string | null;
  musicTrackCreator?: string | null;
  musicClipStartSeconds?: number;
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
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) return null;
  signedMomentCache.set(key, { url: data.signedUrl, reusableUntil: Date.now() + SIGNED_URL_REUSE_MS });
  return data.signedUrl;
}

async function attachSignedUrls(rows: StoryWithAuthor[]): Promise<StoryWithAuthor[]> {
  return Promise.all(rows.map(async (story) => {
    let mediaUrl = story.media_url;
    let musicUrl: string | null = null;
    let musicTitle = story.music_title;
    let musicCreator = story.music_creator;

    if (story.storage_path) {
      const signed = await stableSignedUrl("moments", story.storage_path);
      if (signed) mediaUrl = signed;
    }

    if (story.music_path) {
      musicUrl = await stableSignedUrl("moment-music", story.music_path);
    } else if (story.music_track_key) {
      const track = await resolveMusicTrack(story.music_track_key);
      if (track) {
        musicUrl = track.audioUrl;
        musicTitle = musicTitle || track.title;
        musicCreator = musicCreator || track.creator;
      }
    }

    return { ...story, media_url: mediaUrl, music_url: musicUrl, music_title: musicTitle, music_creator: musicCreator };
  }));
}

export function useActiveStories() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["active-stories", userId ?? "guest"],
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<AuthorWithStories[]> => {
      // Keep the Moment query independent from PostgREST relationship inference.
      // A relationship error here used to make a successfully published Moment
      // disappear from the bar, even though the story row and storage object existed.
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rawRows = (data ?? []) as Omit<StoryWithAuthor, "profiles">[];
      const authorIds = [...new Set(rawRows.map((story) => story.author_id).filter(Boolean))];
      const { data: profiles, error: profileError } = authorIds.length
        ? await supabase.from("profiles").select("id,full_name,avatar_url").in("id", authorIds)
        : { data: [], error: null };
      if (profileError) throw profileError;
      const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      const hydrated = rawRows.map((story) => ({ ...story, profiles: profileById.get(story.author_id) ?? null })) as StoryWithAuthor[];
      const rows = await attachSignedUrls(hydrated);
      const byAuthor = new Map<string, AuthorWithStories>();
      rows.forEach((story) => {
        if (!byAuthor.has(story.author_id)) byAuthor.set(story.author_id, { authorId: story.author_id, author: story.profiles, stories: [] });
        byAuthor.get(story.author_id)!.stories.push(story);
      });
      const groups = [...byAuthor.values()];
      groups.forEach((group) => group.stories.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      groups.sort((a,b) => new Date(b.stories[b.stories.length-1]?.created_at ?? 0).getTime() - new Date(a.stories[a.stories.length-1]?.created_at ?? 0).getTime());
      return groups;
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
        .select("*")
        .eq("author_id", userId as string)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id,full_name,avatar_url")
        .eq("id", userId as string)
        .maybeSingle();
      if (profileError) throw profileError;
      const hydrated = ((data ?? []) as Omit<StoryWithAuthor, "profiles">[]).map((story) => ({ ...story, profiles: profile ?? null })) as StoryWithAuthor[];
      const rows = await attachSignedUrls(hydrated);
      return rows.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    },
  });
}

export function usePostStory() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PostStoryInput) => {
      if (!userId) throw new Error("Sign in to post a Moment.");

      const imageFiles = input.imageFiles?.length ? input.imageFiles : input.imageFile ? [input.imageFile] : [];
      const useLibraryTrack = !!input.musicTrackKey;
      const musicFile = useLibraryTrack ? null : input.musicFile ?? null;
      const textBody = (input.textBody ?? input.caption ?? "").trim();

      if (imageFiles.length > 10) throw new Error("You can publish up to 10 photos in one Moment batch.");
      if (!imageFiles.length && !textBody) throw new Error("Add photos or write something for your Moment.");
      if (textBody.length > 700) throw new Error("Moment text can be up to 700 characters.");

      for (const file of imageFiles) {
        if (!file.type.match(/^image\/(jpeg|png|webp)$/)) throw new Error("Use JPG, PNG, or WebP images.");
        if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name} is larger than 8 MB.`);
      }

      const musicMime = musicFile ? resolveMusicMime(musicFile) : "";
      if (musicFile) {
        if (!musicMime) throw new Error("Use MP3, M4A/MP4, WebM, OGG, or WAV audio.");
        if (musicFile.size > 3 * 1024 * 1024) throw new Error("Moment music must be 3 MB or smaller.");
      }

      if (useLibraryTrack) {
        const track = await resolveMusicTrack(input.musicTrackKey as string);
        if (!track) throw new Error("That music track is no longer available. Choose another sound.");
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Your session expired. Sign in again before posting a Moment.");

      const uploadedImagePaths: string[] = [];
      const createdStoryIds: string[] = [];
      let musicPath: string | null = null;

      try {
        for (const [index,file] of imageFiles.entries()) {
          const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
          const requestedPath = `${userId}/${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { data: uploadedImage, error } = await supabase.storage.from("moments").upload(requestedPath, file, { contentType: file.type, cacheControl: "3600", upsert: false });
          if (error) throw new Error(`Moment image upload failed for ${file.name}: ${error.message}`);
          if (!uploadedImage?.path) throw new Error("Moment image upload did not return a cloud storage path.");
          uploadedImagePaths.push(uploadedImage.path);
        }

        if (musicFile) {
          const ext = musicFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || (musicMime === "audio/mp4" ? "m4a" : "mp3");
          const requestedPath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { data: uploadedMusic, error } = await supabase.storage.from("moment-music").upload(requestedPath, musicFile, { contentType: musicMime, cacheControl: "3600", upsert: false });
          if (error) throw new Error(`Moment music upload failed: ${error.message}`);
          if (!uploadedMusic?.path) throw new Error("Moment music upload did not return a cloud storage path.");
          musicPath = uploadedMusic.path;
        }

        const baseCreatedAt = Date.now();
        const storyRows = uploadedImagePaths.length
          ? uploadedImagePaths.map((imagePath,index) => ({
              author_id: userId,
              storage_path: imagePath,
              media_url: null,
              caption: null,
              story_type: "image",
              text_body: textBody || null,
              background_style: input.backgroundStyle ?? "midnight",
              music_path: musicPath,
              music_mime_type: musicFile ? musicMime : null,
              music_title: (input.musicTitle || musicFile?.name || "").trim().slice(0, 120) || null,
              music_track_key: input.musicTrackKey ?? null,
              music_creator: input.musicTrackCreator?.trim().slice(0, 120) || null,
              music_clip_start_seconds: Math.max(0, input.musicClipStartSeconds ?? 0),
              audience: input.audience ?? "public",
              created_at: new Date(baseCreatedAt + index).toISOString(),
            }))
          : [{
              author_id: userId,
              storage_path: null,
              media_url: null,
              caption: null,
              story_type: "text",
              text_body: textBody || null,
              background_style: input.backgroundStyle ?? "midnight",
              music_path: musicPath,
              music_mime_type: musicFile ? musicMime : null,
              music_title: (input.musicTitle || musicFile?.name || "").trim().slice(0, 120) || null,
              music_track_key: input.musicTrackKey ?? null,
              music_creator: input.musicTrackCreator?.trim().slice(0, 120) || null,
              music_clip_start_seconds: Math.max(0, input.musicClipStartSeconds ?? 0),
              audience: input.audience ?? "public",
            }];

        const { data, error } = await supabase
          .from("stories")
          .insert(storyRows)
          .select("id,music_path,storage_path,music_track_key");

        if (error) throw new Error(`Moment could not be published: ${error.message}`);
        if (!data?.length) throw new Error("Moment publish returned no created items.");
        createdStoryIds.push(...data.map((row) => row.id as string));
        if (imageFiles.length && data.length !== imageFiles.length) throw new Error("Not every selected photo became a Moment.");
        if (musicFile && data.some((row) => row.music_path !== musicPath)) throw new Error("Moment music uploaded but was not attached to every Moment.");
        if (input.musicTrackKey && data.some((row) => row.music_track_key !== input.musicTrackKey)) throw new Error("The selected POSSARA Music track was not attached to every Moment.");

        return createdStoryIds;
      } catch (error) {
        if (createdStoryIds.length) await supabase.from("stories").delete().in("id", createdStoryIds).eq("author_id", userId);
        if (uploadedImagePaths.length) await supabase.storage.from("moments").remove(uploadedImagePaths);
        if (musicPath) await supabase.storage.from("moment-music").remove([musicPath]);
        throw error;
      }
    },
    onSuccess: async () => {
      signedMomentCache.clear();
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["active-stories"] }),
        queryClient.refetchQueries({ queryKey: ["my-stories"] }),
      ]);
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
      if (story.music_path) {
        const { count } = await supabase
          .from("stories")
          .select("id", { count: "exact", head: true })
          .eq("author_id", userId)
          .eq("music_path", story.music_path);
        if (!count) cleanup.push(supabase.storage.from("moment-music").remove([story.music_path]));
      }
      if (cleanup.length) await Promise.allSettled(cleanup);
    },
    onSuccess: async () => {
      signedMomentCache.clear();
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["active-stories"] }),
        queryClient.refetchQueries({ queryKey: ["my-stories"] }),
      ]);
    },
  });
}
