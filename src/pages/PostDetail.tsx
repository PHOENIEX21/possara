import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";
import { MentionText } from "../components/MentionText";

export function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const post = useQuery({
    queryKey: ["post-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id,author_id,content,media_urls,created_at,status,deleted_at,shared_from_post_id,profiles(full_name,username,avatar_url,headline,profession),shared_from_post:posts!posts_shared_from_post_id_fkey(id,author_id,content,media_urls,profiles(full_name,username,avatar_url,headline,profession))")
        .eq("id", id as string)
        .eq("status", "published")
        .is("deleted_at", null)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  if (post.isLoading) return <p className="text-sm text-ink-light">Loading post…</p>;
  if (post.error || !post.data) return <div className="rounded-2xl border border-paper-dim bg-white p-5"><p className="font-semibold">This post isn&apos;t available.</p><Link to="/" className="mt-3 inline-flex items-center gap-1 text-sm text-brand-dark underline"><ArrowLeft size={14}/>Back home</Link></div>;

  const author = Array.isArray(post.data.profiles) ? post.data.profiles[0] : post.data.profiles;
  const name = author?.full_name ?? author?.username ?? "POSSARA member";
  const profilePath = author?.username ? `/profile/${author.username}` : `/profile/id/${post.data.author_id}`;
  const sharedRaw = post.data.shared_from_post;
  const shared = Array.isArray(sharedRaw) ? sharedRaw[0] ?? null : sharedRaw ?? null;
  const sharedAuthorRaw = shared?.profiles;
  const sharedAuthor = Array.isArray(sharedAuthorRaw) ? sharedAuthorRaw[0] ?? null : sharedAuthorRaw ?? null;
  const sharedName = sharedAuthor?.full_name ?? sharedAuthor?.username ?? "POSSARA member";
  const sharedProfilePath = sharedAuthor?.username ? `/profile/${sharedAuthor.username}` : shared?.author_id ? `/profile/id/${shared.author_id}` : "/connect";
  const displayContent = shared && /^Shared from /i.test(post.data.content) ? "" : post.data.content;

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-ink-light hover:text-ink"><ArrowLeft size={15}/>Back</Link>
      <article className="rounded-3xl border border-paper-dim bg-white p-5 shadow-sm">
        <Link to={profilePath} className="flex items-center gap-3">
          {author?.avatar_url ? <img src={author.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover"/> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-trust-light font-semibold text-trust-dark">{name.charAt(0).toUpperCase()}</div>}
          <div className="min-w-0"><p className="truncate font-semibold">{name}</p>{(author?.headline || author?.profession) && <p className="truncate text-xs text-ink-faint">{author.headline || author.profession}</p>}<p className="text-[11px] text-ink-faint">{new Date(post.data.created_at).toLocaleString()}</p></div>
        </Link>
        {displayContent && <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-ink"><MentionText text={displayContent}/></p>}
        {shared && <div className="mt-4 overflow-hidden rounded-2xl border border-paper-dim bg-paper/35">
          <div className="flex items-center gap-2.5 border-b border-paper-dim px-3 py-2.5">
            {sharedAuthor?.avatar_url ? <img src={sharedAuthor.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover"/> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-trust-light text-sm font-semibold text-trust-dark">{sharedName.charAt(0).toUpperCase()}</span>}
            <div className="min-w-0 flex-1"><p className="text-[11px] text-ink-faint">Passed on from</p><Link to={sharedProfilePath} className="block truncate text-sm font-semibold hover:underline">{sharedName}{sharedAuthor?.username ? ` · @${sharedAuthor.username}` : ""}</Link></div>
          </div>
          {shared.content && <p className="px-3 py-3 text-sm leading-6"><MentionText text={shared.content}/></p>}
          {shared.media_urls?.[0] && <img src={shared.media_urls[0]} alt="" className="max-h-[70vh] w-full object-contain bg-paper"/>}
          <Link to={`/post/${shared.id}`} className="block border-t border-paper-dim px-3 py-2 text-xs font-semibold text-brand-dark hover:bg-white">Open original post →</Link>
        </div>}
        {post.data.media_urls?.[0] && <img src={post.data.media_urls[0]} alt="" className="mt-4 max-h-[70vh] w-full rounded-2xl object-contain bg-paper"/>}
      </article>
    </div>
  );
}
