import { useState } from "react";
import { Link } from "react-router-dom";
import { useFeedPosts } from "../hooks/useFeedPosts";
import { useActiveAdvertisements } from "../hooks/useAdvertisements";
import { PostComposer } from "../components/PostComposer";
import { PostCard } from "../components/PostCard";
import { AdvertisementCard } from "../components/AdvertisementCard";
import { StoriesBar } from "../components/StoriesBar";
import { ExtraordinaryPeople } from "../components/ExtraordinaryPeople";

const HOME_FILTERS = [
  { key: "for-you", label: "For You", help: "A mix of useful posts from across POSSARA." },
  { key: "study", label: "Study", help: "Questions, study tips, revision, academic progress and useful learning discussions." },
  { key: "inspire", label: "Inspire", help: "Encouragement, lessons learned and stories that can motivate someone." },
  { key: "care", label: "Care", help: "Support, kindness, thoughtful advice and community-minded conversations." },
  { key: "talent", label: "Talent", help: "Skills, projects, creativity, achievements and things people can do." },
] as const;

type HomeFilter = (typeof HOME_FILTERS)[number]["key"];

export function Home(){
 const [filter,setFilter]=useState<HomeFilter>("for-you");
 const {data:posts,isLoading,error}=useFeedPosts({postType:"general",noCategoryOnly:true,topic:filter==="for-you"?undefined:filter});
 const {data:ads}=useActiveAdvertisements();
 const activeFilter=HOME_FILTERS.find(item=>item.key===filter);

 return <div className="feed-layout">
  <div className="feed-column">
   <section className="home-intro">
    <div className="home-kicker">Connect · Learn · Grow</div>
    <h1>Grow your future with people, opportunities and learning.</h1>
    <p>POSSARA brings community and Study together — preparing students for academic excellence, helping people learn from one another, discover opportunities and grow through real stories of achievement.</p>
    <div className="mt-3 flex flex-wrap gap-2">
     <Link to="/study" className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white">Open Study</Link>
     <Link to="/opportunities" className="rounded-full border border-ink-faint/25 bg-white px-4 py-2 text-sm font-medium text-ink">Explore opportunities</Link>
     <Link to="/organizations" className="rounded-full border border-ink-faint/25 bg-white px-4 py-2 text-sm font-medium text-ink">Browse organizations</Link>
    </div>
   </section>

   <ExtraordinaryPeople/>

   <section className="rounded-2xl border border-paper-dim bg-white p-4 shadow-sm">
    <div className="mb-3">
     <p className="text-sm font-semibold text-ink">Moments</p>
     <p className="text-xs text-ink-faint">Temporary photo updates. Moments do not use Study, Inspire, Care or Talent labels.</p>
    </div>
    <StoriesBar/>
   </section>

   <section className="space-y-2">
    <div>
     <p className="text-sm font-semibold text-ink">Create a Home post</p>
     <p className="text-xs text-ink-faint">Choose the topic that best explains what your post is about.</p>
    </div>
    <PostComposer placeholder="Share something useful, inspiring or worth learning…" showHomeTopicPicker/>
   </section>

   <div className="rounded-xl border border-paper-dim bg-white px-4 py-3 text-sm text-ink-light">Jobs, scholarships, admissions and other opportunities have their own trusted space. <Link to="/submit-opportunity" className="font-medium text-brand-dark hover:underline">Submit an opportunity →</Link></div>

   <section className="space-y-2">
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
     <div><p className="text-sm font-semibold text-ink">Home posts</p><p className="text-xs text-ink-faint">Filter the feed by post topic.</p></div>
     {activeFilter&&<p className="text-xs text-ink-faint sm:max-w-xs sm:text-right">{activeFilter.help}</p>}
    </div>
    <div className="flex gap-2 overflow-x-auto pb-1">{HOME_FILTERS.map(item=><button key={item.key} type="button" onClick={()=>setFilter(item.key)} title={item.help} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${filter===item.key?"border-brand bg-brand-light text-brand-dark":"border-ink-faint/25 bg-white text-ink-light hover:bg-paper-dim"}`}>{item.label}</button>)}</div>
   </section>

   <div className="feed-list">{isLoading&&<div className="feed-skeleton"/>}{error&&<p className="text-flag">Couldn't load the feed right now.</p>}{!isLoading&&!error&&posts?.length===0&&<div className="empty-state"><h2>{filter==="for-you"?"Start something useful":`No ${filter} posts yet`}</h2><p>Share something helpful, encouraging, educational or meaningful for the community.</p></div>}{posts?.map((post,index)=><div key={post.id}>{index>0&&index%5===0&&ads?.length?<AdvertisementCard ad={ads[(index/5-1)%ads.length]}/>:null}<PostCard post={post}/></div>)}</div>
  </div>

  <aside className="feed-rail">
   <div className="rail-card"><p className="eyebrow">POSSARA</p><h2>Community with a purpose.</h2><p>Connect with people, learn from achievement, use Study to build stronger academic performance and discover opportunities that can move you forward.</p><Link to="/study" className="rail-link">Go to Study →</Link></div>
   <div className="rail-card"><p className="text-sm font-semibold">Looking for your next step?</p><Link to="/opportunities" className="rail-link">Explore opportunities →</Link><Link to="/organizations" className="mt-2 block text-sm font-medium text-brand-dark hover:underline">Browse organizations →</Link></div>
  </aside>
 </div>
}
