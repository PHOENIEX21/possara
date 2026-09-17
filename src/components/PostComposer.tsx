import { useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import { useCreatePost } from "../hooks/useFeedPosts";
import { useOpportunityCategories } from "./CategoryChips";
import { useOwnProfile } from "../hooks/useProfile";
import { useAuth } from "../store/auth";
import { ProfilePhotoViewer } from "./ProfilePhotoViewer";

interface PostComposerProps {
  postType?: "general" | "resource" | "opportunity" | "event";
  placeholder?: string;
  showCategoryPicker?: boolean;
  showHomeTopicPicker?: boolean;
}

const HOME_TOPICS = [
  { value: "inspire", label: "Inspire", help: "Encouragement, lessons, motivation and experiences that can move someone forward." },
  { value: "care", label: "Care", help: "Support, kindness, thoughtful advice and community-minded conversations." },
  { value: "talent", label: "Talent", help: "Skills, creative work, projects, achievements and things worth showing." },
] as const;

export function PostComposer({ postType = "general", placeholder, showCategoryPicker = false, showHomeTopicPicker = false }: PostComposerProps) {
  const { userId } = useAuth();
  const { data: profile } = useOwnProfile();
  const createPost = useCreatePost();
  const { data: categories } = useOpportunityCategories();
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);

  if (!userId) return <div className="rounded-2xl border border-paper-dim bg-white shadow-sm px-5 py-4 text-sm text-ink-light">Sign in to share something useful, inspiring or worth seeing.</div>;

  const firstName = profile?.full_name?.split(" ")[0];
  const selectedTopic = HOME_TOPICS.find(item => item.value === topic);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setExpanded(true);
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    await createPost.mutateAsync({
      content: content.trim(),
      imageFile,
      type: categoryId ? "opportunity" : postType,
      categoryId: categoryId || null,
      topic: showHomeTopicPicker ? (topic || null) : null,
    });
    setContent("");
    setCategoryId("");
    setTopic("");
    clearImage();
    setExpanded(false);
  }

  const avatar = profile?.avatar_url ? (
    <button type="button" onClick={() => setPhotoOpen(true)} className="h-9 w-9 shrink-0 rounded-full" aria-label="View your profile photo" title="View profile photo">
      <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
    </button>
  ) : (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-trust-light text-sm font-medium text-trust-dark">{(firstName ?? "?").charAt(0).toUpperCase()}</div>
  );

  if (!expanded) return <>
    <div className="flex items-center gap-3 rounded-2xl border border-paper-dim bg-white shadow-sm px-4 py-3">
      {avatar}
      <button onClick={() => setExpanded(true)} className="flex-1 rounded-full bg-paper-dim px-4 py-2 text-left text-[15px] text-ink-faint hover:bg-paper-dim/70">{placeholder ? placeholder : firstName ? `What's on your mind, ${firstName}?` : "What's on your mind?"}</button>
      <label aria-label="Add photo" className="shrink-0 cursor-pointer text-trust-dark hover:text-trust"><ImageIcon size={20} /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" /></label>
    </div>
    {photoOpen && profile?.avatar_url && <ProfilePhotoViewer src={profile.avatar_url} name={profile.full_name ?? "Your"} onClose={() => setPhotoOpen(false)} />}
  </>;

  return <>
    <form onSubmit={handleSubmit} className="rounded-2xl border border-paper-dim bg-white shadow-sm px-5 py-4">
      {showHomeTopicPicker && <div className="mb-4">
        <div className="mb-3"><p className="text-sm font-semibold text-ink">Add a topic if it helps</p><p className="mt-1 text-xs text-ink-faint">Optional. Keep the post itself at the center.</p></div>
        <div className="flex flex-wrap gap-2">{HOME_TOPICS.map(item => <button key={item.value} type="button" onClick={() => setTopic(topic === item.value ? "" : item.value)} className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${topic===item.value?"border-brand bg-brand-light text-brand-dark":"border-ink-faint/20 bg-white text-ink-light hover:bg-paper-dim"}`}>{item.label}</button>)}</div>
        {selectedTopic&&<p className="mt-2 text-xs text-ink-light">{selectedTopic.help}</p>}
      </div>}
      {showCategoryPicker && <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mb-2 rounded-full border border-ink-faint/30 bg-paper-dim/50 px-3 py-1 text-xs font-medium text-ink-light outline-none focus:border-brand"><option value="">Community post (Home feed)</option>{categories?.map((cat) => <option key={cat.id} value={cat.id}>{cat.name} feed</option>)}</select>}
      <textarea autoFocus value={content} onChange={(e) => setContent(e.target.value)} placeholder={placeholder ?? "Share something useful…"} rows={3} className="w-full resize-none text-[15px] outline-none placeholder:text-ink-faint" />
      {imagePreview && <div className="relative mt-2 inline-block"><img src={imagePreview} alt="" className="max-h-64 rounded-lg object-cover" /><button type="button" onClick={clearImage} className="absolute right-2 top-2 rounded-full bg-ink/70 p-1 text-paper hover:bg-ink" aria-label="Remove image"><X size={14} /></button></div>}
      <div className="mt-3 flex items-center justify-between border-t border-paper-dim pt-3"><label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-sm text-ink-light hover:bg-paper-dim"><ImageIcon size={16} /> Photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" /></label><div className="flex items-center gap-2"><button type="button" onClick={() => { setExpanded(false); setContent(""); setTopic(""); clearImage(); }} className="rounded-full px-3 py-1.5 text-sm text-ink-faint hover:bg-paper-dim">Cancel</button><button type="submit" disabled={!content.trim() || createPost.isPending} className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-40">{createPost.isPending ? "Posting…" : "Post"}</button></div></div>
      {createPost.error && <p className="mt-2 text-sm text-flag">{(createPost.error as Error).message}</p>}
    </form>
    {photoOpen && profile?.avatar_url && <ProfilePhotoViewer src={profile.avatar_url} name={profile.full_name ?? "Your"} onClose={() => setPhotoOpen(false)} />}
  </>;
}
