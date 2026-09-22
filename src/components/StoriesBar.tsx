import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Eye, Image as ImageIcon, Music2, Pause, Play, Plus, Trash2, Type, Upload, X } from "lucide-react";
import { useActiveStories, useDeleteStory, usePostStory } from "../hooks/useStories";
import { useRecordStoryView, useStoryViewers } from "../hooks/useStoryViews";
import { useAuth } from "../store/auth";
import { MusicPicker } from "./MusicPicker";
import type { AuthorWithStories, MomentBackground } from "../hooks/useStories";
import type { MusicLibraryTrack } from "../hooks/useMusicLibrary";

const STORY_DURATION = 6500;

const BACKGROUNDS: Record<MomentBackground, string> = {
  midnight: "bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900",
  plum: "bg-gradient-to-br from-fuchsia-950 via-purple-800 to-indigo-950",
  sunset: "bg-gradient-to-br from-orange-500 via-rose-600 to-purple-900",
  ocean: "bg-gradient-to-br from-cyan-700 via-blue-800 to-slate-950",
  emerald: "bg-gradient-to-br from-emerald-600 via-teal-800 to-slate-950",
  gold: "bg-gradient-to-br from-amber-400 via-orange-600 to-stone-950",
};

const BACKGROUND_OPTIONS: { value: MomentBackground; label: string }[] = [
  { value: "midnight", label: "Midnight" }, { value: "plum", label: "Plum" },
  { value: "sunset", label: "Sunset" }, { value: "ocean", label: "Ocean" },
  { value: "emerald", label: "Emerald" }, { value: "gold", label: "Gold" },
];

function StoryViewer({ group, onClose }: { group: AuthorWithStories; onClose: () => void }) {
  const { userId } = useAuth();
  const deleteStory = useDeleteStory();
  const recordView = useRecordStoryView();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const story = group.stories[index];
  const ownStory = userId === story.author_id;
  const { data: viewers, isLoading: viewersLoading } = useStoryViewers(story.id, ownStory);

  function next() { setConfirmDelete(false); setViewersOpen(false); setProgress(0); if (index < group.stories.length - 1) setIndex((value) => value + 1); else onClose(); }
  function prev() { setConfirmDelete(false); setViewersOpen(false); setProgress(0); if (index > 0) setIndex((value) => value - 1); }

  useEffect(() => { setProgress(0); setPaused(false); setViewersOpen(false); }, [index, group.authorId]);
  useEffect(() => { if (!userId || ownStory) return; recordView.mutate({ storyId: story.id, authorId: story.author_id }); }, [story.id, story.author_id, userId, ownStory]);
  useEffect(() => {
    if (!story.music_url || !audioRef.current) return;
    const audio = audioRef.current;
    const start = Math.max(0, Number(story.music_clip_start_seconds ?? 0));
    const seek = () => { try { audio.currentTime = Math.min(start, Number.isFinite(audio.duration) ? Math.max(0, audio.duration - 0.1) : start); } catch { /* browser may not be ready yet */ } };
    if (audio.readyState >= 1) seek(); else audio.addEventListener("loadedmetadata", seek, { once: true });
  }, [story.id, story.music_url, story.music_clip_start_seconds]);
  useEffect(() => {
    if (paused || confirmDelete || viewersOpen) return;
    const start = Date.now() - (progress / 100) * STORY_DURATION;
    const timer = window.setInterval(() => {
      const nextProgress = Math.min(100, ((Date.now() - start) / STORY_DURATION) * 100);
      setProgress(nextProgress);
      if (nextProgress >= 100) { window.clearInterval(timer); next(); }
    }, 80);
    return () => window.clearInterval(timer);
  }, [paused, confirmDelete, viewersOpen, index]);

  async function removeCurrent() { try { await deleteStory.mutateAsync(story); onClose(); } catch { /* mutation exposes error */ } }
  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) { const touch = event.touches[0]; touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null; }
  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) { const start = touchStartRef.current; const touch = event.changedTouches[0]; touchStartRef.current = null; if (!start || !touch) return; const dx = touch.clientX - start.x; const dy = touch.clientY - start.y; if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy) * 1.15) return; if (dx < 0) next(); else prev(); }

  const text = story.text_body?.trim() || story.caption?.trim() || "";
  const backgroundClass = BACKGROUNDS[story.background_style] ?? BACKGROUNDS.midnight;

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95 sm:px-4">
    <div className="relative flex h-full w-full max-w-sm flex-col justify-center sm:h-auto">
      <div className="absolute left-0 right-0 top-0 z-30 p-3 sm:static sm:p-0">
        <div className="mb-2 flex gap-1">{group.stories.map((item, itemIndex) => <div key={item.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"><div className="h-full bg-white transition-[width] duration-75" style={{ width: itemIndex < index ? "100%" : itemIndex === index ? `${progress}%` : "0%" }} /></div>)}</div>
        <div className="flex items-center gap-2 text-white">
          {group.author?.avatar_url ? <img src={group.author.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs">{(group.author?.full_name ?? "?").charAt(0).toUpperCase()}</div>}
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{group.author?.full_name ?? "Member"}</span>
          {ownStory && <button type="button" onClick={() => { setPaused(true); setViewersOpen(true); }} className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-2 text-xs" aria-label="View Moment viewers"><Eye size={16} /><span>{viewers?.length ?? 0}</span></button>}
          <button type="button" onClick={() => setPaused((value) => !value)} className="rounded-full bg-black/25 p-2" aria-label={paused ? "Resume Moment" : "Pause Moment"}>{paused ? <Play size={17} /> : <Pause size={17} />}</button>
          {ownStory && <button type="button" onClick={() => { setPaused(true); setConfirmDelete(true); }} className="rounded-full bg-black/25 p-2" aria-label="Delete Moment"><Trash2 size={16} /></button>}
          <button type="button" onClick={onClose} className="rounded-full bg-black/25 p-2" aria-label="Close"><X size={19} /></button>
        </div>
      </div>

      <div className={`relative flex min-h-0 flex-1 items-center justify-center overflow-hidden sm:min-h-[620px] sm:flex-none sm:rounded-2xl ${story.media_url ? "bg-black" : backgroundClass}`} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ touchAction: "pan-y" }}>
        {story.media_url ? <img src={story.media_url} alt="" className="max-h-screen h-full w-full object-contain sm:max-h-[72vh]" /> : <div className={`absolute inset-0 ${backgroundClass}`} />}
        {story.media_url && <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/60" />}
        {text && <div className={`absolute inset-x-5 z-20 flex justify-center ${story.media_url ? "bottom-24" : "inset-y-24 items-center"}`}><p className={`max-w-[92%] whitespace-pre-wrap text-center font-semibold leading-tight text-white drop-shadow-lg ${story.media_url ? "rounded-2xl bg-black/25 px-4 py-3 text-lg backdrop-blur-[2px]" : "text-3xl sm:text-4xl"}`}>{text}</p></div>}
        {story.music_url && <div className="absolute bottom-4 left-1/2 z-30 w-[88%] -translate-x-1/2 rounded-2xl bg-black/45 px-3 py-2 text-white backdrop-blur-md" onClick={(event) => event.stopPropagation()}>
          <div className="mb-1 flex items-center gap-2 text-[11px]"><Music2 size={13} /><div className="min-w-0"><p className="truncate font-semibold">{story.music_title || "Moment music"}</p>{story.music_creator && <p className="truncate text-[10px] text-white/60">{story.music_creator}</p>}</div></div>
          <audio ref={audioRef} key={`${story.id}:${story.music_url}`} src={story.music_url} autoPlay loop controls playsInline className="h-8 w-full" />
        </div>}
        <button type="button" onClick={prev} disabled={index === 0} className="absolute inset-y-0 left-0 z-10 w-1/3 disabled:cursor-default" aria-label="Previous Moment" />
        <button type="button" onClick={next} className="absolute inset-y-0 right-0 z-10 w-1/3" aria-label="Next Moment" />
        {paused && !confirmDelete && !viewersOpen && <button type="button" onClick={() => setPaused(false)} className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/45 p-4 text-white" aria-label="Resume Moment"><Play size={28} /></button>}
      </div>

      {viewersOpen && <div className="fixed inset-x-0 bottom-0 z-[120] max-h-[60dvh] overflow-hidden rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] text-ink shadow-2xl sm:absolute sm:inset-x-3 sm:bottom-4 sm:rounded-2xl sm:pb-0"><div className="flex items-center justify-between border-b border-paper-dim px-4 py-3"><div><p className="font-semibold">Moment viewers</p><p className="text-xs text-ink-faint">People who allow story-view visibility.</p></div><button type="button" onClick={() => { setViewersOpen(false); setPaused(false); }} className="rounded-full p-2 hover:bg-paper-dim" aria-label="Close viewers"><X size={17} /></button></div><div className="max-h-[42vh] overflow-y-auto p-2">{viewersLoading && <p className="p-3 text-sm text-ink-light">Loading viewers…</p>}{!viewersLoading && viewers?.length === 0 && <p className="p-3 text-sm text-ink-light">No visible viewers yet.</p>}{viewers?.map((viewer) => <div key={viewer.viewerId} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-paper">{viewer.avatarUrl ? <img src={viewer.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-trust-light text-xs font-semibold text-trust-dark">{(viewer.fullName ?? "?").charAt(0).toUpperCase()}</div>}<div className="min-w-0"><p className="truncate text-sm font-medium">{viewer.fullName ?? "POSSARA member"}</p>{viewer.username && <p className="truncate text-xs text-ink-faint">@{viewer.username}</p>}</div></div>)}</div></div>}
      {confirmDelete && <div className="fixed inset-x-0 bottom-0 z-[120] rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-sm text-ink shadow-xl sm:absolute sm:inset-x-4 sm:bottom-5 sm:rounded-2xl"><p className="font-medium">Delete this Moment?</p><p className="mt-1 text-xs text-ink-light">This cannot be undone.</p><div className="mt-3 flex gap-3"><button type="button" onClick={removeCurrent} disabled={deleteStory.isPending} className="rounded-full bg-flag px-4 py-2 font-medium text-white">{deleteStory.isPending ? "Deleting…" : "Delete"}</button><button type="button" onClick={() => { setConfirmDelete(false); setPaused(false); }} className="rounded-full bg-paper-dim px-4 py-2">Cancel</button></div></div>}
    </div>
  </div>;
}

export function StoriesBar({ showHeaderAction = false }: { showHeaderAction?: boolean }) {
  const { userId } = useAuth();
  const { data: groups, refetch: refetchStories } = useActiveStories();
  const postStory = usePostStory();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const [viewingGroup, setViewingGroup] = useState<AuthorWithStories | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [musicPickerOpen, setMusicPickerOpen] = useState(false);
  const [mode, setMode] = useState<"photo" | "text">("photo");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedImageIndex,setSelectedImageIndex]=useState(0);
  const [textBody, setTextBody] = useState("");
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicPreview, setMusicPreview] = useState<string | null>(null);
  const [musicTitle, setMusicTitle] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<MusicLibraryTrack | null>(null);
  const [audience, setAudience] = useState<"public" | "followers">("public");
  const [backgroundStyle, setBackgroundStyle] = useState<MomentBackground>("midnight");
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const otherGroups = groups?.filter((group) => group.authorId !== userId) ?? [];
  const myGroup = groups?.find((group) => group.authorId === userId);

  function clearMusic() { if (musicPreview) URL.revokeObjectURL(musicPreview); setMusicFile(null); setMusicPreview(null); setMusicTitle(""); setSelectedTrack(null); }
  function clearImages() { imagePreviews.forEach((preview)=>URL.revokeObjectURL(preview)); setImageFiles([]); setImagePreviews([]); setSelectedImageIndex(0); }
  function resetComposer() { clearImages(); if (musicPreview) URL.revokeObjectURL(musicPreview); setMode("photo"); setTextBody(""); setMusicFile(null); setMusicPreview(null); setMusicTitle(""); setSelectedTrack(null); setMusicPickerOpen(false); setAudience("public"); setBackgroundStyle("midnight"); setUploadError(null); }
  function openComposer() { resetComposer(); setComposerOpen(true); }
  function closeComposer() { if (postStory.isPending) return; resetComposer(); setComposerOpen(false); }
  function chooseImages(event: React.ChangeEvent<HTMLInputElement>) {
    const picked=Array.from(event.target.files??[]);
    event.target.value="";
    if(!picked.length)return;
    const valid=picked.filter((file)=>file.type.match(/^image\/(jpeg|png|webp)$/)&&file.size<=8*1024*1024);
    const rejected=picked.length-valid.length;
    const remaining=Math.max(0,10-imageFiles.length);
    const accepted=valid.slice(0,remaining);
    if(accepted.length){
      const previews=accepted.map((file)=>URL.createObjectURL(file));
      setMode("photo");
      setImageFiles((current)=>[...current,...accepted]);
      setImagePreviews((current)=>[...current,...previews]);
      if(!imageFiles.length)setSelectedImageIndex(0);
    }
    if(rejected)setUploadError("Some photos were skipped. Use JPG, PNG or WebP images up to 8 MB each.");
    else if(valid.length>remaining)setUploadError("You can publish up to 10 photos in one Moment batch.");
    else setUploadError(null);
  }
  function removeImage(index:number) {
    setImagePreviews((current)=>{const preview=current[index];if(preview)URL.revokeObjectURL(preview);return current.filter((_,itemIndex)=>itemIndex!==index);});
    setImageFiles((current)=>current.filter((_,itemIndex)=>itemIndex!==index));
    setSelectedImageIndex((current)=>Math.max(0,Math.min(current,imagePreviews.length-2)));
    setUploadError(null);
  }
  function chooseMusic(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; clearMusic(); setMusicFile(file); setMusicPreview(URL.createObjectURL(file)); setMusicTitle(file.name.replace(/\.[^.]+$/, "")); setUploadError(null); event.target.value = ""; }
  function chooseLibraryTrack(track: MusicLibraryTrack) { if (musicPreview) URL.revokeObjectURL(musicPreview); setMusicFile(null); setMusicPreview(null); setSelectedTrack(track); setMusicTitle(track.title); setUploadError(null); }

  async function publishMoment() {
    setUploadError(null);
    if (mode === "photo" && !imageFiles.length) { setUploadError("Choose at least one photo, or switch to Text Moment."); return; }
    if (mode === "text" && !textBody.trim()) { setUploadError("Write something for your text Moment."); return; }
    const momentCount=mode==="photo"?imageFiles.length:1;
    setUploadMessage(momentCount>1?`Publishing ${momentCount} Moments…`:"Publishing Moment…");
    try {
      await postStory.mutateAsync({ imageFiles: mode === "photo" ? imageFiles : [], textBody, musicFile, musicTitle, musicTrackKey: selectedTrack?.trackKey ?? null, musicTrackCreator: selectedTrack?.creator ?? null, audience, backgroundStyle });
      const fresh = await refetchStories();
      const ownFreshGroup = fresh.data?.find((group) => group.authorId === userId) ?? null;
      setUploadMessage(momentCount>1?`${momentCount} Moments published.`:"Moment published."); resetComposer(); setComposerOpen(false);
      if (ownFreshGroup) setViewingGroup(ownFreshGroup);
      window.setTimeout(() => setUploadMessage(null), 3000);
    } catch (error) { setUploadMessage(null); setUploadError((error as Error).message); }
  }

  const currentImagePreview=imagePreviews[selectedImageIndex]??null;

  if (!userId && otherGroups.length === 0) return null;

  return <div>
    <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
      {userId && <button type="button" onClick={openComposer} className="flex shrink-0 flex-col items-center gap-1" aria-label="Create a new Moment"><span className="moment-ring moment-ring-add flex h-14 w-14 items-center justify-center rounded-full"><Plus size={21} className="text-brand" /></span><span className="text-[11px] font-medium text-brand-dark">{showHeaderAction ? "Your Moment" : "Add Moment"}</span></button>}
      {userId && myGroup && <button type="button" onClick={() => setViewingGroup(myGroup)} className="flex shrink-0 flex-col items-center gap-1" aria-label="View your Moments"><span className="moment-ring h-14 w-14 rounded-full p-[3px]">{myGroup.stories[0]?.media_url ? <img src={myGroup.stories[0].media_url} alt="" className="h-full w-full rounded-full object-cover"/> : <span className="flex h-full w-full items-center justify-center rounded-full bg-paper text-sm font-medium text-trust-dark">You</span>}</span><span className="text-[11px] text-ink-light">Your Moment</span></button>}
      {otherGroups.map((group) => <button key={group.authorId} type="button" onClick={() => setViewingGroup(group)} className="flex shrink-0 flex-col items-center gap-1"><div className="moment-ring h-14 w-14 rounded-full p-[3px]"><div className="h-full w-full rounded-full bg-paper p-0.5">{group.author?.avatar_url ? <img src={group.author.avatar_url} alt="" className="h-full w-full rounded-full object-cover" /> : <div className="flex h-full w-full items-center justify-center rounded-full bg-trust-light text-sm font-medium text-trust-dark">{(group.author?.full_name ?? "?").charAt(0).toUpperCase()}</div>}</div></div><span className="max-w-[60px] truncate text-[11px] text-ink-light">{group.author?.full_name?.split(" ")[0] ?? "Member"}</span></button>)}
    </div>
    {uploadMessage && <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-trust-dark">{!postStory.isPending && <CheckCircle2 size={14} />}<span>{uploadMessage}</span></div>}
    {!composerOpen && uploadError && <p className="mt-2 text-xs text-flag">{uploadError}</p>}
    {viewingGroup && <StoryViewer group={viewingGroup} onClose={() => setViewingGroup(null)} />}

    {composerOpen && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/70 sm:items-center sm:p-4" onClick={closeComposer}>
      <div className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Create Moment">
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Create Moment</p><h2 className="text-xl font-semibold">Share for the next 24 hours</h2><p className="mt-1 text-xs text-ink-faint">Choose up to 10 photos to publish as a Moment sequence, or share a text Moment. Caption and music apply to the selected sequence.</p></div><button type="button" onClick={closeComposer} disabled={postStory.isPending} className="rounded-full p-2 hover:bg-paper-dim" aria-label="Close Moment composer"><X size={19} /></button></div>
        <div className="mt-4 grid grid-cols-2 rounded-2xl bg-paper-dim p-1"><button type="button" onClick={() => setMode("photo")} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${mode === "photo" ? "bg-white text-ink shadow-sm" : "text-ink-light"}`}><ImageIcon size={16} />Photos</button><button type="button" onClick={() => setMode("text")} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${mode === "text" ? "bg-white text-ink shadow-sm" : "text-ink-light"}`}><Type size={16} />Text</button></div>
        <div className={`relative mt-4 aspect-[9/12] overflow-hidden rounded-2xl ${mode === "text" || !currentImagePreview ? BACKGROUNDS[backgroundStyle] : "bg-black"}`}>{mode === "photo" && currentImagePreview && <img src={currentImagePreview} alt="Moment preview" className="h-full w-full object-cover" />}{mode === "photo" && currentImagePreview && <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/45" />}{mode === "photo" && !currentImagePreview && <button type="button" onClick={() => imageInputRef.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/90"><div className="rounded-full bg-white/15 p-4"><Upload size={24} /></div><span className="text-sm font-semibold">Choose photos</span><span className="text-xs text-white/65">Up to 10 · JPG, PNG or WebP · max 8 MB each</span></button>}{textBody.trim() && <div className={`absolute inset-x-5 flex justify-center ${mode === "text" ? "inset-y-10 items-center" : "bottom-8"}`}><p className={`whitespace-pre-wrap text-center font-semibold leading-tight text-white drop-shadow-lg ${mode === "text" ? "text-3xl" : "rounded-xl bg-black/25 px-3 py-2 text-lg"}`}>{textBody}</p></div>}{!textBody.trim() && mode === "text" && <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-2xl font-semibold text-white/55">Your text will appear here</div>}{mode==="photo"&&imagePreviews.length>1&&<span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white">{selectedImageIndex+1} / {imagePreviews.length}</span>}</div>
        <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={chooseImages} className="hidden" />
        <input ref={musicInputRef} type="file" accept="audio/mpeg,audio/mp4,audio/webm,audio/ogg,audio/wav,audio/x-m4a,.mp3,.m4a,.mp4,.webm,.ogg,.oga,.wav" onChange={chooseMusic} className="hidden" />
        {mode === "photo" && imagePreviews.length>0 && <div className="mt-2"><div className="mb-2 flex items-center justify-between gap-3"><button type="button" onClick={() => imageInputRef.current?.click()} className="text-xs font-semibold text-brand-dark">Add more photos</button><span className="text-[11px] text-ink-faint">{imagePreviews.length}/10 selected</span></div><div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">{imagePreviews.map((preview,index)=><div key={preview} className="relative shrink-0"><button type="button" onClick={()=>setSelectedImageIndex(index)} className={`h-16 w-12 overflow-hidden rounded-lg border-2 ${selectedImageIndex===index?"border-brand":"border-transparent"}`} aria-label={`Preview photo ${index+1}`}><img src={preview} alt="" className="h-full w-full object-cover"/></button><button type="button" onClick={()=>removeImage(index)} className="absolute -right-1.5 -top-1.5 rounded-full bg-ink p-1 text-white" aria-label={`Remove photo ${index+1}`}><X size={11}/></button></div>)}</div></div>}
        <label className="mt-4 block text-sm font-medium text-ink">{mode === "photo" ? (imageFiles.length>1 ? "Caption for this sequence (optional)" : "Text / caption (optional)") : "Moment text"}<textarea rows={4} maxLength={700} value={textBody} onChange={(event) => setTextBody(event.target.value)} placeholder={mode === "photo" ? "Say something about this moment…" : "What do you want to share?"} className="mt-1.5 w-full resize-none rounded-2xl border border-ink-faint/25 px-3 py-3 text-sm outline-none focus:border-brand" /><span className="mt-1 block text-right text-[11px] text-ink-faint">{textBody.length}/700</span></label>
        <div className="mt-4"><p className="text-sm font-medium text-ink">Background</p><div className="mt-2 flex flex-wrap gap-2">{BACKGROUND_OPTIONS.map((option) => <button key={option.value} type="button" onClick={() => setBackgroundStyle(option.value)} className={`h-9 w-9 rounded-full border-2 ${BACKGROUNDS[option.value]} ${backgroundStyle === option.value ? "border-ink ring-2 ring-brand/25" : "border-white shadow"}`} aria-label={option.label} title={option.label} />)}</div></div>

        <div className="mt-4 rounded-2xl border border-paper-dim bg-paper/50 p-3">
          <div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-1.5 text-sm font-medium text-ink"><Music2 size={15}/>Music <span className="font-normal text-ink-faint">optional</span></p><p className="mt-1 text-xs leading-5 text-ink-faint">Choose a POSSARA Original / approved reusable track, or upload audio you have permission to use.</p></div></div>
          <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setMusicPickerOpen(true)} className="rounded-xl bg-ink px-3 py-2.5 text-xs font-semibold text-white">Browse POSSARA Music</button><button type="button" onClick={() => musicInputRef.current?.click()} className="rounded-xl border border-ink-faint/25 bg-white px-3 py-2.5 text-xs font-semibold">Upload my audio</button></div>
          {selectedTrack && <div className="mt-3 rounded-xl bg-white p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{selectedTrack.title}</p><p className="truncate text-xs text-ink-light">{selectedTrack.creator} · {selectedTrack.category}</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{selectedTrack.rightsLabel}</p></div><button type="button" onClick={clearMusic} className="text-xs font-medium text-flag">Remove</button></div><audio src={selectedTrack.audioUrl} controls loop preload="metadata" className="mt-2 h-9 w-full"/></div>}
          {musicFile && <div className="mt-3 space-y-2 rounded-xl bg-white p-2.5"><div className="flex items-center gap-2"><audio src={musicPreview ?? undefined} controls preload="metadata" className="h-9 min-w-0 flex-1"/><button type="button" onClick={clearMusic} className="rounded-xl px-3 py-2 text-xs font-medium text-flag">Remove</button></div><input value={musicTitle} onChange={(event) => setMusicTitle(event.target.value)} maxLength={120} placeholder="Music title" className="w-full rounded-xl border border-ink-faint/20 bg-white px-3 py-2 text-xs outline-none focus:border-brand" /></div>}
        </div>

        <label className="mt-4 block text-sm font-medium text-ink">Who can see it?<select value={audience} onChange={(event) => setAudience(event.target.value as "public" | "followers")} className="mt-1.5 w-full rounded-xl border border-ink-faint/25 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"><option value="public">Everyone on POSSARA</option><option value="followers">Followers only</option></select></label>
        {uploadError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-flag">{uploadError}</p>}
        <button type="button" onClick={publishMoment} disabled={postStory.isPending} className="mt-5 w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{postStory.isPending ? "Publishing…" : mode==="photo"&&imageFiles.length>1 ? `Post ${imageFiles.length} Moments` : "Post Moment"}</button>
      </div>
    </div>}
    {musicPickerOpen && <MusicPicker selectedTrackKey={selectedTrack?.trackKey} onSelect={chooseLibraryTrack} onClose={() => setMusicPickerOpen(false)}/>} 
  </div>;
}
