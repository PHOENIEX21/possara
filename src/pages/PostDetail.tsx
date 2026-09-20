import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";
import { MentionText } from "../components/MentionText";

export function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const [mediaOpen,setMediaOpen]=useState<string|null>(null);
  const post = useQuery({
    queryKey: ["post-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id,author_id,content,media_urls,feeling,music_path,music_title,music_mime_type,created_at,status,deleted_at,shared_from_post_id,profiles(full_name,username,avatar_url,headline,profession),shared_from_post:posts!posts_shared_from_post_id_fkey(id,author_id,content,media_urls,profiles(full_name,username,avatar_url))")
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
  const musicUrl=post.data.music_path?supabase.storage.from("post-music").getPublicUrl(post.data.music_path).data.publicUrl:null;

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-ink-light hover:text-ink"><ArrowLeft size={15}/>Back</Link>
      <article className="rounded-3xl border border-paper-dim bg-white p-5 shadow-sm">
        <Link to={profilePath} className="flex items-center gap-3">
          {author?.avatar_url ? <img src={author.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover"/> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-trust-light font-semibold text-trust-dark">{name.charAt(0).toUpperCase()}</div>}
          <div className="min-w-0"><p className="truncate font-semibold">{name}</p>{(author?.headline || author?.profession) && <p className="truncate text-xs text-ink-faint">{author.headline || author.profession}</p>}<p className="text-[11px] text-ink-faint">{new Date(post.data.created_at).toLocaleString()}</p></div>
        </Link>
        {post.data.feeling&&<p className="mt-3 text-sm font-medium text-brand-dark">{({happy:"😊 Happy",grateful:"🙏 Grateful",excited:"🤩 Excited",celebrating:"🎉 Celebrating",birthday:"🎂 Celebrating a birthday",proud:"🙌 Proud",blessed:"✨ Blessed",motivated:"💪 Motivated"} as Record<string,string>)[post.data.feeling]??post.data.feeling}</p>}{post.data.content && <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-ink"><MentionText text={post.data.content}/></p>}
        {post.data.shared_from_post && (()=>{const original=Array.isArray(post.data.shared_from_post)?post.data.shared_from_post[0]:post.data.shared_from_post;if(!original)return null;const originalProfile=Array.isArray(original.profiles)?original.profiles[0]:original.profiles;const originalName=originalProfile?.full_name??originalProfile?.username??"POSSARA member";const originalPath=originalProfile?.username?`/profile/${originalProfile.username}`:`/profile/id/${original.author_id}`;return <div className="mt-4 overflow-hidden rounded-2xl border border-paper-dim bg-paper/40"><div className="flex items-center gap-2.5 border-b border-paper-dim p-3">{originalProfile?.avatar_url?<img src={originalProfile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover"/>:<span className="flex h-9 w-9 items-center justify-center rounded-full bg-trust-light text-sm font-semibold text-trust-dark">{originalName.charAt(0).toUpperCase()}</span>}<div className="min-w-0"><p className="text-[11px] text-ink-faint">Passed on from</p><Link to={originalPath} className="truncate text-sm font-semibold hover:underline">{originalName}{originalProfile?.username?` · @${originalProfile.username}`:""}</Link></div></div>{original.content&&<p className="p-3 text-sm leading-6"><MentionText text={original.content}/></p>}{original.media_urls?.[0]&&<img src={original.media_urls[0]} alt="" className="max-h-[65vh] w-full object-contain bg-paper"/>}</div>;})()}
        {post.data.media_urls?.[0] && <button type="button" onClick={()=>setMediaOpen(post.data.media_urls[0])} className="mt-4 block w-full overflow-hidden rounded-2xl bg-paper"><img src={post.data.media_urls[0]} alt="" className="max-h-[70vh] w-full object-contain"/></button>}{musicUrl&&<div className="mt-4 rounded-2xl bg-paper p-3"><p className="mb-2 text-sm font-semibold">🎵 {post.data.music_title||"Music"}</p><audio controls preload="metadata" src={musicUrl} className="w-full"/></div>}
      </article>{mediaOpen&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3" onClick={()=>setMediaOpen(null)}><img src={mediaOpen} alt="" className="max-h-full max-w-full object-contain" onClick={e=>e.stopPropagation()}/></div>}
    </div>
  );
}
