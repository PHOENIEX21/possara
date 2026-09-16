import { useState } from "react";
import { Link } from "react-router-dom";
import { useFeedPosts } from "../hooks/useFeedPosts";
import { useActiveAdvertisements } from "../hooks/useAdvertisements";
import { PostComposer } from "../components/PostComposer";
import { PostCard } from "../components/PostCard";
import { AdvertisementCard } from "../components/AdvertisementCard";
import { StoriesBar } from "../components/StoriesBar";

const HOME_FILTERS = [
  { key: "for-you", label: "For You" },
  { key: "study", label: "Study" },
  { key: "inspire", label: "Inspire" },
  { key: "care", label: "Care" },
  { key: "talent", label: "Talent" },
] as const;

type HomeFilter = (typeof HOME_FILTERS)[number]["key"];

export function Home(){
 const [filter,setFilter]=useState<HomeFilter>("for-you");
 const {data:posts,isLoading,error}=useFeedPosts({postType:"general",noCategoryOnly:true,topic:filter==="for-you"?undefined:filter});
 const {data:ads}=useActiveAdvertisements();
 return <div className="feed-layout"><div className="feed-column"><section className="home-intro"><div className="home-kicker">Connect · Learn · Grow</div><h1>Grow your future with people, opportunities and learning.</h1><p>POSSARA brings community and Study together — helping students prepare for academic excellence, share useful knowledge, discover opportunities and keep moving forward.</p><div className="mt-3 flex flex-wrap gap-2"><Link to="/study" className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white">Open Study</Link><Link to="/opportunities" className="rounded-full border border-ink-faint/25 bg-white px-4 py-2 text-sm font-medium text-ink">Explore opportunities</Link></div></section><StoriesBar/><div className="flex gap-2 overflow-x-auto pb-1">{HOME_FILTERS.map(item=><button key={item.key} type="button" onClick={()=>setFilter(item.key)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${filter===item.key?"border-brand bg-brand-light text-brand-dark":"border-ink-faint/25 bg-white text-ink-light hover:bg-paper-dim"}`}>{item.label}</button>)}</div><PostComposer placeholder="Share something useful, inspiring or worth learning…" showHomeTopicPicker/><div className="rounded-xl border border-paper-dim bg-white px-4 py-3 text-sm text-ink-light">Jobs, scholarships, admissions and other opportunities have their own trusted space. <Link to="/submit-opportunity" className="font-medium text-brand-dark hover:underline">Submit an opportunity →</Link></div><div className="feed-list">{isLoading&&<div className="feed-skeleton"/>}{error&&<p className="text-flag">Couldn't load the feed right now.</p>}{!isLoading&&!error&&posts?.length===0&&<div className="empty-state"><h2>{filter==="for-you"?"Start something useful":`No ${filter} posts yet`}</h2><p>Share something helpful, encouraging, educational or meaningful for the community.</p></div>}{posts?.map((post,index)=><div key={post.id}>{index>0&&index%5===0&&ads?.length?<AdvertisementCard ad={ads[(index/5-1)%ads.length]}/>:null}<PostCard post={post}/></div>)}</div></div><aside className="feed-rail"><div className="rail-card"><p className="eyebrow">POSSARA</p><h2>Community with a purpose.</h2><p>Connect with people, share progress, learn together and use Study to prepare for stronger academic performance.</p><Link to="/study" className="rail-link">Go to Study →</Link></div><div className="rail-card"><p className="text-sm font-semibold">Looking for your next step?</p><Link to="/opportunities" className="rail-link">Explore opportunities →</Link></div></aside></div>
}
