import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Heart, MessageCircle, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTogglePostReaction } from "../hooks/useFeedPosts";
import { useComments, useCreateComment } from "../hooks/useComments";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import { ReportButton } from "./ReportButton";
import { ProfilePhotoViewer } from "./ProfilePhotoViewer";
import type { PostWithAuthor } from "../hooks/useFeedPosts";

function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("posts").update({ status: "removed" }).eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed-posts"] }),
  });
}

function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("comments").update({ deleted_at: new Date().toISOString() }).eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function collapsedContent(content: string, maxChars = 420) {
  if (content.length <= maxChars) return content;
  const slice = content.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > 280 ? lastSpace : maxChars).trimEnd()}…`;
}

function profilePath(userId: string | null, username: string | null | undefined, currentUserId: string | null) {
  if (!userId) return "/connect";
  if (userId === currentUserId) return "/profile/me";
  return username ? `/profile/${username}` : `/profile/id/${userId}`;
}

function CommentThread({ postId }: { postId: string }) {
  const { userId } = useAuth();
  const { data: comments, isLoading } = useComments(postId, true);
  const createComment = useCreateComment(postId);
  const deleteComment = useDeleteComment(postId);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<{src:string;name:string}|null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await createComment.mutateAsync(text.trim());
    setText("");
  }

  return <div className="mt-3 space-y-3 border-t border-paper-dim pt-3">
    {isLoading && <p className="text-sm text-ink-faint">Loading comments…</p>}
    {comments?.map((c) => {
      const name = c.profiles?.full_name ?? "A member of the community";
      const path = profilePath(c.author_id, c.profiles?.username, userId);
      return <div key={c.id} className="flex gap-2.5">
        {c.profiles?.avatar_url?<button type="button" onClick={()=>setPhoto({src:c.profiles!.avatar_url!,name})} className="h-7 w-7 shrink-0 rounded-full"><img src={c.profiles.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover"/></button>:<Link to={path} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper-dim text-xs font-medium text-ink-light">{name.charAt(0).toUpperCase()}</Link>}
        <div className="flex-1 rounded-lg bg-paper px-3 py-2">
          <div className="flex items-start justify-between gap-2"><Link to={path} className="text-xs font-medium hover:underline">{name}</Link>{userId === c.author_id && <button onClick={() => deleteComment.mutate(c.id)} disabled={deleteComment.isPending} className="text-ink-faint hover:text-flag" aria-label="Delete comment"><Trash2 size={12} /></button>}</div>
          <p className="text-sm text-ink">{c.content}</p>
        </div>
      </div>;
    })}
    {userId ? <form onSubmit={handleSubmit} className="flex gap-2"><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment…" className="flex-1 rounded-full border border-ink-faint/30 px-3 py-1.5 text-sm outline-none focus:border-trust" /><button type="submit" disabled={!text.trim() || createComment.isPending} className="rounded-full bg-ink px-3 py-1.5 text-sm font-medium text-paper disabled:opacity-40">Send</button></form> : <p className="text-sm text-ink-faint">Sign in to comment.</p>}
    {photo&&<ProfilePhotoViewer src={photo.src} name={photo.name} onClose={()=>setPhoto(null)}/>} 
  </div>;
}

export function PostCard({ post }: { post: PostWithAuthor }) {
  const { userId } = useAuth();
  const toggleReaction = useTogglePostReaction();
  const deletePost = useDeletePost();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [photoOpen,setPhotoOpen]=useState(false);
  const name = post.profiles?.full_name ?? "A member of the community";
  const initial = name.charAt(0).toUpperCase();
  const longPost = post.content.length > 420 || post.content.split("\n").length > 7;
  const path = profilePath(post.author_id, post.profiles?.username, userId);
  const headline = post.profiles?.headline || post.profiles?.profession;
  const topicLabel = post.topic ? post.topic.charAt(0).toUpperCase()+post.topic.slice(1) : null;

  if (deleted) return null;

  async function handleDelete() {
    await deletePost.mutateAsync(post.id);
    setDeleted(true);
  }

  return <article className="rounded-2xl border border-paper-dim bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {post.profiles?.avatar_url?<button type="button" onClick={()=>setPhotoOpen(true)} className="h-10 w-10 shrink-0 rounded-full" aria-label={`View ${name} profile photo`}><img src={post.profiles.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /></button>:<Link to={path} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-trust-light text-sm font-medium text-trust-dark">{initial}</Link>}
        <div className="min-w-0"><div className="flex items-center gap-1.5"><Link to={path} className="truncate text-[15px] font-medium leading-tight hover:underline">{name}</Link>{(post.author_role === "admin" || post.author_role === "moderator") && <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-trust-light px-1.5 py-0.5 text-[11px] font-medium text-trust-dark" title="Official post from the POSSARA team"><ShieldCheck size={10} /> Official</span>}</div>{headline&&<Link to={path} className="block truncate text-xs text-ink-light hover:underline">{headline}</Link>}<div className="flex items-center gap-2 text-xs text-ink-faint"><span>{timeAgo(post.created_at)}</span>{topicLabel&&<><span>·</span><span>{topicLabel}</span></>}</div></div>
      </div>
      {userId === post.author_id && (confirmingDelete ? <div className="flex shrink-0 items-center gap-2 text-xs"><span className="text-ink-faint">Delete this post?</span><button onClick={handleDelete} disabled={deletePost.isPending} className="font-medium text-flag hover:underline">Yes</button><button onClick={() => setConfirmingDelete(false)} className="text-ink-faint hover:underline">No</button></div> : <button onClick={() => setConfirmingDelete(true)} className="text-ink-faint hover:text-flag" aria-label="Delete post"><Trash2 size={15} /></button>)}
    </div>

    <div className="mt-3">
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{expanded || !longPost ? post.content : collapsedContent(post.content)}</p>
      {longPost && <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 text-sm font-medium text-brand-dark hover:underline">{expanded ? "See less" : "See more"}</button>}
    </div>

    {post.media_urls?.[0] && <img src={post.media_urls[0]} alt="" className="mt-3 w-full rounded-lg object-cover" style={{ maxHeight: "480px" }} />}

    <div className="mt-4 flex items-center gap-4 border-t border-paper-dim pt-3">
      <button onClick={() => toggleReaction.mutate({ postId: post.id, currentlyReacted: post.viewer_reacted })} disabled={toggleReaction.isPending} className={"inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition " + (post.viewer_reacted ? "bg-spark-light text-spark-dark" : "text-ink-light hover:bg-paper-dim")}><Heart size={15} />{post.spark_count > 0 ? post.spark_count : ""} Spark</button>
      <button onClick={() => setCommentsOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-ink-light transition hover:bg-paper-dim"><MessageCircle size={15} />{post.comment_count > 0 ? post.comment_count : ""} Comment</button>
      <div className="ml-auto"><ReportButton postId={post.id} /></div>
    </div>
    {commentsOpen && <CommentThread postId={post.id} />}
    {photoOpen&&post.profiles?.avatar_url&&<ProfilePhotoViewer src={post.profiles.avatar_url} name={name} onClose={()=>setPhotoOpen(false)}/>} 
  </article>;
}
