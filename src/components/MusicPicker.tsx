import { useMemo, useRef, useState } from "react";
import { Check, Music2, Pause, Play, Search, X } from "lucide-react";
import { useMusicLibrary } from "../hooks/useMusicLibrary";
import type { MusicLibraryTrack } from "../hooks/useMusicLibrary";

export function MusicPicker({
  selectedTrackKey,
  onSelect,
  onClose,
}: {
  selectedTrackKey?: string | null;
  onSelect: (track: MusicLibraryTrack) => void;
  onClose: () => void;
}) {
  const { data: tracks, isLoading } = useMusicLibrary();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const categories = useMemo(() => ["All", ...Array.from(new Set((tracks ?? []).map((track) => track.category))).sort()], [tracks]);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (tracks ?? []).filter((track) => {
      const categoryMatch = category === "All" || track.category === category;
      const searchMatch = !needle || `${track.title} ${track.creator} ${track.category}`.toLowerCase().includes(needle);
      return categoryMatch && searchMatch;
    });
  }, [tracks, search, category]);

  function stopPreview() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingKey(null);
  }

  function preview(track: MusicLibraryTrack) {
    if (playingKey === track.trackKey) {
      stopPreview();
      return;
    }
    stopPreview();
    const audio = new Audio(track.audioUrl);
    audio.loop = true;
    audio.volume = 0.85;
    audio.onended = () => setPlayingKey(null);
    audio.onerror = () => setPlayingKey(null);
    void audio.play().then(() => {
      audioRef.current = audio;
      setPlayingKey(track.trackKey);
    }).catch(() => setPlayingKey(null));
  }

  function choose(track: MusicLibraryTrack) {
    stopPreview();
    onSelect(track);
    onClose();
  }

  return <div className="fixed inset-0 z-[85] flex items-end justify-center bg-ink/70 sm:items-center sm:p-4" onClick={() => { stopPreview(); onClose(); }}>
    <section className="max-h-[88vh] w-full max-w-xl overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Choose music">
      <header className="flex items-start justify-between gap-4 border-b border-paper-dim px-5 py-4">
        <div><p className="eyebrow">POSSARA Music</p><h2 className="mt-1 text-xl font-semibold">Choose a sound</h2><p className="mt-1 text-xs leading-5 text-ink-faint">POSSARA Originals, approved artist uploads and reusable licensed/public-domain tracks.</p></div>
        <button type="button" onClick={() => { stopPreview(); onClose(); }} className="rounded-full p-2 text-ink-light hover:bg-paper" aria-label="Close music library"><X size={19}/></button>
      </header>

      <div className="border-b border-paper-dim p-4">
        <label className="flex items-center gap-2 rounded-2xl bg-paper px-3 py-2.5"><Search size={16} className="text-ink-faint"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search music, artist or mood" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${category === item ? "bg-ink text-white" : "bg-paper text-ink-light"}`}>{item}</button>)}</div>
      </div>

      <div className="max-h-[58vh] overflow-y-auto p-3">
        {isLoading && <p className="p-4 text-sm text-ink-light">Loading music…</p>}
        {!isLoading && filtered.length === 0 && <div className="rounded-2xl bg-paper p-5 text-center"><Music2 className="mx-auto text-ink-faint" size={22}/><p className="mt-2 text-sm font-medium">No matching sound</p><p className="mt-1 text-xs text-ink-faint">Try another title, artist or mood.</p></div>}
        <div className="space-y-1">{filtered.map((track) => {
          const active = selectedTrackKey === track.trackKey;
          const playing = playingKey === track.trackKey;
          return <div key={track.trackKey} className={`flex items-center gap-3 rounded-2xl px-2.5 py-2.5 ${active ? "bg-brand-light" : "hover:bg-paper"}`}>
            <button type="button" onClick={() => preview(track)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink text-white" aria-label={playing ? `Pause ${track.title}` : `Preview ${track.title}`}>{playing ? <Pause size={17}/> : <Play size={17}/>}</button>
            <button type="button" onClick={() => choose(track)} className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-2"><p className="truncate text-sm font-semibold text-ink">{track.title}</p>{active && <Check size={14} className="shrink-0 text-brand-dark"/>}</div>
              <p className="truncate text-xs text-ink-light">{track.creator} · {track.category}</p>
              <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-ink-faint">{track.rightsLabel}</p>
            </button>
            <button type="button" onClick={() => choose(track)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${active ? "bg-brand text-white" : "border border-ink-faint/20 bg-white text-ink"}`}>{active ? "Selected" : "Use"}</button>
          </div>;
        })}</div>
      </div>
    </section>
  </div>;
}
