import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, X } from "lucide-react";
import { useCreatePost } from "../hooks/useFeedPosts";
import { useOpportunityCategories } from "./CategoryChips";
import { useOwnProfile } from "../hooks/useProfile";
import { useAvatarUpload } from "../hooks/useAvatarUpload";
import { useAuth } from "../store/auth";

interface PostComposerProps {
  postType?: "general" | "resource" | "opportunity" | "event";
  placeholder?: string;
  showCategoryPicker?: boolean;
  showHomeTopicPicker?: boolean;
}

const HOME_TOPICS = [
  { value: "inspire", label: "Inspire", help: "Encouragement, lessons or a story that can lift someone." },
  { value: "care", label: "Care", help: "Supportive, thoughtful or community-minded posts." },
  { value: "talent", label: "Talent", help: "Showcase a skill, project, craft, idea or achievement." },
] as const;

export function PostComposer({ postType = "general", placeholder, showCategoryPicker = false, showHomeTopicPicker = false }: PostComposerProps) {
  const { userId } = useAuth();
  const { data: profile } = useOwnProfile();
  const createPost = useCreatePost();
  const avatarUpload = useAvatarUpload();
  const { data: categories } = useOpportunityCategories();
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [topic, setTopic] = useState<string>(showHomeTopicPicker ? "inspire" : "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  if (!userId) return <div className="rounded-2xl border border-paper-dim bg-white shadow-sm px-5 py-4 text-sm text-ink-light">Sign in to share a story, a project, or a skill.</div>;

  const firstName = profile?.full_name?.split(" ")[0];
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) { const file = e.target.files?.[0]; if (!file) return; setImageFile(file); setImagePreview(URL.createObjectURL(file)); setExpanded(true); }
  function clearImage() { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarMessage(null);
    try {
      await avatarUpload.mutateAsync(file);
      setAvatarMessage("Profile photo updated.");
    } catch (error) {
      setAvatarMessage((error as Error).message);
    } finally {
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    if (showHomeTopicPicker && !topic) return;
    await createPost.mutateAsync({
      content: content.trim(),
      imageFile,
      type: categoryId ? "opportunity" : postType,
      categoryId: categoryId || null,
      topic: showHomeTopicPicker ? topic : null,
    });
    setContent("");
    setCategoryId("");
    if (showHomeTopicPicker) setTopic("inspire");
    clearImage();
    setExpanded(false);
  }

  const avatarButton = (
    <button
      type="button"
      onClick={() => avatarInputRef.current?.click()}
      disabled={avatarUpload.isPending}
      className="group relative h-9 w-9 shrink-0 rounded-full"
      aria-label="Change your profile photo"
      title="Change profile photo"
    >
      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-trust-light text-sm font-medium text-trust-dark">{(firstName ?? "?").charAt(0).toUpperCase()}</div>}
      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/55 text-white opacity-0 transition group-hover:opacity-100 group-focus:opacity-100"><Camera size={14} /></span>
    </button>
  );

  if (!expanded) return <div>
    <div className="flex items-center gap-3 rounded-2xl border border-paper-dim bg-white shadow-sm px-4 py-3">
      {avatarButton}
      <button onClick={() => setExpanded(true)} className="flex-1 rounded-full bg-paper-dim px-4 py-2 text-left text-[15px] text-ink-faint hover:bg-paper-dim/70">{placeholder ? placeholder : firstName ? `What's on your mind, ${firstName}?` : "What's on your mind?"}</button>
      <button onClick={() => fileInputRef.current?.click()} aria-label="Add photo" className="shrink-0 text-trust-dark hover:text-trust"><ImageIcon size={20} /></button>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
      <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarSelect} className="hidden" />
    </div>
    {avatarUpload.isPending&&<p className="mt-1 px-2 text-xs text-ink-light">Uploading profile photo…</p>}
    {avatarMessage && <p className={`mt-1 px-2 text-xs ${avatarMessage === "Profile photo updated." ? "text-trust-dark" : "text-flag"}`}>{avatarMessage}</p>}
  </div>;

  return <form onSubmit={handleSubmit} className="rounded-2xl border border-paper-dim bg-white shadow-sm px-5 py-4">
    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
    <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarSelect} className="hidden" />
    {showHomeTopicPicker && <div className="mb-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">What kind of post is this?</p><div className="flex flex-wrap gap-2">{HOME_TOPICS.map((item) => <button key={item.value} type="button" onClick={() => setTopic(item.value)} title={item.help} className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${topic === item.value ? "border-brand bg-brand-light text-brand-dark" : "border-ink-faint/30 text-ink-light hover:bg-paper-dim"}`}>{item.label}</button>)}</div><p className="mt-2 text-xs text-ink-faint">Jobs, scholarships and admissions belong in Opportunities, not the Home feed.</p></div>}
    {showCategoryPicker && <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mb-2 rounded-full border border-ink-faint/30 bg-paper-dim/50 px-3 py-1 text-xs font-medium text-ink-light outline-none focus:border-brand"><option value="">Motivation / Story (Home feed)</option>{categories?.map((cat) => <option key={cat.id} value={cat.id}>{cat.name} feed</option>)}</select>}
    <textarea autoFocus value={content} onChange={(e) => setContent(e.target.value)} placeholder={placeholder ?? "Share a story, a project, or something you've learned…"} rows={3} className="w-full resize-none text-[15px] outline-none placeholder:text-ink-faint" />
    {imagePreview && <div className="relative mt-2 inline-block"><img src={imagePreview} alt="" className="max-h-64 rounded-lg object-cover" /><button type="button" onClick={clearImage} className="absolute right-2 top-2 rounded-full bg-ink/70 p-1 text-paper hover:bg-ink" aria-label="Remove image"><X size={14} /></button></div>}
    <div className="mt-3 flex items-center justify-between border-t border-paper-dim pt-3"><button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-ink-light hover:bg-paper-dim"><ImageIcon size={16} /> Photo</button><div className="flex items-center gap-2"><button type="button" onClick={() => { setExpanded(false); setContent(""); clearImage(); }} className="rounded-full px-3 py-1.5 text-sm text-ink-faint hover:bg-paper-dim">Cancel</button><button type="submit" disabled={!content.trim() || createPost.isPending || (showHomeTopicPicker && !topic)} className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-40">{createPost.isPending ? "Posting…" : "Post"}</button></div></div>
    {createPost.error && <p className="mt-2 text-sm text-flag">{(createPost.error as Error).message}</p>}
  </form>;
}
