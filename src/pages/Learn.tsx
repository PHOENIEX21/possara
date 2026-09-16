import { BookOpen } from "lucide-react";
import { useFeedPosts } from "../hooks/useFeedPosts";
import { PostCard } from "../components/PostCard";
import { PostComposer } from "../components/PostComposer";

export function Learn() {
  const { data: posts, isLoading } = useFeedPosts({ postType: "resource" });
  return <div className="mx-auto max-w-xl"><div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-opportunity-light text-opportunity-dark"><BookOpen size={20}/></div><h1 className="text-2xl">Learn</h1><p className="mt-1 text-ink-light">Practical lessons and guidance shared by the community.</p><div className="mt-5"><PostComposer postType="resource" placeholder="Share a lesson, guide, or piece of advice…" /></div><div className="mt-6 space-y-4">{isLoading&&<div className="feed-skeleton"/>}{!isLoading&&posts?.length===0&&<p className="py-8 text-center text-ink-light">No lessons shared yet.</p>}{posts?.map((post)=><PostCard key={post.id} post={post}/>)}</div></div>;
}
