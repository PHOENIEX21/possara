import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, MoreHorizontal, Pencil, Share2, Trash2, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useComments, useCreateComment, useDeleteComment, useEditComment } from "../hooks/useComments";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import { useRepost } from "../hooks/useRepost";
import { usePostStory } from "../hooks/useStories";
import { useMemberTrustRank } from "../hooks/useTrustRank";
import { InAppShareDialog } from "./InAppShareDialog";
import { ReportButton } from "./ReportButton";
import { ProfilePhotoViewer } from "./ProfilePhotoViewer";
import { PostReactionControl } from "./PostReactionControl";
import { TrustRankBadge } from "./TrustRankBadge";
import { MemberFollowButton } from "./MemberFollowButton";
import { MentionText } from "./MentionText";
import { MentionSuggestions } from "./MentionSuggestions";
import { CommentReactionControl } from "./CommentReactionControl";
import type { PostWithAuthor } from "../hooks/useFeedPosts";

const COMMENT_EMOJIS = ["😀", "😂", "🔥", "👏", "🎉", "💯", "🤝", "🙌"];

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

function CommentTrustBadge({ userId }: { userId: string | null }) {
  const { data: rank } = useMemberTrustRank(userId);
  return <TrustRankBadge rank={rank} compact />;
}

function CommentThread({ postId }: { postId: string }) {
  const { userId } = useAuth();
  const { data: comments, isLoading, error: commentsError } = useComments(postId, true);
  const createComment = useCreateComment(postId);
  const editComment = useEditComment(postId);
  const deleteComment = useDeleteComment(postId);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ parentId: string; name: string; username: string | null } | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [manageComment, setManageComment] = useState<{ id: string; text: string } | null>(null);
  const [photo, setPhoto] = useState<{ src: string; name: string } | null>(null);
  const holdTimer = useRef<number | null>(null);

  function clearHold() {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  function beginHold(commentId: string, content: string, mine: boolean) {
    clearHold();
    if (!mine) return;
    holdTimer.current = window.setTimeout(() => {
      setManageComment({ id: commentId, text: content });
      holdTimer.current = null;
    }, 520);
  }

  function chooseReply(comment: NonNullable<typeof comments>[number], rootId: string) {
    const username = comment.profiles?.username ?? null;
    const name = comment.profiles?.full_name ?? username ?? "member";
    setReplyTo({ parentId: rootId, name, username });
    setText(username ? `@${username} ` : "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await createComment.mutateAsync({ content: text.trim(), parentId: replyTo?.parentId ?? null });
    setText("");
    setReplyTo(null);
  }

  async function saveEdit() {
    if (!editing?.text.trim()) return;
    await editComment.mutateAsync({ commentId: editing.id, content: editing.text.trim() });
    setEditing(null);
  }

  const rows = comments ?? [];
  const byId = new Map(rows.map((comment) => [comment.id, comment]));

  function rootIdFor(comment: (typeof rows)[number]) {
    let current = comment;
    const seen = new Set<string>();
    while (current.parent_id && !seen.has(current.id)) {
      seen.add(current.id);
      const parent = byId.get(current.parent_id);
      if (!parent) break;
      current = parent;
    }
    return current.id;
  }

  const roots = rows.filter((comment) => !comment.parent_id);
  const repliesByRoot = new Map<string, typeof rows>();
  rows.filter((comment) => !!comment.parent_id).forEach((comment) => {
    const root = rootIdFor(comment);
    const list = repliesByRoot.get(root) ?? [];
    list.push(comment);
    repliesByRoot.set(root, list);
  });

  function CommentRow({ comment, rootId, isReply = false }: { comment: (typeof rows)[number]; rootId: string; isReply?: boolean }) {
    const name = comment.profiles?.full_name ?? "A member of the community";
    const path = profilePath(comment.author_id, comment.profiles?.username, userId);
    const mine = userId === comment.author_id;

    return (
      <div className={`flex gap-2.5 ${isReply ? "ml-8 sm:ml-10" : ""}`}>
        {comment.profiles?.avatar_url ? (
          <button type="button" onClick={() => setPhoto({ src: comment.profiles!.avatar_url!, name })} className="h-8 w-8 shrink-0 rounded-full" aria-label={`View ${name} profile photo`}>
            <img src={comment.profiles.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
          </button>
        ) : (
          <Link to={path} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-dim text-xs font-semibold text-ink-light">
            {name.charAt(0).toUpperCase()}
          </Link>
        )}

        <div className="min-w-0 flex-1">
          <div
            className="rounded-2xl bg-paper px-3 py-2.5"
            onPointerDown={() => beginHold(comment.id, comment.content, mine)}
            onPointerUp={clearHold}
            onPointerCancel={clearHold}
            onPointerLeave={clearHold}
            onContextMenu={(event) => {
              if (!mine) return;
              event.preventDefault();
              clearHold();
              setManageComment({ id: comment.id, text: comment.content });
            }}
          >
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <Link to={path} className="truncate text-[14px] font-semibold leading-tight text-ink hover:underline">{name}</Link>
              <CommentTrustBadge userId={comment.author_id} />
              <span className="text-[10px] text-ink-faint">{timeAgo(comment.created_at)}</span>
            </div>

            {editing?.id === comment.id ? (
              <div className="mt-2">
                <textarea
                  value={editing.text}
                  onChange={(event) => setEditing({ id: comment.id, text: event.target.value })}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-ink-faint/25 bg-white p-2 text-sm outline-none focus:border-brand"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setEditing(null)} className="text-xs font-semibold text-ink-faint">Cancel</button>
                  <button type="button" onClick={saveEdit} disabled={editComment.isPending || !editing.text.trim()} className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white disabled:opacity-40">Save</button>
                </div>
              </div>
            ) : (
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink"><MentionText text={comment.content}/></p>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-3 px-2">
            <CommentReactionControl postId={postId} comment={comment}/>
            {userId && (
              <button type="button" onClick={() => chooseReply(comment, rootId)} className="text-[12px] font-semibold text-ink-faint hover:text-ink">Reply</button>
            )}
            {mine && <span className="text-[10px] text-ink-faint">Hold for options</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-paper-dim pt-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-ink">Discussion</h3>
        {!isLoading && rows.length > 0 && <span className="text-xs text-ink-faint">{rows.length}</span>}
      </div>

      <div className="max-h-[34rem] space-y-4 overflow-y-auto overscroll-contain pr-1">
        {isLoading && <p className="py-3 text-sm text-ink-faint">Loading discussion…</p>}
        {commentsError && <p className="py-3 text-sm text-flag">Couldn&apos;t load discussion.</p>}
        {!isLoading && !commentsError && rows.length === 0 && (
          <div className="rounded-2xl bg-paper px-4 py-6 text-center">
            <MessageCircle className="mx-auto mb-2 text-ink-faint" size={22} />
            <p className="font-medium text-ink">No discussion yet</p>
            <p className="mt-1 text-xs text-ink-faint">Be the first to add something useful.</p>
          </div>
        )}

        {roots.map((root) => (
          <div key={root.id} className="space-y-2.5">
            <CommentRow comment={root} rootId={root.id}/>
            {(repliesByRoot.get(root.id) ?? []).map((reply) => <CommentRow key={reply.id} comment={reply} rootId={root.id} isReply/> )}
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 mt-3 bg-white pt-1">
        {userId ? (
          <form onSubmit={handleSubmit} className="space-y-2 border-t border-paper-dim pt-3">
            {replyTo && (
              <div className="flex items-center justify-between rounded-xl bg-brand-light px-3 py-2 text-xs text-brand-dark">
                <span>Replying to {replyTo.username ? `@${replyTo.username}` : replyTo.name}</span>
                <button type="button" onClick={() => { setReplyTo(null); setText(""); }} className="font-bold">×</button>
              </div>
            )}

            <div className="relative">
              <div className="flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={replyTo ? "Write a reply…" : "Write a comment…"}
                  aria-label={replyTo ? "Write a reply" : "Write a comment"}
                  className="min-w-0 flex-1 rounded-full border border-ink-faint/30 bg-white px-3 py-2 text-sm outline-none focus:border-trust"
                />
                <button disabled={!text.trim() || createComment.isPending} className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{createComment.isPending ? "Sending…" : "Send"}</button>
              </div>
              <MentionSuggestions value={text} onChange={setText}/>
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1" aria-label="Add emoji">
              {COMMENT_EMOJIS.map((emoji) => (
                <button key={emoji} type="button" onClick={() => setText((value) => `${value}${value && !value.endsWith(" ") ? " " : ""}${emoji}`)} className="shrink-0 rounded-full px-2 py-1 text-base hover:bg-paper-dim" aria-label={`Add ${emoji}`}>{emoji}</button>
              ))}
            </div>
            {createComment.isError && <p className="text-xs text-flag">Couldn&apos;t post that comment. Please try again.</p>}
          </form>
        ) : (
          <p className="border-t border-paper-dim pt-3 text-sm text-ink-faint">Sign in to join the discussion.</p>
        )}
      </div>

      {manageComment && (
        <div className="fixed inset-0 z-[95] flex items-end bg-ink/45 sm:items-center sm:justify-center sm:p-4" onClick={() => setManageComment(null)}>
          <div className="w-full rounded-t-3xl bg-white p-4 shadow-2xl sm:max-w-sm sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-paper-dim sm:hidden"/>
            <p className="mb-3 text-sm font-semibold text-ink">Comment options</p>
            <button type="button" onClick={() => { setEditing({ id: manageComment.id, text: manageComment.text }); setManageComment(null); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-paper"><Pencil size={16}/>Edit</button>
            <button type="button" onClick={async () => { await deleteComment.mutateAsync(manageComment.id); setManageComment(null); }} disabled={deleteComment.isPending} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-medium text-flag hover:bg-red-50"><Trash2 size={16}/>Delete</button>
          </div>
        </div>
      )}

      {photo && <ProfilePhotoViewer src={photo.src} name={photo.name} onClose={() => setPhoto(null)} />}
    </div>
  );
}

export function PostCard({ post }: { post: PostWithAuthor }) {
  const { userId } = useAuth();
  const { data: trustRank } = useMemberTrustRank(post.author_id);
  const deletePost = useDeletePost();
  const editPost = useEditPost();
  const repost = useRepost();
  const postStory = usePostStory();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);
  const [shareOpen, setShareOpen] = useState(false);
  const [mediaOpen,setMediaOpen]=useState<string|null>(null);

  const name = post.profiles?.full_name ?? "A member of the community";
  const initial = name.charAt(0).toUpperCase();
  const displayContent = post.shared_from_post && /^Shared from /i.test(post.content) ? "" : post.content;
  const longPost = displayContent.length > 420 || displayContent.split("\n").length > 7;
  const path = profilePath(post.author_id, post.profiles?.username, userId);
  const headline = post.profiles?.headline || post.profiles?.profession;
  const topicLabel = post.topic ? post.topic.charAt(0).toUpperCase() + post.topic.slice(1) : null;
  const isOwner = userId === post.author_id;
  const sourceText = post.shared_from_post?.content ?? displayContent;
  const sharePreview = sourceText.length > 180 ? `${sourceText.slice(0, 177)}…` : sourceText;
  const sharePath = `/post/${post.id}`;
  const postExtras=post as PostWithAuthor & {music_path?:string|null;music_title?:string|null;feeling?:string|null};
  const musicUrl=postExtras.music_path?supabase.storage.from("post-music").getPublicUrl(postExtras.music_path).data.publicUrl:null;
  const feelingLabel=postExtras.feeling?({happy:"😊 Happy",grateful:"🙏 Grateful",excited:"🤩 Excited",celebrating:"🎉 Celebrating",birthday:"🎂 Celebrating a birthday",proud:"🙌 Proud",blessed:"✨ Blessed",motivated:"💪 Motivated"} as Record<string,string>)[postExtras.feeling]??postExtras.feeling:null;

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

  async function shareToMoment() {
    const body = `Shared from ${name} on POSSARA\n\n${sharePreview}\n\n${window.location.origin}${sharePath}`.slice(0, 700);
    await postStory.mutateAsync({ textBody: body, backgroundStyle: "midnight", audience: "public" });
  }

  return (
    <article className="relative rounded-2xl border border-paper-dim bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 pr-2">
          {post.profiles?.avatar_url ? (
            <button type="button" onClick={() => setPhotoOpen(true)} className="h-10 w-10 shrink-0 rounded-full" aria-label={`View ${name} profile photo`}>
              <img src={post.profiles.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            </button>
          ) : (
            <Link to={path} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-trust-light text-sm font-medium text-trust-dark">{initial}</Link>
          )}
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <Link to={path} className="truncate text-[15px] font-medium leading-tight hover:underline">{name}</Link>
              <TrustRankBadge rank={trustRank} compact />
            </div>
            {headline && <Link to={path} className="block truncate text-xs text-ink-light hover:underline">{headline}</Link>}
            <div className="flex items-center gap-2 text-xs text-ink-faint">
              <Link to={sharePath} className="hover:underline">{timeAgo(post.created_at)}</Link>
              {topicLabel && <><span>·</span><span>{topicLabel}</span></>}{feelingLabel&&<><span>·</span><span>{feelingLabel}</span></>}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <MemberFollowButton targetUserId={post.author_id} compact />
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
      </div>

      {!editing&&<Link to={sharePath} aria-label="Open this post" className="absolute inset-x-16 top-0 h-16 rounded-xl" />}

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
          {displayContent && <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink"><MentionText text={expanded || !longPost ? displayContent : collapsedContent(displayContent)}/></p>}
          {longPost && <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-1 text-sm font-medium text-brand-dark hover:underline">{expanded ? "See less" : "See more"}</button>}
        </div>
      )}

      {post.shared_from_post && (() => {
        const original = post.shared_from_post;
        const originalName = original.profiles?.full_name ?? original.profiles?.username ?? "POSSARA member";
        const originalPath = profilePath(original.author_id, original.profiles?.username, userId);
        return <div className="mt-3 overflow-hidden rounded-2xl border border-paper-dim bg-paper/35">
          <div className="flex items-center gap-2.5 border-b border-paper-dim px-3 py-2.5">
            {original.profiles?.avatar_url ? <img src={original.profiles.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover"/> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-trust-light text-xs font-semibold text-trust-dark">{originalName.charAt(0).toUpperCase()}</span>}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-ink-faint">Passed on from</p>
              <Link to={originalPath} className="block truncate text-sm font-semibold text-ink hover:underline">{originalName}{original.profiles?.username ? ` · @${original.profiles.username}` : ""}</Link>
            </div>
          </div>
          {original.content && <p className="px-3 py-3 text-sm leading-6 text-ink"><MentionText text={collapsedContent(original.content, 300)}/></p>}
          {original.media_urls?.[0] && <img src={original.media_urls[0]} alt="" className="max-h-[420px] w-full object-cover"/>}
          <Link to={`/post/${original.id}`} className="block border-t border-paper-dim px-3 py-2 text-xs font-semibold text-brand-dark hover:bg-white">Open original post →</Link>
        </div>;
      })()}

      {!post.shared_from_post && post.media_urls?.[0] && <img src={post.media_urls[0]} alt="" className="mt-3 w-full rounded-lg object-cover" style={{ maxHeight: "480px" }} />}

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

      <div className="mt-4 border-t border-paper-dim pt-2">
        <div className="flex flex-wrap items-center gap-1">
          <PostReactionControl post={post} />

          <button onClick={() => setCommentsOpen((value) => !value)} aria-expanded={commentsOpen} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-semibold text-ink-light hover:bg-paper-dim">
            <MessageCircle size={17} />{post.comment_count > 0 ? post.comment_count : ""} Discuss
          </button>

          <button type="button" onClick={() => setShareOpen(true)} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-semibold text-ink-light hover:bg-paper-dim">
            <Share2 size={17} />{post.share_count > 0 ? post.share_count : ""} Pass on
          </button>
        </div>
      </div>

      {commentsOpen && <CommentThread postId={post.id} />}
      {mediaOpen&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 sm:p-8" onClick={()=>setMediaOpen(null)}><button type="button" onClick={()=>setMediaOpen(null)} className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white" aria-label="Close image"><X size={22}/></button><img src={mediaOpen} alt="" className="max-h-full max-w-full object-contain" onClick={e=>e.stopPropagation()}/></div>}
      {photoOpen && post.profiles?.avatar_url && <ProfilePhotoViewer src={post.profiles.avatar_url} name={name} onClose={() => setPhotoOpen(false)} />}
      <InAppShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={`${name} on POSSARA`}
        preview={sharePreview}
        path={sharePath}
        onShareToProfile={() => repost.mutateAsync(post.id)}
        onShareToMoment={shareToMoment}
      />
    </article>
  );
}
