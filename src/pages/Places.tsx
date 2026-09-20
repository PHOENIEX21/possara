import { ArrowLeft, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useFeedPosts } from "../hooks/useFeedPosts";
import { PostCard } from "../components/PostCard";

export function Places() {
  const { data: posts, isLoading, error } = useFeedPosts({
    postType: "general",
    noCategoryOnly: true,
    topic: "places",
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-1 sm:space-y-5 sm:px-0">
      <section className="rounded-2xl bg-ink p-4 text-white sm:rounded-3xl sm:p-7">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white">
          <ArrowLeft size={14}/> Back to Home
        </Link>
        <div className="mt-5 flex items-start gap-3">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10"><MapPin size={19}/></span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/55">Explore POSSARA</p>
            <h1 className="mt-1 text-2xl font-bold">Places worth experiencing</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Discover remarkable places without crowding your Home community feed.</p>
          </div>
        </div>
      </section>

      <div className="feed-list feed-list-premium overflow-hidden sm:overflow-visible">
        {isLoading && <div className="feed-skeleton"/>}
        {error && <p className="rounded-2xl bg-white p-4 text-flag shadow-sm">Couldn&apos;t load Places right now.</p>}
        {!isLoading && !error && (posts ?? []).length === 0 && (
          <div className="empty-state"><h2>No Places yet</h2><p>Places shared with the community will appear here.</p></div>
        )}
        {(posts ?? []).map((post) => <PostCard key={post.id} post={post}/>)}
      </div>
    </div>
  );
}
