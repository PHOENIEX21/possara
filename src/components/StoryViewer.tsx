import { OrganizationVerificationBadge } from "./OrganizationVerificationBadge";
import { useCanManageOrganization } from "../hooks/useHiring";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, Eye, Heart, LoaderCircle, MessageCircle, Music2, Pause, Play, Send, Trash2, Volume2, VolumeX, X } from "lucide-react";
import { saveImage } from "../lib/saveImage";
import type { AuthorWithStories, StoryWithAuthor } from "../hooks/useStories";
import { useDeleteStory } from "../hooks/useStories";
import { useRecordStoryView, useStoryViewers } from "../hooks/useStoryViews";
import { useReplyToStory, useStoryInteractions, useToggleStoryLike } from "../hooks/useStoryInteractions";
import { useAuth } from "../store/auth";
import { STORY_REACTIONS } from "../lib/storyReactions";

const DURATION = 6500;
const compact = (count: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(count);

export function StoryViewer({ groups, initialAuthorId, onClose }: {
  groups: AuthorWithStories[];
  initialAuthorId: string;
  onClose: () => void;
}) {
  const [position, setPosition] = useState(() => ({ group: Math.max(0, groups.findIndex((group) => group.authorId === initialAuthorId)), story: 0 }));
  const group = groups[position.group];
  const story = group?.stories[position.story];
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);

  function next() {
    if (position.story + 1 < group.stories.length) setPosition({ ...position, story: position.story + 1 });
    else if (position.group + 1 < groups.length) setPosition({ group: position.group + 1, story: 0 });
    else onClose();
  }
  function previous() {
    if (position.story > 0) setPosition({ ...position, story: position.story - 1 });
    else if (position.group > 0) setPosition({ group: position.group - 1, story: groups[position.group - 1].stories.length - 1 });
  }

  if (!story) return null;
  return createPortal(
    <div ref={dialog} className="story-viewer" role="dialog" aria-modal="true" aria-label="Moment viewer" tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.stopPropagation(); onClose(); }
        if (event.key !== "Tab") return;
        const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href]')).filter((element) => element.getClientRects().length);
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
      }}>
      <StorySlide key={story.id} story={story} group={group} index={position.story} canGoBack={position.group > 0 || position.story > 0} onNext={next} onPrevious={previous} onClose={onClose} />
    </div>, document.body,
  );
}

function StorySlide({ story, group, index, canGoBack, onNext, onPrevious, onClose }: {
  story: StoryWithAuthor; group: AuthorWithStories; index: number; canGoBack: boolean;
  onNext: () => void; onPrevious: () => void; onClose: () => void;
}) {
  const { userId } = useAuth();
  const {data:canManageOrganization}=useCanManageOrganization(story.organization_id || undefined);
  const own = story.organization_id ? canManageOrganization===true : userId === story.author_id;
  const [paused, setPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const [typing, setTyping] = useState(false);
  const [reactionsOpen,setReactionsOpen]=useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [ready, setReady] = useState(!story.media_url);
  const [mediaError, setMediaError] = useState(story.story_type === "image" && !story.media_url);
  const [muted, setMuted] = useState(true);
  const [sheet, setSheet] = useState<"viewers" | "replies" | "delete" | null>(null);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [savingPhoto, setSavingPhoto] = useState(false);
  const saveLock = useRef(false);
  const [progress, setProgress] = useState(0);
  const elapsed = useRef(0);
  const audio = useRef<HTMLAudioElement>(null);
  const press = useRef<{ x: number; y: number; time: number } | null>(null);
  const { mutate: recordView } = useRecordStoryView();
  const viewers = useStoryViewers(story.id, own);
  const interactions = useStoryInteractions(story.id);
  const like = useToggleStoryLike(story.id);
  const reply = useReplyToStory(story.id);
  const remove = useDeleteStory();
  const myReaction = interactions.data?.find((item) => item.kind === "like" && item.user_id === userId);
  const liked = !!myReaction;
  const likes = interactions.data?.filter((item) => item.kind === "like").length ?? 0;
  const replies = interactions.data?.filter((item) => item.kind === "reply") ?? [];
  const stopped = paused || holding || typing || reactionsOpen || !!draft || hidden || !!sheet || !ready || reply.isPending || like.isPending || savingPhoto;
  const text = story.text_body?.trim() || story.caption?.trim();
  const [age] = useState(() => Math.max(0, Math.floor((Date.now() - Date.parse(story.created_at)) / 60000)));

  useEffect(() => {
    if (userId && !own) recordView({ storyId: story.id, authorId: story.author_id });
  }, [userId, own, recordView, story.id, story.author_id]);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (stopped) return;
    let frame: number;
    let last = performance.now();
    const tick = (now: number) => {
      elapsed.current += now - last;
      last = now;
      setProgress(Math.min(100, elapsed.current / DURATION * 100));
      if (elapsed.current >= DURATION) onNext();
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [stopped, onNext]);
  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    if (stopped) element.pause();
    else void element.play().catch(() => { if (!muted) setNotice("Tap the sound button to play the music."); });
  }, [stopped, muted]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest("input, textarea, button, a, [contenteditable=true]")) return;
      if (sheet) return;
      if (event.key === " ") { event.preventDefault(); setPaused((value) => !value); }
      if (event.key === "ArrowRight") onNext();
      if (event.key === "ArrowLeft" && canGoBack) onPrevious();
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [sheet, canGoBack, onNext, onPrevious]);

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim() || reply.isPending) return;
    try { await reply.mutateAsync(draft); setDraft(""); setNotice("Reply sent"); }
    catch { /* The mutation error is displayed below. */ }
  }

  async function downloadPhoto() {
    if (!story.media_url || saveLock.current) return;
    saveLock.current = true; setSavingPhoto(true); setNotice("");
    try { await saveImage(story.media_url, `${group.author?.full_name || "POSSARA"}-story`); setNotice("Download started"); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not save this photo."); }
    finally { saveLock.current = false; setSavingPhoto(false); }
  }

  return <div className={`story-stage story-background-${story.background_style}`}>
    <div className="story-media"
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        press.current = { x: event.clientX, y: event.clientY, time: performance.now() };
        event.currentTarget.setPointerCapture(event.pointerId); setHolding(true);
      }}
      onPointerUp={(event) => {
        const start = press.current; press.current = null; setHolding(false);
        if (!start) return;
        const dx = event.clientX - start.x; const dy = event.clientY - start.y;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { if (dx < 0) onNext(); else if (canGoBack) onPrevious(); }
        else if (performance.now() - start.time < 250 && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX - bounds.left < bounds.width / 3) { if (canGoBack) onPrevious(); }
          else onNext();
        }
      }}
      onPointerCancel={() => { press.current = null; setHolding(false); }}
      onLostPointerCapture={() => setHolding(false)}>
      {story.media_url && !mediaError && <img src={story.media_url} alt={text || "Moment photo"} draggable={false} onLoad={() => setReady(true)} onError={() => { setMediaError(true); setReady(true); }} />}
      {!ready && <LoaderCircle className="animate-spin" size={32} aria-label="Loading photo" />}
      {mediaError && <p className="px-10 text-center text-sm">{userId ? "This photo could not load. Use the arrows to continue." : "Sign in to view this photo."}</p>}
      {text && <p className={`story-caption ${story.media_url ? "story-caption-photo" : ""}`}>{text}</p>}
    </div>
    <header className="story-header">
      <div className="story-progress" aria-label={`Moment ${index + 1} of ${group.stories.length}`}>
        {group.stories.map((item, i) => <span key={item.id}><span style={{ width: `${i < index ? 100 : i === index ? progress : 0}%` }} /></span>)}
      </div>
      <div className="story-author-row">
        {group.author?.avatar_url ? <img src={group.author.avatar_url} alt="" /> : <span className="story-avatar">{(group.author?.full_name || "M").charAt(0)}</span>}
        <div className="story-author-name"><strong title={group.author?.full_name || "Member"}>{group.author?.full_name || "Member"}</strong>{(group.organization?.verified||group.organization?.verification_status==="verified")&&<OrganizationVerificationBadge compact/>}<span>{age < 1 ? "Just now" : age < 60 ? `${age}m` : `${Math.floor(age / 60)}h`}</span></div>
        {story.music_url && <button aria-label={muted ? "Enable music" : "Mute music"} onClick={() => { setMuted(!muted); if (muted) { setNotice(""); void audio.current?.play().catch(() => setNotice("Music could not play. Please try again.")); } }}>{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>}
        <button aria-label={paused ? "Resume Moment" : "Pause Moment"} onClick={() => setPaused(!paused)}>{paused ? <Play size={19} /> : <Pause size={19} />}</button>
        {own && <button aria-label="Delete Moment" onClick={() => setSheet("delete")}><Trash2 size={18} /></button>}
        <button aria-label="Close Moment" onClick={onClose}><X size={23} /></button>
      </div>
      {story.music_url && <p className="story-music-label"><Music2 size={12} /><span>{story.music_title || "Moment music"}</span></p>}
    </header>
    <button className="story-nav story-nav-prev" disabled={!canGoBack} aria-label="Previous Moment" onClick={onPrevious}><ChevronLeft /></button>
    <button className="story-nav story-nav-next" aria-label="Next Moment" onClick={onNext}><ChevronRight /></button>
    {paused && !sheet && <button className="story-resume" aria-label="Resume playback" onClick={() => setPaused(false)}><Play size={32} /></button>}
    {story.music_url && <audio ref={audio} src={story.music_url} muted={muted} loop preload="metadata" onError={() => setNotice("Music is unavailable for this Moment.")} onLoadedMetadata={() => {
      const element = audio.current;
      if (element) element.currentTime = Math.min(Math.max(0, story.music_clip_start_seconds ?? 0), Number.isFinite(element.duration) ? Math.max(0, element.duration - 0.1) : 0);
    }} />}
    <footer className="story-footer">
      {reactionsOpen&&<div className="mb-3 flex flex-wrap justify-center gap-1 rounded-2xl bg-white p-2 text-ink shadow-xl" role="group" aria-label="Choose a story reaction">
        {STORY_REACTIONS.map(reaction=><button key={reaction.value} type="button" aria-label={reaction.label} aria-pressed={myReaction?.reaction_type===reaction.value} disabled={like.isPending} className="flex min-h-12 min-w-11 flex-col items-center rounded-xl p-1 hover:bg-paper" onClick={()=>{like.mutate(reaction.value);setReactionsOpen(false);}}><span className="text-2xl">{reaction.emoji}</span><span className="text-[10px]">{reaction.label}</span></button>)}
        {liked&&<button type="button" className="px-2 text-xs" onClick={()=>{like.mutate(null);setReactionsOpen(false);}}>Remove reaction</button>}
        <button type="button" aria-label="Close reactions" onClick={()=>setReactionsOpen(false)} className="p-2"><X size={16}/></button>
      </div>}
      {story.media_url && <div className="story-photo-actions"><button type="button" disabled={savingPhoto} onClick={() => void downloadPhoto()} aria-label="Save story photo to device">{savingPhoto ? <LoaderCircle size={15} className="animate-spin" /> : <Download size={15} />}{savingPhoto ? "Saving…" : "Save photo"}</button><a href={story.media_url} target="_blank" rel="noopener noreferrer" onClick={() => setPaused(true)}>Open original</a></div>}
      {(notice || like.error || reply.error) && <p className="story-notice" role="status">{like.error?.message || reply.error?.message || notice}</p>}
      {own ? <div className="story-owner-actions">
        <button onClick={() => setSheet("viewers")}><Eye size={19} />{compact(viewers.data?.length ?? 0)} viewers</button>
        <button onClick={() => setSheet("replies")}><MessageCircle size={19} />{compact(replies.length)} replies</button>
        <span><Heart size={18} />{compact(likes)}</span>
      </div> : userId ? <div className="story-reply-row">
        <form onSubmit={sendReply}>
          <input aria-label="Reply to this Moment" placeholder="Send a reply…" value={draft} maxLength={500} onFocus={() => setTyping(true)} onBlur={() => setTyping(false)} onChange={(event) => { setDraft(event.target.value); setNotice(""); }} />
          <button type="submit" aria-label="Send reply" disabled={!draft.trim() || reply.isPending}>{reply.isPending ? <LoaderCircle className="animate-spin" size={20} /> : <Send size={20} />}</button>
        </form>
        <button className={`story-like ${liked ? "is-liked" : ""}`} aria-label="React to Moment" aria-expanded={reactionsOpen} disabled={like.isPending || interactions.isLoading || !!interactions.error} onClick={() => setReactionsOpen(value=>!value)}>{liked?<span className="text-2xl">{STORY_REACTIONS.find(item=>item.value===myReaction.reaction_type)?.emoji||"❤️"}</span>:<Heart size={26}/>}</button>
      </div> : <p className="story-notice">Sign in to react or reply to Moments.</p>}
      {interactions.error && <p role="alert" className="story-notice">Reactions and replies could not load. <button onClick={() => void interactions.refetch()}>Retry</button></p>}
    </footer>
    {sheet && <div className="story-sheet" role="region" aria-label={sheet === "delete" ? "Delete Moment" : sheet === "viewers" ? "Moment viewers" : "Moment replies"}>
      <div className="story-sheet-heading"><strong>{sheet === "delete" ? "Delete this Moment?" : sheet === "viewers" ? "Moment viewers" : "Replies"}</strong><button aria-label="Close panel" onClick={() => setSheet(null)}><X size={20} /></button></div>
      {sheet === "delete" ? <><p>This cannot be undone.</p>{remove.error && <p role="alert">{remove.error.message}</p>}<button className="mt-4 rounded-full bg-flag px-5 py-2 text-white" disabled={remove.isPending} onClick={() => void remove.mutateAsync(story).then(onClose).catch(() => undefined)}>{remove.isPending ? "Deleting…" : "Delete Moment"}</button></> : <div className="story-sheet-list">
        {sheet === "viewers" ? <>
          <p className="mb-3 text-xs text-ink-faint">People who allow story-view visibility.</p>
          {viewers.isLoading && <p>Loading viewers…</p>}{viewers.error && <p role="alert">Could not load viewers.</p>}
          {viewers.data?.map((viewer) => <div key={viewer.viewerId} className="flex min-w-0 items-center gap-3 py-2">{viewer.avatarUrl && <img src={viewer.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />}<span className="min-w-0 truncate">{viewer.fullName || viewer.username || "Member"}</span></div>)}
          {!viewers.isLoading && !viewers.error && !viewers.data?.length && <p>No visible viewers yet.</p>}
        </> : <>
          {interactions.isLoading && <p>Loading replies…</p>}{interactions.error && <p role="alert">Could not load replies.</p>}
          {replies.map((item) => <div key={item.id} className="mb-2 rounded-xl bg-paper p-3"><strong className="block truncate">{item.profile?.full_name || item.profile?.username || "Member"}</strong><p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{item.body}</p></div>)}
          {!interactions.isLoading && !interactions.error && !replies.length && <p>No replies yet.</p>}
        </>}
      </div>}
    </div>}
  </div>;
}
