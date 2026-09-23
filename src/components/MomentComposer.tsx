import { useActiveOrganizationIdentity } from "../hooks/useActiveOrganizationIdentity";
import { useMyOrganizations } from "../hooks/useHiring";
import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Music2, Type, Upload, X } from "lucide-react";
import { usePostStory } from "../hooks/useStories";
import { useAuth } from "../store/auth";
import { MusicPicker } from "./MusicPicker";
import type { MomentBackground } from "../hooks/useStories";
import type { MusicLibraryTrack } from "../hooks/useMusicLibrary";
import { BACKGROUNDS, BACKGROUND_OPTIONS } from "../lib/momentStyles";

export function MomentComposer({ onPublished, onCancel, organizationId }: { organizationId?: string; onPublished: () => void; onCancel: () => void }) {
  const { userId } = useAuth();
  const postStory = usePostStory();
  const activeOrganization = useActiveOrganizationIdentity();
  const {data: memberships,isLoading:organizationsLoading} = useMyOrganizations();
  const targetId = organizationId || activeOrganization?.id;
  const organization = memberships?.map((row:any)=>row.organizations).find((org:any)=>org?.id===targetId);
  const identityUnavailable = !!targetId && !organization;
  const imageInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
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
  const [hydratedDraftKey, setHydratedDraftKey] = useState<string | null>(null);
  const previewUrls = useRef(new Set<string>());
  useEffect(() => {
    const urls = previewUrls.current;
    return () => { urls.forEach((url) => URL.revokeObjectURL(url)); };
  }, []);
  function createPreview(file: File) {
    const url = URL.createObjectURL(file);
    previewUrls.current.add(url);
    return url;
  }
  const momentDraftKey = userId ? `possara-moment-draft:${userId}:${targetId || "personal"}` : null;

  useEffect(() => {
    if (!momentDraftKey) return;
    try {
      const raw = localStorage.getItem(momentDraftKey);
      if (raw) {
        const draft = JSON.parse(raw) as { mode?: "photo" | "text"; textBody?: string; musicTitle?: string; audience?: "public" | "followers"; backgroundStyle?: MomentBackground };
        if (draft.mode) setMode(draft.mode);
        if (typeof draft.textBody === "string") setTextBody(draft.textBody);
        if (typeof draft.musicTitle === "string") setMusicTitle(draft.musicTitle);
        if (draft.audience) setAudience(draft.audience);
        if (draft.backgroundStyle) setBackgroundStyle(draft.backgroundStyle);
      }
    } catch {
      localStorage.removeItem(momentDraftKey);
    }
    setHydratedDraftKey(momentDraftKey);
  }, [momentDraftKey]);

  useEffect(() => {
    if (!momentDraftKey || hydratedDraftKey !== momentDraftKey) return;
    localStorage.setItem(momentDraftKey, JSON.stringify({ mode, textBody, musicTitle, audience, backgroundStyle }));
  }, [momentDraftKey, hydratedDraftKey, mode, textBody, musicTitle, audience, backgroundStyle]);

  function clearMusic() { if (musicPreview) URL.revokeObjectURL(musicPreview); setMusicFile(null); setMusicPreview(null); setMusicTitle(""); setSelectedTrack(null); }
  function clearImages() { imagePreviews.forEach((preview)=>URL.revokeObjectURL(preview)); setImageFiles([]); setImagePreviews([]); setSelectedImageIndex(0); }
  function resetComposer(clearDraft = false) { clearImages(); if (musicPreview) URL.revokeObjectURL(musicPreview); setMode("photo"); setTextBody(""); setMusicFile(null); setMusicPreview(null); setMusicTitle(""); setSelectedTrack(null); setMusicPickerOpen(false); setAudience("public"); setBackgroundStyle("midnight"); setUploadError(null); if (clearDraft && momentDraftKey) localStorage.removeItem(momentDraftKey); }
  function closeComposer() { if (!postStory.isPending) onCancel(); }
  function chooseImages(event: React.ChangeEvent<HTMLInputElement>) {
    const picked=Array.from(event.target.files??[]);
    event.target.value="";
    if(!picked.length)return;
    const valid=picked.filter((file)=>file.type.match(/^image\/(jpeg|png|webp)$/)&&file.size<=8*1024*1024);
    const rejected=picked.length-valid.length;
    const remaining=Math.max(0,10-imageFiles.length);
    const accepted=valid.slice(0,remaining);
    if(accepted.length){
      const previews=accepted.map(createPreview);
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
    if(identityUnavailable){setUploadError("You do not have permission to publish for this organization.");return;}
    if(identityUnavailable){setUploadError("You do not have permission to publish for this organization.");return;}
    if (mode === "photo" && !imageFiles.length) { setUploadError("Choose at least one photo, or switch to Text Moment."); return; }
    if (mode === "text" && !textBody.trim()) { setUploadError("Write something for your text Moment."); return; }
    const momentCount=mode==="photo"?imageFiles.length:1;
    setUploadMessage(momentCount>1?`Publishing ${momentCount} Moments…`:"Publishing Moment…");
    try {
      await postStory.mutateAsync({ organizationId:targetId, imageFiles: mode === "photo" ? imageFiles : [], textBody, musicFile, musicTitle, musicTrackKey: selectedTrack?.trackKey ?? null, musicTrackCreator: selectedTrack?.creator ?? null, audience, backgroundStyle });
      resetComposer(true);
      onPublished();
    } catch (error) { setUploadMessage(null); setUploadError((error as Error).message); }
  }

  const currentImagePreview=imagePreviews[selectedImageIndex]??null;

  return <>
    <section className="rounded-2xl border border-paper-dim bg-white p-4 sm:p-5" aria-label="Create Moment">
        <p className="mb-3 rounded-xl bg-paper p-3 text-sm font-semibold">{organizationsLoading?"Loading publishing identity?":identityUnavailable?"Organization access unavailable":"Publishing as " + (organization?.name || "your personal profile")}</p>
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Create Moment</p><h2 className="text-xl font-semibold">Share for the next 24 hours</h2><p className="mt-1 text-xs text-ink-faint">Choose up to 10 photos to publish as a Moment sequence, or share a text Moment. Caption and music apply to the selected sequence.</p></div><button type="button" onClick={closeComposer} disabled={postStory.isPending||organizationsLoading||identityUnavailable} className="rounded-full p-2 hover:bg-paper-dim" aria-label="Close Moment composer"><X size={19} /></button></div>
        <div className="mt-4 grid grid-cols-2 rounded-2xl bg-paper-dim p-1"><button type="button" onClick={() => setMode("photo")} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${mode === "photo" ? "bg-white text-ink shadow-sm" : "text-ink-light"}`}><ImageIcon size={16} />Photos</button><button type="button" onClick={() => setMode("text")} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${mode === "text" ? "bg-white text-ink shadow-sm" : "text-ink-light"}`}><Type size={16} />Text</button></div>
        <div className={`moment-composer-preview relative mt-4 aspect-[9/12] overflow-hidden rounded-2xl ${mode === "text" || !currentImagePreview ? BACKGROUNDS[backgroundStyle] : "bg-black"}`}>{mode === "photo" && currentImagePreview && <img src={currentImagePreview} alt="Moment preview" className="h-full w-full object-cover" />}{mode === "photo" && currentImagePreview && <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/45" />}{mode === "photo" && !currentImagePreview && <button type="button" onClick={() => imageInputRef.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/90"><div className="rounded-full bg-white/15 p-4"><Upload size={24} /></div><span className="text-sm font-semibold">Choose photos</span><span className="text-xs text-white/65">Up to 10 · JPG, PNG or WebP · max 8 MB each</span></button>}{textBody.trim() && <div className={`absolute inset-x-5 flex justify-center ${mode === "text" ? "inset-y-10 items-center" : "bottom-8"}`}><p className={`whitespace-pre-wrap text-center font-semibold leading-tight text-white drop-shadow-lg ${mode === "text" ? "text-3xl" : "rounded-xl bg-black/25 px-3 py-2 text-lg"}`}>{textBody}</p></div>}{!textBody.trim() && mode === "text" && <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-2xl font-semibold text-white/55">Your text will appear here</div>}{mode==="photo"&&imagePreviews.length>1&&<span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white">{selectedImageIndex+1} / {imagePreviews.length}</span>}</div>
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
      {uploadMessage && <p role="status" className="mt-3 text-sm text-ink-light">{uploadMessage}</p>}
    </section>
    {musicPickerOpen && <MusicPicker selectedTrackKey={selectedTrack?.trackKey} onSelect={chooseLibraryTrack} onClose={() => setMusicPickerOpen(false)} />}
  </>;
}
