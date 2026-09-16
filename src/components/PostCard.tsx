import { useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, MoreHorizontal, Pencil, Share2, ShieldCheck, Trash2, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTogglePostReaction } from "../hooks/useFeedPosts";
import { useComments, useCreateComment } from "../hooks/useComments";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import { ReportButton } from "./ReportButton";
import { ProfilePhotoViewer } from "./ProfilePhotoViewer";
import type { PostReactionType, PostWithAuthor } from "../hooks/useFeedPosts";

const COMMENT_EMOJIS = ["😀", "😂", "🔥", "👏", "🎉", "💯", "🤝", "🙌"];
const POST_REACTIONS: { type: PostReactionType; emoji: string; label: string }[] = [
  { type: "like", emoji: "❤️", label: "Like" },
  { type: "spark", emoji: "✨", label: "Spark" },
  { type: "insightful", emoji: "💡", label: "Insightful" },
  { type: "useful", emoji: "👍", label: "Useful" },
];

function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("posts").update({ status: "removed" }).eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed-posts"] }),
  });
}

function useEditPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const { error } = await supabase.from("posts").update({ content }).eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed-posts"] }),
  });
}

function useDeleteComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("comments").update({ deleted_at: new Date().toISOString() }).eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}

function timeAgo(dateString: string) {
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
  const [photo, setPhoto] = useState<{ src: string; name: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await createComment.mutateAsync(text.trim());
    setText("");
  }

  return (
    <div className="mt-3 space-y-3 border-t border-paper-dim pt-3">
      {isLoading && <p className="text-sm text-ink-faint">Loading comments…</p>}
      {comments?.map((c) => {
        const name = c.profiles?.full_name ?? "A member of the community";
        const path = profilePath(c.author_id, c.profiles?.username, userId);
        return (
          <div key={c.id} className="flex gap-2.5">
            {c.profiles?.avatar_url ? (
              <button type="button" onClick={() => setPhoto({ src: c.profiles!.avatar_url!, name })} className="h-7 w-7 shrink-0 rounded-full">
                <img src={c.profiles.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
              </button>
            ) : (
              <Link to={path} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper-dim text-xs font-medium text-ink-light">
                {name.charAt(0).toUpperCase()}
              </Link>
            )}
            <div className="flex-1 rounded-lg bg-paper px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <Link to={path} className="text-xs font-medium hover:underline">{name}</Link>
                {userId === c.author_id && (
                  <button onClick={() => deleteComment.mutate(c.id)} className="text-ink-faint hover:text-flag"><Trash2 size={12} /></button>
                )}
              </div>
              <p className="text-sm text-ink">{c.content}</p>
            </div>
          </div>
        );
      })}
      {userId ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment…" className="flex-1 rounded-full border border-ink-faint/30 px-3 py-1.5 text-sm outline-none focus:border-trust" />
            <button disabled={!text.trim() || createComment.isPending} className="rounded-full bg-ink px-3 py-1.5 text-sm font-medium text-paper disabled:opacity-40">Send</button>
          </div>
          <div className="flex flex-wrap gap-1" aria-label="Add emoji to comment">
            {COMMENT_EMOJIS.map((emoji) => (
              <button key={emoji} type="button" onClick={() => setText((value) => `${value}${value && !value.endsWith(" ") ? " " : ""}${emoji}`)} className="rounded-full px-2 py-1 text-base hover:bg-paper-dim" aria-label={`Add ${emoji}`}>{emoji}</button>
            ))}
          </div>
        </form>
      ) : (
        <p className="text-sm text-ink-faint">Sign in to comment.</p>
      )}
      {photo && <ProfilePhotoViewer src={photo.src} name={photo.name} onClose={() => setPhoto(null)} />}
    </div>
  );
}

export function PostCard({ post }: { post: PostWithAuthor }) {
  const { userId } = useAuth();
  const toggleReaction = useTogglePostReaction();
  const deletePost = useDeletePost();
  const editPost = useEditPost();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const name = post.profiles?.full_name ?? "A member of the community";
  const initial = name.charAt(0).toUpperCase();
  const longPost = post.content.length > 420 || post.content.split("\n").length > 7;
  const path = profilePath(post.author_id, post.profiles?.username, userId);
  const headline = post.profiles?.headline || post.profiles?.profession;
  const topicLabel = post.topic ? post.topic.charAt(0).toUpperCase() + post.topic.slice(1) : null;
  const isOwner = userId === post.author_id;

  if (deleted) return null;

  async function handleDelete() {
    await deletePost.mutateAsync(post.id);
    setDeleted(true);
  }

  async function handleSave() {
    const clean = editText.trim();
    if (!clean) return;
    await editPost.mutateAsync({ postId: post.id, content: clean });
    post.content = clean;
    setEditing(false);
    setMenuOpen(false);
  }

  async function handleShare() {
    const shareUrl = `${window.location.origin}/?post=${post.id}`;
    const shareText = post.content.length > 180 ? `${post.content.slice(0, 177)}…` : post.content;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name} on POSSARA`, text: shareText, url: shareUrl });
        setShareStatus("Shared");
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setShareStatus("Copied");
      }
      window.setTimeout(() => setShareStatus(null), 1800);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setShareStatus("Couldn't share");
        window.setTimeout(() => setShareStatus(null), 1800);
      }
    }
  }

  return (
    <article className="relative rounded-2xl border border-paper-dim bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {post.profiles?.avatar_url ? (
            <button type="button" onClick={() => setPhotoOpen(true)} className="h-10 w-10 shrink-0 rounded-full" aria-label={`View ${name} profile photo`}>
              <img src={post.profiles.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            </button>
          ) : (
            <Link to={path} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-trust-light text-sm font-medium text-trust-dark">{initial}</Link>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link to={path} className="truncate text-[15px] font-medium leading-tight hover:underline">{name}</Link>
              {(post.author_role === "admin" || post.author_role === "moderator") && (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-trust-light px-1.5 py-0.5 text-[11px] font-medium text-trust-dark"><ShieldCheck size={10} />Official</span>
              )}
            </div>
            {headline && <Link to={path} className="block truncate text-xs text-ink-light hover:underline">{headline}</Link>}
            <div className="flex items-center gap-2 text-xs text-ink-faint">
              <span>{timeAgo(post.created_at)}</span>
              {topicLabel && <><span>·</span><span>{topicLabel}</span></>}
            </div>
          </div>
        </div>

        {(userId || isOwner) && (
          <div className="relative">
            <button type="button" onClick={() => setMenuOpen((value) => !value)} className="rounded-full p-2 text-ink-faint hover:bg-paper-dim hover:text-ink" aria-label="Post options">
              <MoreHorizontal size={19} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-20 w-72 overflow-hidden rounded-xl border border-paper-dim bg-white py-1 shadow-lg">
                {isOwner && (
                  <>
                    <button onClick={() => { setEditing(true); setMenuOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-paper"><Pencil size={14} />Edit post</button>
                    <button onClick={() => { setConfirmingDelete(true); setMenuOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-flag hover:bg-paper"><Trash2 size={14} />Delete post</button>
                  </>
                )}
                {!isOwner && userId && (
                  <div className="border-t border-paper-dim px-3 py-2 first:border-t-0">
                    <ReportButton postId={post.id} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-3 rounded-xl border border-brand/20 bg-paper p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-light">Edit post</span>
            <button onClick={() => { setEditing(false); setEditText(post.content); }}><X size={16} /></button>
          </div>
          <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={4} className="w-full resize-none rounded-lg border border-ink-faint/25 bg-white p-3 text-sm outline-none focus:border-brand" />
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => { setEditing(false); setEditText(post.content); }} className="rounded-full px-3 py-1.5 text-sm text-ink-light">Cancel</button>
            <button onClick={handleSave} disabled={!editText.trim() || editPost.isPending} className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40">{editPost.isPending ? "Saving…" : "Save"}</button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{expanded || !longPost ? post.content : collapsedContent(post.content)}</p>
          {longPost && <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-1 text-sm font-medium text-brand-dark hover:underline">{expanded ? "See less" : "See more"}</button>}
        </div>
      )}

      {post.media_urls?.[0] && <img src={post.media_urls[0]} alt="" className="mt-3 w-full rounded-lg object-cover" style={{ maxHeight: "480px" }} />}

      {confirmingDelete && (
        <div className="mt-3 rounded-xl border border-flag/20 bg-red-50 p-3 text-sm">
          <p className="font-medium text-ink">Delete this post?</p>
          <p className="mt-1 text-xs text-ink-light">This action cannot be undone.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={handleDelete} disabled={deletePost.isPending} className="rounded-full bg-flag px-4 py-1.5 font-medium text-white">{deletePost.isPending ? "Deleting…" : "Delete"}</button>
            <button onClick={() => setConfirmingDelete(false)} className="rounded-full bg-white px-4 py-1.5 text-ink-light">Cancel</button>
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-paper-dim pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-full bg-paper/80 p-1" aria-label="React to this post">
            {POST_REACTIONS.map((reaction) => {
              const selected = post.viewer_reaction === reaction.type;
              const count = post.reaction_counts[reaction.type] ?? 0;
              return (
                <button
                  key={reaction.type}
                  type="button"
                  title={reaction.label}
                  aria-label={`${reaction.label}${count ? `, ${count}` : ""}`}
                  onClick={() => toggleReaction.mutate({ postId: post.id, reaction: reaction.type, currentReaction: post.viewer_reaction })}
                  disabled={toggleReaction.isPending}
                  className={`inline-flex min-h-9 items-center gap-1 rounded-full px-2.5 text-sm transition ${selected ? "bg-white shadow-sm ring-1 ring-brand/15" : "hover:bg-white"}`}
                >
                  <span className="text-base leading-none">{reaction.emoji}</span>
                  {count > 0 && <span className="text-xs font-medium text-ink-light">{count}</span>}
                </button>
              );
            })}
          </div>

          <button onClick={() => setCommentsOpen((value) => !value)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-ink-light hover:bg-paper-dim">
            <MessageCircle size={15} />{post.comment_count > 0 ? post.comment_count : ""} Comment
          </button>

          <button type="button" onClick={handleShare} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-ink-light hover:bg-paper-dim">
            <Share2 size={15} />{shareStatus ?? "Share"}
          </button>
        </div>
        {post.reaction_count > 0 && <p className="mt-2 text-xs text-ink-faint">{post.reaction_count} {post.reaction_count === 1 ? "reaction" : "reactions"}</p>}
      </div>

      {commentsOpen && <CommentThread postId={post.id} />}
      {photoOpen && post.profiles?.avatar_url && <ProfilePhotoViewer src={post.profiles.avatar_url} name={name} onClose={() => setPhotoOpen(false)} />}
    </article>
  );
}
