import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Building2, Image as ImageIcon, Music2, SmilePlus, X } from "lucide-react";
import { useCreatePost } from "../hooks/useFeedPosts";
import { useOpportunityCategories } from "./CategoryChips";
import { useOwnProfile } from "../hooks/useProfile";
import { useAuth } from "../store/auth";
import { ProfilePhotoViewer } from "./ProfilePhotoViewer";
import { MentionSuggestions } from "./MentionSuggestions";
import { supabase } from "../lib/supabase";
import { useActiveOrganizationIdentity } from "../hooks/useActiveOrganizationIdentity";
import { OrganizationVerificationBadge } from "./OrganizationVerificationBadge";
import { MusicPicker } from "./MusicPicker";
import type { MusicLibraryTrack } from "../hooks/useMusicLibrary";

export interface PostComposerProps {
  postType?: "general" | "resource" | "opportunity" | "event";
  placeholder?: string;
  showCategoryPicker?: boolean;
  showHomeTopicPicker?: boolean;
  defaultTopic?: string;
  organizationId?: string;
  organizationName?: string;
  organizationLogoUrl?: string | null;
}

const HOME_TOPICS = [
  { value: "insight", label: "Insight", help: "Motivation, encouragement, useful stories, knowledge, education, practical advice and lessons." },
] as const;
const HOME_POST_CATEGORIES = ["jobs","scholarships","competitions","admissions"] as const;
const FEELINGS = [
 {value:"happy",label:"😊 Happy"},{value:"grateful",label:"🙏 Grateful"},{value:"excited",label:"🤩 Excited"},
 {value:"celebrating",label:"🎉 Celebrating"},{value:"birthday",label:"🎂 Celebrating a birthday"},{value:"proud",label:"🙌 Proud"},
 {value:"blessed",label:"✨ Blessed"},{value:"motivated",label:"💪 Motivated"}
] as const;

export function PostEditor({
  postType = "general",
  placeholder,
  showCategoryPicker = false,
  showHomeTopicPicker = false,
  defaultTopic = "",
  organizationId,
  organizationName,
  organizationLogoUrl,
  onPublished,
  onCancel,
}: PostComposerProps & { onPublished: () => void; onCancel: () => void }) {
  const { userId } = useAuth();
  const { data: profile } = useOwnProfile();
  const createPost = useCreatePost();
  const { data: categories } = useOpportunityCategories();
  const activeOrganization = useActiveOrganizationIdentity();
  const effectiveOrganizationId = organizationId ?? activeOrganization?.id;
  const effectiveOrganizationName = organizationName ?? activeOrganization?.name;
  const effectiveOrganizationLogoUrl = organizationId ? organizationLogoUrl : activeOrganization?.logo_url ?? organizationLogoUrl;
  const effectiveOrganizationVerified = organizationId ? false : activeOrganization?.verified === true;
  const postingAsOrganization = !!effectiveOrganizationId && !!effectiveOrganizationName;
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [topic, setTopic] = useState<string>(defaultTopic);
  const [selectedPostType,setSelectedPostType]=useState<"general"|"resource"|"opportunity"|"event">(postType);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [musicFile,setMusicFile]=useState<File|null>(null);
  const [musicPickerOpen,setMusicPickerOpen]=useState(false);
  const [libraryTrack,setLibraryTrack]=useState<MusicLibraryTrack|null>(null);
  const [feeling,setFeeling]=useState("");
  const [showFeelings,setShowFeelings]=useState(false);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [mediaError,setMediaError]=useState<string|null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [classificationError,setClassificationError]=useState<string|null>(null);
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
  const draftKey = userId ? `possara-post-draft:${userId}:${effectiveOrganizationId ?? "personal"}:${postType}:${showHomeTopicPicker ? "home" : "page"}` : null;

  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) { setHydratedDraftKey(draftKey); return; }
      const draft = JSON.parse(raw) as { content?: string; categoryId?: string; topic?: string; selectedPostType?: "general" | "resource" | "opportunity" | "event"; feeling?: string; libraryTrack?: MusicLibraryTrack | null };
      if (typeof draft.content === "string") { setContent(draft.content); }
      if (typeof draft.categoryId === "string") setCategoryId(draft.categoryId);
      if (typeof draft.topic === "string") setTopic(draft.topic);
      if (draft.selectedPostType) setSelectedPostType(draft.selectedPostType);
      if (typeof draft.feeling === "string") setFeeling(draft.feeling);
      if (draft.libraryTrack?.trackKey) setLibraryTrack(draft.libraryTrack);
    } catch {
      localStorage.removeItem(draftKey);
    }
    setHydratedDraftKey(draftKey);
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey || hydratedDraftKey !== draftKey) return;
    if (!content && !categoryId && !feeling && !libraryTrack && topic === defaultTopic) {
      localStorage.removeItem(draftKey);
      return;
    }
    localStorage.setItem(draftKey, JSON.stringify({ content, categoryId, topic, selectedPostType, feeling, libraryTrack }));
  }, [draftKey, hydratedDraftKey, content, categoryId, topic, selectedPostType, feeling, libraryTrack, defaultTopic]);

  if (!userId) {
    return <div className="rounded-2xl border border-paper-dim bg-white px-5 py-4 text-sm text-ink-light shadow-sm">Sign in to share something useful, inspiring or worth seeing.</div>;
  }

  const firstName = profile?.full_name?.split(" ")[0];
  const selectedTopic = HOME_TOPICS.find((item) => item.value === topic);
  const homeCategories = categories?.filter((cat) => HOME_POST_CATEGORIES.includes(cat.slug as typeof HOME_POST_CATEGORIES[number])) ?? [];

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!picked.length) return;

    const allowed = picked.filter((file) => file.type.match(/^image\/(jpeg|png|webp)$/) && file.size <= 8 * 1024 * 1024);
    const rejected = picked.length - allowed.length;
    const remaining = Math.max(0, 10 - mediaFiles.length);
    const accepted = allowed.slice(0, remaining);

    if (accepted.length) {
      setMediaFiles((current) => [...current, ...accepted]);
      setMediaPreviews((current) => [...current, ...accepted.map(createPreview)]);
    }

    if (rejected) setMediaError("Some files were skipped. Use JPG, PNG or WebP images up to 8 MB each.");
    else if (allowed.length > remaining) setMediaError("A post can include up to 10 images.");
    else setMediaError(null);
  }

  function removeMedia(index: number) {
    setMediaPreviews((current) => {
      const preview = current[index];
      if (preview) URL.revokeObjectURL(preview);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
    setMediaFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setMediaError(null);
  }

  function clearMedia() {
    mediaPreviews.forEach((preview) => URL.revokeObjectURL(preview));
    setMediaFiles([]);
    setMediaPreviews([]);
    setMediaError(null);
  }

  function reset() {
    setContent("");
    setClassificationError(null);
    setCategoryId("");
    setTopic(defaultTopic);
    clearMedia();
    setMusicFile(null); setLibraryTrack(null); setMusicPickerOpen(false); setFeeling(""); setShowFeelings(false);
    if (draftKey) localStorage.removeItem(draftKey);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    if (showHomeTopicPicker && !categoryId) {
      if (!topic) {
        setClassificationError("Choose the section that accurately describes this post before publishing.");
        return;
      }
      {
        const { data: verdict, error: classificationRequestError } = await supabase.rpc("classify_home_post", {
          p_content: content.trim(),
          p_topic: topic,
        });
        if (classificationRequestError) {
          setClassificationError("POSSARA could not check this post right now. Please try again.");
          return;
        }
        if (verdict?.aligned === false) {
          setClassificationError(verdict.reason || "This post does not appear to match the section you selected.");
          return;
        }
      }
      setClassificationError(null);
    }
    const categorySelected = !!categoryId;
    await createPost.mutateAsync({
      content: content.trim(),
      mediaFiles,
      musicFile,
      musicTrackKey: libraryTrack?.trackKey ?? null,
      feeling:feeling||null,
      type: categorySelected ? "opportunity" : selectedPostType,
      categoryId: categoryId || null,
      topic: categorySelected ? null : (showHomeTopicPicker || defaultTopic ? topic || null : null),
      organizationId: effectiveOrganizationId ?? null,
    });
    reset();
    onPublished();
  }

  const avatar = postingAsOrganization ? (
    effectiveOrganizationLogoUrl ? <img src={effectiveOrganizationLogoUrl} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" /> :
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark"><Building2 size={17}/></div>
  ) : profile?.avatar_url ? (
    <button type="button" onClick={() => setPhotoOpen(true)} className="h-9 w-9 shrink-0 rounded-full" aria-label="View your profile photo">
      <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
    </button>
  ) : (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-trust-light text-sm font-medium text-trust-dark">
      {(firstName ?? "?").charAt(0).toUpperCase()}
    </div>
  );

  return <>
    <form onSubmit={(event) => { void handleSubmit(event).catch(() => undefined); }} className="rounded-2xl border border-paper-dim bg-white px-4 py-4 shadow-sm sm:px-5">
      {postingAsOrganization&&<div className="mb-4 flex items-center gap-3 rounded-2xl border border-brand/15 bg-brand-light/35 p-3">{avatar}<div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-brand-dark">Posting as organization</p><div className="flex items-center gap-1.5"><p className="truncate text-sm font-semibold text-ink">{effectiveOrganizationName}</p>{effectiveOrganizationVerified&&<OrganizationVerificationBadge compact/>}</div><p className="mt-0.5 text-xs text-ink-faint">Choose the section that matches the update. Formal vacancies belong in the organization hiring tools; regular organization posts use the same Insight community section as personal profiles.</p></div></div>}
      {showCategoryPicker && (
        <div className="mb-4">
          <label className="text-sm font-semibold text-ink">
            Choose where this belongs
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                if (e.target.value) setTopic("");
              }}
              className="mt-1.5 w-full rounded-xl border border-ink-faint/25 bg-white px-3 py-2.5 text-sm font-medium text-ink outline-none focus:border-brand"
            >
              <option value="">Home community</option>
              {categories?.map((cat) => <option key={cat.id} value={cat.id}>{cat.name} community</option>)}
            </select>
          </label>
          <p className="mt-1 text-xs text-ink-faint">Category posts also stay on your profile.</p>
        </div>
      )}

      {showHomeTopicPicker && (
        <div className="mb-4">
          <div className="mb-3"><p className="text-sm font-semibold text-ink">Choose where this post belongs</p><p className="mt-1 text-xs text-ink-faint">For You is automatic. Choose the category that best matches what you are posting.</p></div>
          <div className="grid grid-cols-2 gap-2">
            {HOME_TOPICS.map(item=><button key={item.value} type="button" onClick={()=>{setCategoryId("");setTopic(item.value);setClassificationError(null)}} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${!categoryId&&topic===item.value?"border-brand bg-brand-light text-brand-dark":"border-ink-faint/20 bg-white text-ink-light"}`}>{item.label}</button>)}
            {homeCategories.map(cat=><button key={cat.id} type="button" onClick={()=>{setCategoryId(cat.id);setTopic("");setClassificationError(null)}} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${categoryId===cat.id?"border-brand bg-brand-light text-brand-dark":"border-ink-faint/20 bg-white text-ink-light"}`}>{cat.name}</button>)}
          </div>
          {!categoryId&&selectedTopic&&<div className="mt-2 rounded-xl bg-paper p-3"><p className="text-xs leading-5 text-ink-light">{selectedTopic.help}</p></div>}
        </div>
      )}

      {!showHomeTopicPicker&&!categoryId&&<div className="mb-4"><p className="mb-2 text-sm font-semibold text-ink">What are you sharing?</p><div className="flex flex-wrap gap-2">{([{value:"general",label:"Community"},{value:"resource",label:"Resource"},{value:"event",label:"Event"}] as const).map(item=><button key={item.value} type="button" onClick={()=>setSelectedPostType(item.value)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selectedPostType===item.value?"border-brand bg-brand-light text-brand-dark":"border-ink-faint/20 bg-white text-ink-light"}`}>{item.label}</button>)}</div></div>}

      {feeling&&<div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1.5 text-sm font-medium text-brand-dark">{FEELINGS.find(x=>x.value===feeling)?.label}<button type="button" onClick={()=>setFeeling("")} aria-label="Remove feeling"><X size={13}/></button></div>}
      <div className="relative">
        <textarea
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder ?? "Share something useful… Use @username to tag someone."}
          rows={4}
          maxLength={4000}
          className="w-full resize-none text-[15px] outline-none placeholder:text-ink-faint"
        />
        <MentionSuggestions value={content} onChange={setContent}/>
      </div>

      {showFeelings&&<div className="mt-3 flex flex-wrap gap-2 rounded-2xl bg-paper p-3">{FEELINGS.map(item=><button key={item.value} type="button" onClick={()=>{setFeeling(item.value);setShowFeelings(false);}} className="rounded-full bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-brand-light">{item.label}</button>)}</div>}
      {(musicFile||libraryTrack)&&<div className="mt-3 flex items-center justify-between rounded-xl border border-paper-dim bg-paper px-3 py-2 text-sm"><span className="min-w-0 truncate">🎵 {libraryTrack ? `${libraryTrack.title} · ${libraryTrack.creator}` : musicFile?.name}</span><button type="button" onClick={()=>{setMusicFile(null);setLibraryTrack(null)}} aria-label="Remove music"><X size={15}/></button></div>}
      {mediaPreviews.length>0 && (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs font-semibold text-ink-light">{mediaPreviews.length} {mediaPreviews.length===1?"image":"images"} selected</p><span className="text-[11px] text-ink-faint">Up to 10</span></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {mediaPreviews.map((preview,index)=><div key={preview} className="relative aspect-square overflow-hidden rounded-xl bg-paper"><img src={preview} alt="" className="h-full w-full object-cover"/><button type="button" onClick={()=>removeMedia(index)} className="absolute right-2 top-2 rounded-full bg-ink/75 p-1.5 text-white" aria-label={`Remove image ${index+1}`}><X size={14}/></button><span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">{index+1}</span></div>)}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-paper-dim pt-3">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-sm text-ink-light hover:bg-paper-dim">
          <ImageIcon size={16} /> {mediaFiles.length ? "Add photos" : "Photos"}
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFileSelect} className="hidden" />
        </label>
        <button type="button" onClick={()=>setMusicPickerOpen(true)} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-ink-light hover:bg-paper-dim"><Music2 size={16}/> Browse POSSARA Music</button><label className="inline-flex cursor-pointer items-center rounded-full px-2 py-1 text-xs text-ink-faint hover:bg-paper-dim">Device<input type="file" accept="audio/mpeg,audio/mp4,audio/webm,audio/ogg,audio/wav" onChange={e=>{const f=e.target.files?.[0];if(f){setMusicFile(f);setLibraryTrack(null);}e.target.value="";}} className="hidden"/></label>
        <button type="button" onClick={()=>setShowFeelings(v=>!v)} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-ink-light hover:bg-paper-dim"><SmilePlus size={16}/> Feeling</button>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={onCancel} disabled={createPost.isPending} className="rounded-full px-3 py-1.5 text-sm text-ink-faint hover:bg-paper-dim">Cancel</button>
          <button type="submit" disabled={!content.trim() || createPost.isPending} className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-40">
            {createPost.isPending ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
      {mediaError&&<div className="mt-3 rounded-xl bg-flag-light px-3 py-2 text-sm font-medium text-flag-dark">{mediaError}</div>}
      {classificationError&&<div className="mt-3 rounded-xl bg-flag-light px-3 py-2 text-sm font-medium text-flag-dark">{classificationError}</div>}
      {createPost.error && <p className="mt-2 text-sm text-flag">{(createPost.error as Error).message}</p>}
    </form>
    {musicPickerOpen && <MusicPicker selectedTrackKey={libraryTrack?.trackKey} onSelect={(track) => { setLibraryTrack(track); setMusicFile(null); }} onClose={() => setMusicPickerOpen(false)} />}
    {photoOpen && profile?.avatar_url && <ProfilePhotoViewer src={profile.avatar_url} name={profile.full_name ?? "Your"} onClose={() => setPhotoOpen(false)} />}
  </>;
}

export function PostComposer(props: PostComposerProps) {
  const location = useLocation();
  const { data: profile } = useOwnProfile();
  return <Link to="/create/post" state={{ composer: props, returnTo: location.pathname + location.search }} className="post-composer-launcher">
    {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span className="post-launcher-avatar"><ImageIcon size={20} /></span>}
    <span className="post-launcher-prompt">{props.placeholder || "What's on your mind?"}</span>
    <span className="post-launcher-action">Create post</span>
  </Link>;
}
