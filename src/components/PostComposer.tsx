import { useState } from "react";
import { Building2, Image as ImageIcon, Music2, SmilePlus, X } from "lucide-react";
import { useCreatePost } from "../hooks/useFeedPosts";
import { useOpportunityCategories } from "./CategoryChips";
import { useOwnProfile } from "../hooks/useProfile";
import { useAuth } from "../store/auth";
import { ProfilePhotoViewer } from "./ProfilePhotoViewer";
import { MentionSuggestions } from "./MentionSuggestions";
import { supabase } from "../lib/supabase";

interface PostComposerProps {
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
  { value: "insight", label: "Insight", help: "Motivation, encouragement, useful stories, knowledge, education, practical advice and lessons. Not random status updates, gossip or unrelated celebrity posts." },
  { value: "job", label: "Job", help: "A genuine vacancy or employment opportunity. Include the role, employer/source, location or work style, requirements and how to apply when known." },
  { value: "scholarship", label: "Scholarship", help: "Real education funding, bursary or scholarship information. Include eligibility, study level, deadline, funding and application source when available." },
  { value: "competition", label: "Competition", help: "A real contest, challenge, quiz or competition. Include who can enter, deadline, prize or purpose and entry details when known." },
  { value: "talent", label: "Talent", help: "Auditions, casting, showcases and genuine opportunities for people to present or develop a talent." },
] as const;
const FEELINGS = [
 {value:"happy",label:"😊 Happy"},{value:"grateful",label:"🙏 Grateful"},{value:"excited",label:"🤩 Excited"},
 {value:"celebrating",label:"🎉 Celebrating"},{value:"birthday",label:"🎂 Celebrating a birthday"},{value:"proud",label:"🙌 Proud"},
 {value:"blessed",label:"✨ Blessed"},{value:"motivated",label:"💪 Motivated"}
] as const;

export function PostComposer({
  postType = "general",
  placeholder,
  showCategoryPicker = false,
  showHomeTopicPicker = false,
  defaultTopic = "",
  organizationId,
  organizationName,
  organizationLogoUrl,
}: PostComposerProps) {
  const { userId } = useAuth();
  const { data: profile } = useOwnProfile();
  const createPost = useCreatePost();
  const { data: categories } = useOpportunityCategories();
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [topic, setTopic] = useState<string>(defaultTopic);
  const [selectedPostType,setSelectedPostType]=useState<"general"|"resource"|"opportunity"|"event">(postType);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [musicFile,setMusicFile]=useState<File|null>(null);
  const [feeling,setFeeling]=useState("");
  const [showFeelings,setShowFeelings]=useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [classificationError,setClassificationError]=useState<string|null>(null);

  if (!userId) {
    return <div className="rounded-2xl border border-paper-dim bg-white px-5 py-4 text-sm text-ink-light shadow-sm">Sign in to share something useful, inspiring or worth seeing.</div>;
  }

  const firstName = profile?.full_name?.split(" ")[0];
  const selectedTopic = HOME_TOPICS.find((item) => item.value === topic);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setExpanded(true);
    e.target.value = "";
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  }

  function reset() {
    setContent("");
    setClassificationError(null);
    setCategoryId("");
    setTopic(defaultTopic);
    clearImage();
    setMusicFile(null); setFeeling(""); setShowFeelings(false);
    setExpanded(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    if (showHomeTopicPicker && !categoryId) {
      if (!topic) {
        setClassificationError("Choose the section that accurately describes this post before publishing.");
        return;
      }
      if (!(postingAsOrganization && topic === "job")) {
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
      imageFile,
      musicFile,
      feeling:feeling||null,
      type: categorySelected ? "opportunity" : selectedPostType,
      categoryId: categoryId || null,
      topic: categorySelected ? null : (showHomeTopicPicker || defaultTopic ? topic || null : null),
      organizationId: organizationId ?? null,
    });
    reset();
  }

  const postingAsOrganization = !!organizationId && !!organizationName;
  const avatar = postingAsOrganization ? (
    organizationLogoUrl ? <img src={organizationLogoUrl} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" /> :
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

  if (!expanded) {
    return <>
      <div className="flex items-center gap-3 rounded-2xl border border-paper-dim bg-white px-4 py-3 shadow-sm">
        {avatar}
        <button onClick={() => setExpanded(true)} className="min-w-0 flex-1 truncate rounded-full bg-paper-dim px-4 py-2 text-left text-[15px] text-ink-faint hover:bg-paper-dim/70">
          {placeholder ? placeholder : postingAsOrganization ? `Share an update as ${organizationName}` : firstName ? `What's on your mind, ${firstName}?` : "What's on your mind?"}
        </button>
        <label aria-label="Add photo" className="shrink-0 cursor-pointer text-trust-dark hover:text-trust">
          <ImageIcon size={20} />
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
        </label>
      </div>
      {photoOpen && profile?.avatar_url && <ProfilePhotoViewer src={profile.avatar_url} name={profile.full_name ?? "Your"} onClose={() => setPhotoOpen(false)} />}
    </>;
  }

  return <>
    <form onSubmit={handleSubmit} className="rounded-2xl border border-paper-dim bg-white px-4 py-4 shadow-sm sm:px-5">
      {postingAsOrganization&&<div className="mb-4 flex items-center gap-3 rounded-2xl border border-brand/15 bg-brand-light/35 p-3">{avatar}<div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-brand-dark">Posting as organization</p><p className="truncate text-sm font-semibold text-ink">{organizationName}</p><p className="mt-0.5 text-xs text-ink-faint">Choose the section that matches the update. A Job post can announce hiring or an upcoming role; a formal vacancy is created separately with Post a role.</p></div></div>}
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

      {showHomeTopicPicker && !categoryId && (
        <div className="mb-4">
          <div className="mb-3">
            <p className="text-sm font-semibold text-ink">Choose a section for this post</p>
            <p className="mt-1 text-xs text-ink-faint">For You shows everything. Choosing a section also lets people filter directly to posts like yours.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {HOME_TOPICS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {setTopic(item.value);setClassificationError(null)}}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${topic===item.value ? "border-brand bg-brand-light text-brand-dark" : "border-ink-faint/20 bg-white text-ink-light hover:bg-paper-dim"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {selectedTopic && <div className="mt-2 rounded-xl bg-paper p-3"><p className="text-xs font-semibold text-ink">{selectedTopic.label} means:</p><p className="mt-1 text-xs leading-5 text-ink-light">{selectedTopic.help}</p></div>}
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
      {musicFile&&<div className="mt-3 flex items-center justify-between rounded-xl border border-paper-dim bg-paper px-3 py-2 text-sm"><span className="min-w-0 truncate">🎵 {musicFile.name}</span><button type="button" onClick={()=>setMusicFile(null)} aria-label="Remove music"><X size={15}/></button></div>}
      {imagePreview && (
        <div className="relative mt-3 inline-block">
          <img src={imagePreview} alt="" className="max-h-64 rounded-lg object-cover" />
          <button type="button" onClick={clearImage} className="absolute right-2 top-2 rounded-full bg-ink/70 p-1 text-paper hover:bg-ink" aria-label="Remove image"><X size={14} /></button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-paper-dim pt-3">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-sm text-ink-light hover:bg-paper-dim">
          <ImageIcon size={16} /> Photo
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
        </label>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-sm text-ink-light hover:bg-paper-dim"><Music2 size={16}/> Music<input type="file" accept="audio/mpeg,audio/mp4,audio/webm,audio/ogg,audio/wav" onChange={e=>{const f=e.target.files?.[0];if(f){setMusicFile(f);setExpanded(true);}e.target.value="";}} className="hidden"/></label>
        <button type="button" onClick={()=>setShowFeelings(v=>!v)} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-ink-light hover:bg-paper-dim"><SmilePlus size={16}/> Feeling</button>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={reset} className="rounded-full px-3 py-1.5 text-sm text-ink-faint hover:bg-paper-dim">Cancel</button>
          <button type="submit" disabled={!content.trim() || createPost.isPending} className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-40">
            {createPost.isPending ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
      {classificationError&&<div className="mt-3 rounded-xl bg-flag-light px-3 py-2 text-sm font-medium text-flag-dark">{classificationError}</div>}
      {createPost.error && <p className="mt-2 text-sm text-flag">{(createPost.error as Error).message}</p>}
    </form>
    {photoOpen && profile?.avatar_url && <ProfilePhotoViewer src={profile.avatar_url} name={profile.full_name ?? "Your"} onClose={() => setPhotoOpen(false)} />}
  </>;
}
