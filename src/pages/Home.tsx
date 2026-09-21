import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, MapPin, Sparkles } from "lucide-react";
import { useFeedPosts } from "../hooks/useFeedPosts";
import { useActiveAdvertisements } from "../hooks/useAdvertisements";
import { PostComposer } from "../components/PostComposer";
import { PostCard } from "../components/PostCard";
import { AdvertisementCard } from "../components/AdvertisementCard";
import { StoriesBar } from "../components/StoriesBar";
import { ExtraordinaryPeople } from "../components/ExtraordinaryPeople";

const HOME_TOPIC_KEYS = ["insight"] as const;

const HOME_FILTERS = [
  { key: "for-you", label: "For You" },
  { key: "insight", label: "Insights" },
] as const;

const AD_INTERVAL = 5;
type HomeFilter = (typeof HOME_FILTERS)[number]["key"];

function reshufflePosts<T extends {id:string}>(items:T[],seed:number){
  if(!seed||items.length<2)return items;
  const copy=[...items];
  let state=seed>>>0;
  const next=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
}

export function Home(){
  const [filter,setFilter]=useState<HomeFilter>("for-you");
  const [feedLimit,setFeedLimit]=useState(30);
  const [reshuffleSeed,setReshuffleSeed]=useState(0);
  const feedStartRef=useRef<HTMLElement>(null);
  const {data:posts,isLoading,error,refetch}=useFeedPosts({
    noCategoryOnly:true,
    topic:filter==="for-you"?undefined:filter,
    topics:filter==="for-you"?[...HOME_TOPIC_KEYS]:undefined,
    limit:feedLimit,
  });
  const {data:ads}=useActiveAdvertisements();

  useEffect(()=>{
    const handleHomeReshuffle=()=>{
      setReshuffleSeed(Date.now());
      void refetch();
      window.requestAnimationFrame(()=>feedStartRef.current?.scrollIntoView({behavior:"smooth",block:"start"}));
    };
    window.addEventListener("possara-home-reshuffle",handleHomeReshuffle);
    return()=>window.removeEventListener("possara-home-reshuffle",handleHomeReshuffle);
  },[refetch]);

  const visiblePosts=useMemo(()=>reshufflePosts(posts??[],reshuffleSeed),[posts,reshuffleSeed]);
  const activeAds=ads??[];
  const showSmallFeedAd=!isLoading&&!error&&visiblePosts.length<AD_INTERVAL&&activeAds.length>0;

  return <div className="feed-layout">
    <div className="feed-column">
      <section className="rounded-3xl bg-ink p-5 text-white"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/55">POSSARA community</p><h1 className="mt-2 text-2xl font-bold">Grow through what people share.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Useful knowledge, education, lessons, encouragement and real experiences that help people move forward.</p></section>
      <ExtraordinaryPeople/>
      <section className="home-moments-card">
        <div className="home-section-heading"><div><p className="inline-flex items-center gap-1.5"><Sparkles size={14} className="text-brand-dark"/>Moments</p><span>Fresh, temporary updates from your community.</span></div></div>
        <StoriesBar/>
      </section>

      <section className="home-compose-section">
        <PostComposer
          placeholder="Share an insight, lesson or useful experience…"
          showHomeTopicPicker
        />
      </section>


      <section ref={feedStartRef} id="home-posts" className="home-feed-heading home-feed-heading-premium">
        <div><p className="eyebrow">Home community</p><h2>From your community</h2><p>Useful insights, knowledge, education, practical lessons and uplifting experiences shared by the POSSARA community.</p></div>
        <div className="home-filter-row" aria-label="Filter home feed">{HOME_FILTERS.map(item=><button key={item.key} type="button" onClick={()=>{setFilter(item.key);window.requestAnimationFrame(()=>feedStartRef.current?.scrollIntoView({behavior:"smooth",block:"start"}));}} className={filter===item.key?"active":""}>{item.label}</button>)}</div>
      </section>

      <Link to="/places" className="home-places-cta" aria-label="Explore interesting places">
        <span className="home-places-cta-icon"><MapPin size={18}/></span>
        <span className="home-places-cta-copy"><strong>Interesting places</strong><small>Discover places worth experiencing without crowding your Home feed.</small></span>
        <ArrowRight size={18} className="home-places-cta-arrow"/>
      </Link>



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
