import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useFeedPosts } from "../hooks/useFeedPosts";
import { useActiveAdvertisements } from "../hooks/useAdvertisements";
import { PostComposer } from "../components/PostComposer";
import { PostCard } from "../components/PostCard";
import { AdvertisementCard } from "../components/AdvertisementCard";
import { StoriesBar } from "../components/StoriesBar";

const HOME_FILTERS = [
  { key: "for-you", label: "For You" },
  { key: "insight", label: "Insight" },
  { key: "job", label: "Jobs" },
  { key: "scholarship", label: "Scholarships" },
  { key: "competition", label: "Competitions" },
  { key: "talent", label: "Talent" },
] as const;

const AD_INTERVAL = 5;
type HomeFilter = (typeof HOME_FILTERS)[number]["key"];

export function Home(){
  const [filter,setFilter]=useState<HomeFilter>("for-you");
  const [feedLimit,setFeedLimit]=useState(30);
  const feedStartRef=useRef<HTMLElement>(null);
  const {data:posts,isLoading,error}=useFeedPosts({
    noCategoryOnly:true,
    topic:filter==="for-you"?undefined:filter,
    limit:feedLimit,
  });
  const {data:ads}=useActiveAdvertisements();
  const visiblePosts=posts??[];
  const activeAds=ads??[];
  const showSmallFeedAd=!isLoading&&!error&&visiblePosts.length<AD_INTERVAL&&activeAds.length>0;

  return <div className="feed-layout">
    <div className="feed-column">
      <section className="rounded-3xl bg-ink p-5 text-white"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/55">POSSARA community</p><h1 className="mt-2 text-2xl font-bold">Grow through what people share.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Encouragement, useful advice and real experiences from people helping one another move forward.</p></section>
      <section className="home-moments-card">
        <div className="home-section-heading"><div><p className="inline-flex items-center gap-1.5"><Sparkles size={14} className="text-brand-dark"/>Moments</p><span>Fresh, temporary updates from your community.</span></div></div>
        <StoriesBar/>
      </section>

      <section className="home-compose-section">
        <PostComposer
          placeholder="Share something encouraging…"
          showHomeTopicPicker
        />
      </section>


      <section ref={feedStartRef} id="home-posts" className="home-feed-heading home-feed-heading-premium">
        <div><p className="eyebrow">Home community</p><h2>From your community</h2><p>Insights, knowledge, encouragement, jobs, scholarships, competitions and talent shared by people in the POSSARA community.</p></div>
        <div className="home-filter-row" aria-label="Filter home feed">{HOME_FILTERS.map(item=><button key={item.key} type="button" onClick={()=>{setFilter(item.key);window.requestAnimationFrame(()=>feedStartRef.current?.scrollIntoView({behavior:"smooth",block:"start"}));}} className={filter===item.key?"active":""}>{item.label}</button>)}<Link to="/places" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">Explore Places <ArrowUpRight size={13}/></Link></div>
      </section>

      <div className="feed-list feed-list-premium">
        {isLoading&&<div className="feed-skeleton"/>}
        {error&&<p className="rounded-2xl bg-white p-4 text-flag shadow-sm">Couldn&apos;t load the feed right now.</p>}
        {!isLoading&&!error&&visiblePosts.length===0&&<div className="empty-state"><h2>{filter==="for-you"?"No community posts yet":`No ${filter} posts yet`}</h2><p>Be the first to share something useful in this section.</p></div>}
        {visiblePosts.map((post,index)=><div key={post.id}><PostCard post={post}/>{(index+1)%AD_INTERVAL===0&&activeAds.length?<AdvertisementCard ad={activeAds[Math.floor(index/AD_INTERVAL)%activeAds.length]}/>:null}</div>)}
        {showSmallFeedAd&&<AdvertisementCard ad={activeAds[0]}/>}
        {!isLoading&&!error&&visiblePosts.length>=feedLimit&&<div className="flex justify-center pt-2"><button type="button" onClick={()=>setFeedLimit(n=>n+30)} className="rounded-xl border border-paper-dim bg-white px-5 py-2.5 text-sm font-semibold shadow-sm hover:bg-paper">Load older posts</button></div>}
      </div>
    </div>

    <aside className="feed-rail">
      <div className="rail-card rail-card-premium"><p className="eyebrow">Your POSSARA</p><h2>Community with direction.</h2><p>People, ideas, learning and opportunities belong together when they help you move forward.</p><Link to="/connect" className="rail-link">Discover people <ArrowUpRight size={14}/></Link></div>
      <div className="rail-card"><p className="text-sm font-semibold">Opportunity radar</p><p>Move from inspiration to action with jobs, scholarships and admissions in their own focused space.</p><Link to="/opportunities" className="rail-link">Explore opportunities <ArrowUpRight size={14}/></Link></div>
      <div className="rail-card"><p className="text-sm font-semibold">Business community</p><p>Share useful products and services without confusing community posts with paid sponsored campaigns.</p><Link to="/advertise" className="rail-link">Open business <ArrowUpRight size={14}/></Link></div>
    </aside>
  </div>;
}
