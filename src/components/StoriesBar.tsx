import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Eye, Image as ImageIcon, Music2, Pause, Play, Plus, Trash2, Type, Upload, X } from "lucide-react";
import { useActiveStories, useDeleteStory, usePostStory } from "../hooks/useStories";
import { useRecordStoryView, useStoryViewers } from "../hooks/useStoryViews";
import { useAuth } from "../store/auth";
import type { AuthorWithStories, MomentBackground } from "../hooks/useStories";

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
  { value: "midnight", label: "Midnight" },
  { value: "plum", label: "Plum" },
  { value: "sunset", label: "Sunset" },
  { value: "ocean", label: "Ocean" },
  { value: "emerald", label: "Emerald" },
  { value: "gold", label: "Gold" },
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
  const story = group.stories[index];
  const ownStory = userId === story.author_id;
  const { data: viewers, isLoading: viewersLoading } = useStoryViewers(story.id, ownStory);

  function next() {
    setConfirmDelete(false);
    setViewersOpen(false);
    setProgress(0);
    if (index < group.stories.length - 1) setIndex((value) => value + 1);
    else onClose();
  }

  function prev() {
    setConfirmDelete(false);
    setViewersOpen(false);
    setProgress(0);
    if (index > 0) setIndex((value) => value - 1);
  }

  useEffect(() => {
    setProgress(0);
    setPaused(false);
    setViewersOpen(false);
  }, [index, group.authorId]);

  useEffect(() => {
    if (!userId || ownStory) return;
    recordView.mutate({ storyId: story.id, authorId: story.author_id });
  }, [story.id, story.author_id, userId, ownStory]);

  useEffect(() => {
    if (paused || confirmDelete || viewersOpen) return;
    const start = Date.now() - (progress / 100) * STORY_DURATION;
    const timer = window.setInterval(() => {
      const nextProgress = Math.min(100, ((Date.now() - start) / STORY_DURATION) * 100);
      setProgress(nextProgress);
      if (nextProgress >= 100) {
        window.clearInterval(timer);
        next();
      }
    }, 80);
    return () => window.clearInterval(timer);
  }, [paused, confirmDelete, viewersOpen, index]);

  async function removeCurrent() {
    try {
      await deleteStory.mutateAsync(story);
      onClose();
    } catch {
      // React Query exposes the mutation error and keeps the viewer open.
    }
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy) * 1.15) return;
    if (dx < 0) next();
    else prev();
  }

  const text = story.text_body?.trim() || story.caption?.trim() || "";
  const backgroundClass = BACKGROUNDS[story.background_style] ?? BACKGROUNDS.midnight;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 sm:px-4">
      <div className="relative flex h-full w-full max-w-sm flex-col justify-center sm:h-auto">
        <div className="absolute left-0 right-0 top-0 z-30 p-3 sm:static sm:p-0">
          <div className="mb-2 flex gap-1">
            {group.stories.map((item, itemIndex) => (
              <div key={item.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                <div className="h-full bg-white transition-[width] duration-75" style={{ width: itemIndex < index ? "100%" : itemIndex === index ? `${progress}%` : "0%" }} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-white">
            {group.author?.avatar_url ? <img src={group.author.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs">{(group.author?.full_name ?? "?").charAt(0).toUpperCase()}</div>}
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{group.author?.full_name ?? "Member"}</span>
            {ownStory && <button type="button" onClick={() => { setPaused(true); setViewersOpen(true); }} className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-2 text-xs" aria-label="View Moment viewers"><Eye size={16} /><span>{viewers?.length ?? 0}</span></button>}
            <button type="button" onClick={() => setPaused((value) => !value)} className="rounded-full bg-black/25 p-2" aria-label={paused ? "Resume Moment" : "Pause Moment"}>{paused ? <Play size={17} /> : <Pause size={17} />}</button>
            {ownStory && <button type="button" onClick={() => { setPaused(true); setConfirmDelete(true); }} className="rounded-full bg-black/25 p-2" aria-label="Delete Moment"><Trash2 size={16} /></button>}
            <button type="button" onClick={onClose} className="rounded-full bg-black/25 p-2" aria-label="Close"><X size={19} /></button>
          </div>
        </div>

        <div
          className={`relative flex min-h-0 flex-1 items-center justify-center overflow-hidden sm:min-h-[620px] sm:flex-none sm:rounded-2xl ${story.media_url ? "bg-black" : backgroundClass}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: "pan-y" }}
        >
          {story.media_url ? <img src={story.media_url} alt="" className="max-h-screen h-full w-full object-contain sm:max-h-[72vh]" /> : <div className={`absolute inset-0 ${backgroundClass}`} />}
          {story.media_url && <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/60" />}

          {text && (
            <div className={`absolute inset-x-5 z-20 flex justify-center ${story.media_url ? "bottom-20" : "inset-y-24 items-center"}`}>
              <p className={`max-w-[92%] whitespace-pre-wrap text-center font-semibold leading-tight text-white drop-shadow-lg ${story.media_url ? "rounded-2xl bg-black/25 px-4 py-3 text-lg backdrop-blur-[2px]" : "text-3xl sm:text-4xl"}`}>{text}</p>
            </div>
          )}

          {story.music_url && (
            <div className="absolute bottom-4 left-1/2 z-30 w-[88%] -translate-x-1/2 rounded-2xl bg-black/45 px-3 py-2 text-white backdrop-blur-md" onClick={(event) => event.stopPropagation()}>
              <div className="mb-1 flex items-center gap-2 text-[11px] font-medium"><Music2 size={13} /><span className="truncate">{story.music_title || "Moment music"}</span></div>
              <audio key={story.music_url} src={story.music_url} autoPlay loop controls playsInline className="h-8 w-full" />
            </div>
          )}

          <button type="button" onClick={prev} disabled={index === 0} className="absolute inset-y-0 left-0 z-10 w-1/3 disabled:cursor-default" aria-label="Previous Moment" />
          <button type="button" onClick={next} className="absolute inset-y-0 right-0 z-10 w-1/3" aria-label="Next Moment" />
          {paused && !confirmDelete && !viewersOpen && <button type="button" onClick={() => setPaused(false)} className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/45 p-4 text-white" aria-label="Resume Moment"><Play size={28} /></button>}
        </div>

        {viewersOpen && <div className="absolute inset-x-3 bottom-4 z-40 max-h-[55vh] overflow-hidden rounded-2xl bg-white text-ink shadow-2xl">
          <div className="flex items-center justify-between border-b border-paper-dim px-4 py-3"><div><p className="font-semibold">Moment viewers</p><p className="text-xs text-ink-faint">People who allow story-view visibility.</p></div><button type="button" onClick={() => { setViewersOpen(false); setPaused(false); }} className="rounded-full p-2 hover:bg-paper-dim" aria-label="Close viewers"><X size={17} /></button></div>
          <div className="max-h-[42vh] overflow-y-auto p-2">
            {viewersLoading && <p className="p-3 text-sm text-ink-light">Loading viewers…</p>}
            {!viewersLoading && viewers?.length === 0 && <p className="p-3 text-sm text-ink-light">No visible viewers yet.</p>}
            {viewers?.map((viewer) => <div key={viewer.viewerId} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-paper">{viewer.avatarUrl ? <img src={viewer.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-trust-light text-xs font-semibold text-trust-dark">{(viewer.fullName ?? "?").charAt(0).toUpperCase()}</div>}<div className="min-w-0"><p className="truncate text-sm font-medium">{viewer.fullName ?? "POSSARA member"}</p>{viewer.username && <p className="truncate text-xs text-ink-faint">@{viewer.username}</p>}</div></div>)}
          </div>
        </div>}

        {confirmDelete && <div className="absolute inset-x-4 bottom-5 z-40 rounded-2xl bg-white p-4 text-sm text-ink shadow-xl"><p className="font-medium">Delete this Moment?</p><p className="mt-1 text-xs text-ink-light">This cannot be undone.</p><div className="mt-3 flex gap-3"><button type="button" onClick={removeCurrent} disabled={deleteStory.isPending} className="rounded-full bg-flag px-4 py-2 font-medium text-white">{deleteStory.isPending ? "Deleting…" : "Delete"}</button><button type="button" onClick={() => { setConfirmDelete(false); setPaused(false); }} className="rounded-full bg-paper-dim px-4 py-2">Cancel</button></div></div>}
      </div>
    </div>
  );
}

export function StoriesBar() {
  const { userId } = useAuth();
  const { data: groups } = useActiveStories();
  const postStory = usePostStory();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const [viewingGroup, setViewingGroup] = useState<AuthorWithStories | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [mode, setMode] = useState<"photo" | "text">("photo");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [textBody, setTextBody] = useState("");
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicPreview, setMusicPreview] = useState<string | null>(null);
  const [musicTitle, setMusicTitle] = useState("");
  const [audience, setAudience] = useState<"public" | "followers">("public");
  const [backgroundStyle, setBackgroundStyle] = useState<MomentBackground>("midnight");
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const otherGroups = groups?.filter((group) => group.authorId !== userId) ?? [];
  const myGroup = groups?.find((group) => group.authorId === userId);

  function clearMusic() {
    if (musicPreview) URL.revokeObjectURL(musicPreview);
    setMusicFile(null);
    setMusicPreview(null);
    setMusicTitle("");
  }

  function resetComposer() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    if (musicPreview) URL.revokeObjectURL(musicPreview);
    setMode("photo");
    setImageFile(null);
    setImagePreview(null);
    setTextBody("");
    setMusicFile(null);
    setMusicPreview(null);
    setMusicTitle("");
    setAudience("public");
    setBackgroundStyle("midnight");
    setUploadError(null);
  }

  function openComposer() {
    resetComposer();
    setComposerOpen(true);
  }

  function closeComposer() {
    if (postStory.isPending) return;
    resetComposer();
    setComposerOpen(false);
  }

  function chooseImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setMode("photo");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setUploadError(null);
    event.target.value = "";
  }

  function chooseMusic(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (musicPreview) URL.revokeObjectURL(musicPreview);
    setMusicFile(file);
    setMusicPreview(URL.createObjectURL(file));
    setMusicTitle(file.name.replace(/\.[^.]+$/, ""));
    setUploadError(null);
    event.target.value = "";
  }

  async function publishMoment() {
    setUploadError(null);
    if (mode === "photo" && !imageFile) {
      setUploadError("Choose a photo, or switch to Text Moment.");
      return;
    }
    if (mode === "text" && !textBody.trim()) {
      setUploadError("Write something for your text Moment.");
      return;
    }

    setUploadMessage("Publishing Moment…");
    try {
      await postStory.mutateAsync({
        imageFile: mode === "photo" ? imageFile : null,
        textBody,
        musicFile,
        musicTitle,
        audience,
        backgroundStyle,
      });
      setUploadMessage("Moment published.");
      resetComposer();
      setComposerOpen(false);
      window.setTimeout(() => setUploadMessage(null), 3000);
    } catch (error) {
      setUploadMessage(null);
      setUploadError((error as Error).message);
    }
  }

  if (!userId && otherGroups.length === 0) return null;

  return <div>
    <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
      {userId && <div className="flex shrink-0 flex-col items-center gap-1">
        <div className="relative h-14 w-14">
          <button type="button" onClick={() => myGroup ? setViewingGroup(myGroup) : openComposer()} className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-brand/40">
            {myGroup ? <div className="h-full w-full rounded-full border-2 border-brand p-0.5"><div className="flex h-full w-full items-center justify-center rounded-full bg-paper text-sm font-medium text-trust-dark">You</div></div> : <Plus size={20} className="text-brand" />}
          </button>
          {myGroup && <button type="button" onClick={openComposer} className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-brand text-white" aria-label="Add another Moment"><Plus size={14} /></button>}
        </div>
        <span className="text-[11px] text-ink-light">Your Moment</span>
      </div>}

      {otherGroups.map((group) => <button key={group.authorId} type="button" onClick={() => setViewingGroup(group)} className="flex shrink-0 flex-col items-center gap-1"><div className="h-14 w-14 rounded-full border-2 border-brand p-0.5"><div className="h-full w-full rounded-full bg-paper p-0.5">{group.author?.avatar_url ? <img src={group.author.avatar_url} alt="" className="h-full w-full rounded-full object-cover" /> : <div className="flex h-full w-full items-center justify-center rounded-full bg-trust-light text-sm font-medium text-trust-dark">{(group.author?.full_name ?? "?").charAt(0).toUpperCase()}</div>}</div></div><span className="max-w-[60px] truncate text-[11px] text-ink-light">{group.author?.full_name?.split(" ")[0] ?? "Member"}</span></button>)}
    </div>

    {uploadMessage && <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-trust-dark">{!postStory.isPending && <CheckCircle2 size={14} />}<span>{uploadMessage}</span></div>}
    {!composerOpen && uploadError && <p className="mt-2 text-xs text-flag">{uploadError}</p>}

    {viewingGroup && <StoryViewer group={viewingGroup} onClose={() => setViewingGroup(null)} />}

    {composerOpen && <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/70 sm:items-center sm:p-4" onClick={closeComposer}>
      <div className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Create Moment">
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Create Moment</p><h2 className="text-xl font-semibold">Share for the next 24 hours</h2><p className="mt-1 text-xs text-ink-faint">Post a photo, text, or photo with text. Music is optional.</p></div><button type="button" onClick={closeComposer} disabled={postStory.isPending} className="rounded-full p-2 hover:bg-paper-dim" aria-label="Close Moment composer"><X size={19} /></button></div>

        <div className="mt-4 grid grid-cols-2 rounded-2xl bg-paper-dim p-1">
          <button type="button" onClick={() => setMode("photo")} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${mode === "photo" ? "bg-white text-ink shadow-sm" : "text-ink-light"}`}><ImageIcon size={16} />Photo</button>
          <button type="button" onClick={() => setMode("text")} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${mode === "text" ? "bg-white text-ink shadow-sm" : "text-ink-light"}`}><Type size={16} />Text</button>
        </div>

        <div className={`relative mt-4 aspect-[9/12] overflow-hidden rounded-2xl ${mode === "text" || !imagePreview ? BACKGROUNDS[backgroundStyle] : "bg-black"}`}>
          {mode === "photo" && imagePreview && <img src={imagePreview} alt="Moment preview" className="h-full w-full object-cover" />}
          {mode === "photo" && imagePreview && <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/45" />}
          {mode === "photo" && !imagePreview && <button type="button" onClick={() => imageInputRef.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/90"><div className="rounded-full bg-white/15 p-4"><Upload size={24} /></div><span className="text-sm font-semibold">Choose a photo</span><span className="text-xs text-white/65">JPG, PNG or WebP · max 8 MB</span></button>}
          {textBody.trim() && <div className={`absolute inset-x-5 flex justify-center ${mode === "text" ? "inset-y-10 items-center" : "bottom-8"}`}><p className={`whitespace-pre-wrap text-center font-semibold leading-tight text-white drop-shadow-lg ${mode === "text" ? "text-3xl" : "rounded-xl bg-black/25 px-3 py-2 text-lg"}`}>{textBody}</p></div>}
          {!textBody.trim() && mode === "text" && <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-2xl font-semibold text-white/55">Your text will appear here</div>}
        </div>

        <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} className="hidden" />
        <input ref={musicInputRef} type="file" accept="audio/mpeg,audio/mp4,audio/webm,audio/ogg,audio/wav,audio/x-m4a,.mp3,.m4a,.mp4,.webm,.ogg,.oga,.wav" onChange={chooseMusic} className="hidden" />

        {mode === "photo" && imagePreview && <button type="button" onClick={() => imageInputRef.current?.click()} className="mt-2 text-xs font-semibold text-brand-dark">Change photo</button>}

        <label className="mt-4 block text-sm font-medium text-ink">{mode === "photo" ? "Text / caption (optional)" : "Moment text"}<textarea rows={4} maxLength={700} value={textBody} onChange={(event) => setTextBody(event.target.value)} placeholder={mode === "photo" ? "Say something about this moment…" : "What do you want to share?"} className="mt-1.5 w-full resize-none rounded-2xl border border-ink-faint/25 px-3 py-3 text-sm outline-none focus:border-brand" /><span className="mt-1 block text-right text-[11px] text-ink-faint">{textBody.length}/700</span></label>

        <div className="mt-4"><p className="text-sm font-medium text-ink">Background</p><div className="mt-2 flex flex-wrap gap-2">{BACKGROUND_OPTIONS.map((option) => <button key={option.value} type="button" onClick={() => setBackgroundStyle(option.value)} className={`h-9 w-9 rounded-full border-2 ${BACKGROUNDS[option.value]} ${backgroundStyle === option.value ? "border-ink ring-2 ring-brand/25" : "border-white shadow"}`} aria-label={option.label} title={option.label} />)}</div></div>

        <div className="mt-4 rounded-2xl border border-paper-dim bg-paper/50 p-3">
          <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="flex items-center gap-1.5 text-sm font-medium text-ink"><Music2 size={15} />Music <span className="font-normal text-ink-faint">optional</span></p>{musicFile ? <p className="mt-1 truncate text-xs text-ink-light">{musicTitle || musicFile.name}</p> : <p className="mt-1 text-xs text-ink-faint">MP3, M4A, MP4, WebM, OGG or WAV · max 3 MB</p>}</div><button type="button" onClick={() => musicInputRef.current?.click()} className="shrink-0 rounded-full border border-ink-faint/25 bg-white px-3 py-2 text-xs font-semibold">{musicFile ? "Change" : "Add music"}</button></div>
          {musicFile && <div className="mt-3 space-y-2 rounded-xl bg-white p-2.5"><div className="flex items-center gap-2"><audio src={musicPreview ?? undefined} controls preload="metadata" className="h-9 min-w-0 flex-1"/><button type="button" onClick={clearMusic} className="rounded-xl px-3 py-2 text-xs font-medium text-flag">Remove</button></div><input value={musicTitle} onChange={(event) => setMusicTitle(event.target.value)} maxLength={120} placeholder="Music title" className="w-full rounded-xl border border-ink-faint/20 bg-white px-3 py-2 text-xs outline-none focus:border-brand" /></div>}
        </div>

        <label className="mt-4 block text-sm font-medium text-ink">Who can see it?<select value={audience} onChange={(event) => setAudience(event.target.value as "public" | "followers")} className="mt-1.5 w-full rounded-xl border border-ink-faint/25 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"><option value="public">Everyone on POSSARA</option><option value="followers">Followers only</option></select></label>

        {uploadError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-flag">{uploadError}</p>}
        <button type="button" onClick={publishMoment} disabled={postStory.isPending} className="mt-5 w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{postStory.isPending ? "Publishing…" : "Post Moment"}</button>
      </div>
    </div>}
  </div>;
}
