import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PostCard } from "../components/PostCard";
import { useFeedPosts } from "../hooks/useFeedPosts";

export function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: posts, isLoading, error } = useFeedPosts({
    postId: id,
    enabled: !!id,
    limit: 1,
  });

  if (isLoading) return <p className="text-sm text-ink-light">Loading post…</p>;
  if (error || !posts?.[0]) return <div className="rounded-2xl border border-paper-dim bg-white p-5"><p className="font-semibold">This post isn&apos;t available.</p><Link to="/" className="mt-3 inline-flex items-center gap-1 text-sm text-brand-dark underline"><ArrowLeft size={14}/>Back home</Link></div>;

  return <div className="mx-auto max-w-2xl space-y-3">
    <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-ink-light hover:text-ink"><ArrowLeft size={15}/>Back</Link>
    <PostCard post={posts[0]}/>
  </div>;
}
