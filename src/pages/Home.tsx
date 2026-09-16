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
  { key: "inspire", label: "Inspire" },
  { key: "care", label: "Care" },
  { key: "talent", label: "Talent" },
] as const;

type HomeFilter = (typeof HOME_FILTERS)[number]["key"];

export function Home(){
 const [filter,setFilter]=useState<HomeFilter>("for-you");
 const {data:posts,isLoading,error}=useFeedPosts({postType:"general",noCategoryOnly:true,topic:filter==="for-you"?undefined:filter});
 const {data:ads}=useActiveAdvertisements();
 return <div className="feed-layout"><div className="feed-column"><section className="home-intro"><div className="home-kicker">A positive place to grow</div><h1>Something good can start here.</h1><p>Real encouragement, meaningful stories and people sharing what helped them keep moving.</p></section><StoriesBar/><div className="flex gap-2 overflow-x-auto pb-1">{HOME_FILTERS.map(item=><button key={item.key} type="button" onClick={()=>setFilter(item.key)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${filter===item.key?"border-brand bg-brand-light text-brand-dark":"border-ink-faint/25 bg-white text-ink-light hover:bg-paper-dim"}`}>{item.label}</button>)}</div><PostComposer placeholder="Share something that could lift someone today…" showHomeTopicPicker/><div className="rounded-xl border border-paper-dim bg-white px-4 py-3 text-sm text-ink-light">Posting a job, scholarship, admission update or other opportunity? <Link to="/submit-opportunity" className="font-medium text-brand-dark hover:underline">Submit it for review →</Link></div><div className="feed-list">{isLoading&&<div className="feed-skeleton"/>}{error&&<p className="text-flag">Couldn't load the feed right now.</p>}{!isLoading&&!error&&posts?.length===0&&<div className="empty-state"><h2>{filter==="for-you"?"Start something positive":`No ${filter} posts yet`}</h2><p>Share something useful, encouraging or meaningful for the community.</p></div>}{posts?.map((post,index)=><div key={post.id}>{index>0&&index%5===0&&ads?.length?<AdvertisementCard ad={ads[(index/5-1)%ads.length]}/>:null}<PostCard post={post}/></div>)}</div></div><aside className="feed-rail"><div className="rail-card"><p className="eyebrow">POSSARA</p><h2>Feed with a purpose.</h2><p>Home is for motivation, uplifting stories, care, talent, lessons, progress and constructive conversation.</p></div><div className="rail-card"><p className="text-sm font-semibold">Looking for your next step?</p><Link to="/opportunities" className="rail-link">Explore opportunities →</Link></div></aside></div>
}
