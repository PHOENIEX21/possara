import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useActiveStories, usePostStory } from "../hooks/useStories";
import { useAuth } from "../store/auth";
import type { AuthorWithStories } from "../hooks/useStories";

function StoryViewer({ group, onClose }: { group: AuthorWithStories; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const story = group.stories[index];
  function next() { if (index < group.stories.length - 1) setIndex(index + 1); else onClose(); }
  function prev() { if (index > 0) setIndex(index - 1); }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 px-4"><button onClick={onClose} className="absolute right-4 top-4 text-white hover:text-white/70" aria-label="Close"><X size={26} /></button><div className="relative w-full max-w-sm"><div className="mb-2 flex gap-1">{group.stories.map((_, i) => <div key={i} className={"h-1 flex-1 rounded-full " + (i <= index ? "bg-white" : "bg-white/30")} />)}</div><div className="mb-2 flex items-center gap-2 text-white">{group.author?.avatar_url ? <img src={group.author.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs">{(group.author?.full_name ?? "?").charAt(0).toUpperCase()}</div>}<span className="text-sm font-medium">{group.author?.full_name ?? "Member"}</span></div>{story.media_url ? <img src={story.media_url} alt="" className="max-h-[70vh] w-full rounded-lg object-cover" /> : <div className="flex h-[60vh] items-center justify-center rounded-lg bg-white/10 text-sm text-white/70">Moment unavailable</div>}{story.caption && <p className="mt-2 text-center text-sm text-white">{story.caption}</p>}<div className="mt-3 flex justify-between"><button onClick={prev} disabled={index === 0} className="text-sm text-white/70 disabled:opacity-30">Previous</button><button onClick={next} className="text-sm text-white/70">{index < group.stories.length - 1 ? "Next" : "Close"}</button></div></div></div>;
}

export function StoriesBar() {
  const { userId } = useAuth();
  const { data: groups } = useActiveStories();
  const postStory = usePostStory();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewingGroup, setViewingGroup] = useState<AuthorWithStories | null>(null);
  const otherGroups = groups?.filter((g) => g.authorId !== userId) ?? [];
  const myGroup = groups?.find((g) => g.authorId === userId);
  async function handleAddStory(e: React.ChangeEvent<HTMLInputElement>) { const file = e.target.files?.[0]; if (!file) return; await postStory.mutateAsync({ imageFile: file, caption: "" }); e.target.value = ""; }
  if (!userId && otherGroups.length === 0) return null;
  return <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1">{userId && <button onClick={() => (myGroup ? setViewingGroup(myGroup) : fileInputRef.current?.click())} className="flex shrink-0 flex-col items-center gap-1"><div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-brand/40">{myGroup ? <div className="h-full w-full rounded-full border-2 border-brand p-0.5"><div className="flex h-full w-full items-center justify-center rounded-full bg-paper text-sm font-medium text-trust-dark">You</div></div> : <Plus size={20} className="text-brand" />}</div><span className="text-[11px] text-ink-light">Your Moment</span></button>}<input ref={fileInputRef} type="file" accept="image/*" onChange={handleAddStory} className="hidden" />{otherGroups.map((group) => <button key={group.authorId} onClick={() => setViewingGroup(group)} className="flex shrink-0 flex-col items-center gap-1"><div className="h-14 w-14 rounded-full border-2 border-brand p-0.5"><div className="h-full w-full rounded-full bg-paper p-0.5">{group.author?.avatar_url ? <img src={group.author.avatar_url} alt="" className="h-full w-full rounded-full object-cover" /> : <div className="flex h-full w-full items-center justify-center rounded-full bg-trust-light text-sm font-medium text-trust-dark">{(group.author?.full_name ?? "?").charAt(0).toUpperCase()}</div>}</div></div><span className="max-w-[60px] truncate text-[11px] text-ink-light">{group.author?.full_name?.split(" ")[0] ?? "Member"}</span></button>)}{viewingGroup && <StoryViewer group={viewingGroup} onClose={() => setViewingGroup(null)} />}</div>;
}
