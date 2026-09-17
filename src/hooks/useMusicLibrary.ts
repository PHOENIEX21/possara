import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { getOriginalMelody, getOriginalMelodyUrl, ORIGINAL_MELODIES } from "../lib/originalMelodies";

export type MusicLibraryTrack = {
  trackKey: string;
  title: string;
  creator: string;
  category: string;
  audioUrl: string;
  durationSeconds: number | null;
  artworkUrl: string | null;
  sourceType: "possara_original" | "artist_upload" | "public_domain" | "cc0";
  rightsLabel: string;
};

type MusicTrackRow = {
  track_key: string;
  title: string;
  creator_name: string;
  category: string | null;
  audio_url: string;
  artwork_url: string | null;
  duration_seconds: number | null;
  source_type: MusicLibraryTrack["sourceType"];
  rights_basis: string;
};

function originals(): MusicLibraryTrack[] {
  return ORIGINAL_MELODIES.flatMap((track) => {
    const audioUrl = getOriginalMelodyUrl(track.trackKey);
    if (!audioUrl) return [];
    return [{
      trackKey: track.trackKey,
      title: track.title,
      creator: track.creator,
      category: track.category,
      audioUrl,
      durationSeconds: track.durationSeconds,
      artworkUrl: null,
      sourceType: "possara_original" as const,
      rightsLabel: "POSSARA original",
    }];
  });
}

function mapRow(row: MusicTrackRow): MusicLibraryTrack {
  return {
    trackKey: row.track_key,
    title: row.title,
    creator: row.creator_name,
    category: row.category || "Other",
    audioUrl: row.audio_url,
    durationSeconds: row.duration_seconds,
    artworkUrl: row.artwork_url,
    sourceType: row.source_type,
    rightsLabel: row.rights_basis,
  };
}

export async function resolveMusicTrack(trackKey: string): Promise<MusicLibraryTrack | null> {
  const original = getOriginalMelody(trackKey);
  if (original) {
    const audioUrl = getOriginalMelodyUrl(trackKey);
    return audioUrl ? {
      trackKey,
      title: original.title,
      creator: original.creator,
      category: original.category,
      audioUrl,
      durationSeconds: original.durationSeconds,
      artworkUrl: null,
      sourceType: "possara_original",
      rightsLabel: "POSSARA original",
    } : null;
  }

  const { data, error } = await supabase
    .from("music_tracks")
    .select("track_key,title,creator_name,category,audio_url,artwork_url,duration_seconds,source_type,rights_basis")
    .eq("track_key", trackKey)
    .eq("is_active", true)
    .eq("is_approved", true)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as MusicTrackRow);
}

export function useMusicLibrary() {
  return useQuery({
    queryKey: ["music-library"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<MusicLibraryTrack[]> => {
      const builtIns = originals();
      const { data, error } = await supabase
        .from("music_tracks")
        .select("track_key,title,creator_name,category,audio_url,artwork_url,duration_seconds,source_type,rights_basis")
        .eq("is_active", true)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(100);

      // During rollout the table may not exist yet. POSSARA Originals still work.
      if (error) return builtIns;
      const remote = ((data ?? []) as MusicTrackRow[]).map(mapRow);
      const seen = new Set(builtIns.map((track) => track.trackKey));
      return [...builtIns, ...remote.filter((track) => !seen.has(track.trackKey))];
    },
  });
}
