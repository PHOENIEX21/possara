import { useEffect, useMemo, useRef, useState } from "react";
import { Home as HomeIcon, Sparkles } from "lucide-react";
import { useFeedPosts } from "../hooks/useFeedPosts";
import { useActiveAdvertisements } from "../hooks/useAdvertisements";
import { PostComposer } from "../components/PostComposer";
import { PostCard } from "../components/PostCard";
import { AdvertisementCard } from "../components/AdvertisementCard";
import { FeedRefreshBar } from "../components/FeedRefreshBar";
import { StoriesBar } from "../components/StoriesBar";

const HOME_TOPIC_KEYS = ["insight"] as const;

const HOME_FILTERS = [
  { key: "for-you", label: "For You" },
  { key: "insight", label: "Insights" },
] as const;

const COMMUNITY_FILTERS = [
  ...HOME_FILTERS.map((item) => ({ slug: item.key, label: item.label })),
  { slug: "jobs", label: "Jobs" },
  { slug: "scholarships", label: "Scholarships" },
  { slug: "competitions", label: "Competitions" },
  { slug: "admissions", label: "Admissions" },
] as const;

const AD_INTERVAL = 5;
type HomeFilter = (typeof HOME_FILTERS)[number]["key"];

function reshufflePosts<T extends { id: string }>(items: T[], seed: number) {
  if (!seed || items.length < 2) return items;
  const copy = [...items];
  let state = seed >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function Home() {
  const [filter, setFilter] = useState<HomeFilter>("for-you");
  const [communityCategory, setCommunityCategory] = useState<string | undefined>(undefined);
  const [feedLimit, setFeedLimit] = useState(30);
  const [reshuffleSeed, setReshuffleSeed] = useState(0);
  const feedStartRef = useRef<HTMLElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const { data: posts, isLoading, error, refetch } = useFeedPosts({
    noCategoryOnly: communityCategory ? false : true,
    categorySlug: communityCategory,
    topic: communityCategory ? undefined : filter === "for-you" ? undefined : filter,
    topics: communityCategory ? undefined : filter === "for-you" ? [...HOME_TOPIC_KEYS] : undefined,
    limit: feedLimit,
  });
  const { data: ads } = useActiveAdvertisements();

  useEffect(() => {
    const handleHomeReshuffle = () => {
      setReshuffleSeed(Date.now());
      void refetch();
      window.requestAnimationFrame(() =>
        feedStartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    };
    window.addEventListener("possara-home-reshuffle", handleHomeReshuffle);
    return () => window.removeEventListener("possara-home-reshuffle", handleHomeReshuffle);
  }, [refetch]);

  const visiblePosts = useMemo(
    () => reshufflePosts(posts ?? [], reshuffleSeed),
    [posts, reshuffleSeed],
  );
  const activeAds = ads ?? [];
  const showSmallFeedAd =
    !isLoading && !error && visiblePosts.length < AD_INTERVAL && activeAds.length > 0;

  return (
    <div className="feed-layout">
      <div ref={feedRef} className="feed-column">
        <div className="home-top-sticky">
          <div className="home-top-welcome">
            <p>Welcome to POSSARA</p>
            <span>See what is possible. Find what moves you forward.</span>
          </div>
          <div className="home-filter-sticky">
            <section className="home-community-category-filter" aria-label="Filter home feed">
              {COMMUNITY_FILTERS.map((item) => {
                const active =
                  (item.slug === "for-you" && !communityCategory && filter === "for-you") ||
                  (item.slug === "insight" && !communityCategory && filter === "insight") ||
                  communityCategory === item.slug;

                return (
                  <button
                    key={item.slug}
                    type="button"
                    className={`home-filter-button ${active ? "active" : ""}`}
                    onClick={() => {
                      if (item.slug === "for-you") {
                        setCommunityCategory(undefined);
                        setFilter("for-you");
                        setReshuffleSeed(Date.now());
                        void refetch();
                      } else if (item.slug === "insight") {
                        setCommunityCategory(undefined);
                        setFilter("insight");
                      } else {
                        setCommunityCategory(item.slug);
                      }
                      window.requestAnimationFrame(() =>
                        feedStartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
                      );
                    }}
                  >
                    {item.slug === "for-you" && <HomeIcon size={18} aria-hidden="true" />}
                    {item.label}
                  </button>
                );
              })}
            </section>
          </div>
          <FeedRefreshBar feedRef={feedRef} onRefresh={async () => {
            await refetch();
            setReshuffleSeed((seed) => Math.max(Date.now(), seed + 1));
          }} />
        </div>

        <section className="home-moments-card">
          <div className="home-section-heading">
            <div>
              <p className="inline-flex items-center gap-1.5">
                <Sparkles size={18} className="text-brand-dark" />
                Moments
              </p>
              <span>Share what&apos;s on your mind</span>
            </div>
          </div>
          <StoriesBar />
        </section>

        <section className="home-compose-section">
          <PostComposer
            placeholder="Share an insight, lesson or useful experience…"
            showHomeTopicPicker
          />
        </section>

        <section
          ref={feedStartRef}
          id="home-posts"
          className="home-feed-heading home-feed-heading-premium"
        >
          <div>
            <p className="eyebrow">Home community</p>
            <h2>From your community</h2>
            <p>
              Useful insights, knowledge, education, practical lessons and uplifting experiences
              shared by the POSSARA community.
            </p>
          </div>
        </section>




        <div className="feed-list feed-list-premium">
          {isLoading && <div className="feed-skeleton" />}
          {error && (
            <p className="rounded-2xl bg-white p-4 text-flag shadow-sm">
              Couldn&apos;t load the feed right now.
            </p>
          )}
          {!isLoading && !error && visiblePosts.length === 0 && (
            <div className="empty-state">
              <h2>{filter === "for-you" ? "No community posts yet" : `No ${filter} posts yet`}</h2>
              <p>Be the first to share something useful in this section.</p>
            </div>
          )}
          {visiblePosts.map((post, index) => (
            <div key={post.id}>
              <PostCard post={post} />
              {(index + 1) % AD_INTERVAL === 0 && activeAds.length ? (
                <AdvertisementCard
                  ad={activeAds[Math.floor(index / AD_INTERVAL) % activeAds.length]}
                />
              ) : null}
            </div>
          ))}
          {showSmallFeedAd && <AdvertisementCard ad={activeAds[0]} />}
          {!isLoading && !error && visiblePosts.length >= feedLimit && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setFeedLimit((n) => n + 30)}
                className="rounded-xl border border-paper-dim bg-white px-5 py-2.5 text-sm font-semibold shadow-sm hover:bg-paper"
              >
                Load older posts
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
