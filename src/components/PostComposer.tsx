import { useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import { useCreatePost } from "../hooks/useFeedPosts";
import { useOpportunityCategories } from "./CategoryChips";
import { useOwnProfile } from "../hooks/useProfile";
import { useAuth } from "../store/auth";
import { ProfilePhotoViewer } from "./ProfilePhotoViewer";
import { MentionSuggestions } from "./MentionSuggestions";

interface PostComposerProps {
  postType?: "general" | "resource" | "opportunity" | "event";
  placeholder?: string;
  showCategoryPicker?: boolean;
  showHomeTopicPicker?: boolean;
  defaultTopic?: string;
}

const HOME_TOPICS = [
  { value: "motivation", label: "Motivation", help: "Motivation, lessons and experiences that can help someone keep moving forward." },
  { value: "encouragement", label: "Encouragement", help: "Positive support, hope and words that strengthen someone." },
  { value: "advice", label: "Advice", help: "Practical guidance, lessons learned and thoughtful suggestions." },
  { value: "uplifting", label: "Uplifting", help: "Positive achievements, gratitude and stories that can brighten someone’s day." },
] as const;

export function PostComposer({
  postType = "general",
  placeholder,
  showCategoryPicker = false,
  showHomeTopicPicker = false,
  defaultTopic = "",
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);

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
    setCategoryId("");
    setTopic(defaultTopic);
    clearImage();
    setExpanded(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    const categorySelected = !!categoryId;
    await createPost.mutateAsync({
      content: content.trim(),
      imageFile,
      type: categorySelected ? "opportunity" : selectedPostType,
      categoryId: categoryId || null,
      topic: categorySelected ? null : (showHomeTopicPicker || defaultTopic ? topic || null : null),
    });
    reset();
  }

  const avatar = profile?.avatar_url ? (
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
          {placeholder ? placeholder : firstName ? `What's on your mind, ${firstName}?` : "What's on your mind?"}
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
    <form onSubmit={handleSubmit} className="rounded-2xl border border-paper-dim bg-white px-5 py-4 shadow-sm">
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
            <p className="text-sm font-semibold text-ink">What kind of Home post is this?</p>
            <p className="mt-1 text-xs text-ink-faint">Optional, but choosing one helps people understand what you are sharing.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {HOME_TOPICS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTopic(topic === item.value ? "" : item.value)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${topic===item.value ? "border-brand bg-brand-light text-brand-dark" : "border-ink-faint/20 bg-white text-ink-light hover:bg-paper-dim"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {selectedTopic && <p className="mt-2 text-xs text-ink-light">{selectedTopic.help}</p>}
        </div>
      )}

      {!categoryId&&<div className="mb-4"><p className="mb-2 text-sm font-semibold text-ink">What are you sharing?</p><div className="flex flex-wrap gap-2">{([{value:"general",label:"Community"},{value:"resource",label:"Resource"},{value:"event",label:"Event"}] as const).map(item=><button key={item.value} type="button" onClick={()=>setSelectedPostType(item.value)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selectedPostType===item.value?"border-brand bg-brand-light text-brand-dark":"border-ink-faint/20 bg-white text-ink-light"}`}>{item.label}</button>)}</div></div>}

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

      {imagePreview && (
        <div className="relative mt-3 inline-block">
          <img src={imagePreview} alt="" className="max-h-64 rounded-lg object-cover" />
          <button type="button" onClick={clearImage} className="absolute right-2 top-2 rounded-full bg-ink/70 p-1 text-paper hover:bg-ink" aria-label="Remove image"><X size={14} /></button>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-paper-dim pt-3">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-sm text-ink-light hover:bg-paper-dim">
          <ImageIcon size={16} /> Photo
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
        </label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={reset} className="rounded-full px-3 py-1.5 text-sm text-ink-faint hover:bg-paper-dim">Cancel</button>
          <button type="submit" disabled={!content.trim() || createPost.isPending} className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-40">
            {createPost.isPending ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
      {createPost.error && <p className="mt-2 text-sm text-flag">{(createPost.error as Error).message}</p>}
    </form>
    {photoOpen && profile?.avatar_url && <ProfilePhotoViewer src={profile.avatar_url} name={profile.full_name ?? "Your"} onClose={() => setPhotoOpen(false)} />}
  </>;
}
