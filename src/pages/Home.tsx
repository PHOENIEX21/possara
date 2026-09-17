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

const AD_INTERVAL = 5;

type HomeFilter = (typeof HOME_FILTERS)[number]["key"];

export function Home(){
 const [filter,setFilter]=useState<HomeFilter>("for-you");
 const {data:posts,isLoading,error}=useFeedPosts({postType:"general",noCategoryOnly:true,topic:filter==="for-you"?undefined:filter});
 const {data:ads}=useActiveAdvertisements();
 const visiblePosts=posts??[];
 const activeAds=ads??[];
 const showSmallFeedAd=!isLoading&&!error&&visiblePosts.length>0&&visiblePosts.length<AD_INTERVAL&&activeAds.length>0;

 return <div className="feed-layout">
  <div className="feed-column">
   <section className="home-moments-card">
    <div className="home-section-heading"><div><p>Moments</p><span>Quick updates from people around you.</span></div></div>
    <StoriesBar/>
   </section>

   <section className="home-compose-section">
    <PostComposer placeholder="Share something worth seeing or knowing…" showHomeTopicPicker/>
   </section>

   <section className="home-feed-heading">
    <div><h2>What people are sharing</h2><p>Useful thoughts, stories, care and talent from the community.</p></div>
    <div className="home-filter-row">{HOME_FILTERS.map(item=><button key={item.key} type="button" onClick={()=>setFilter(item.key)} className={filter===item.key?"active":""}>{item.label}</button>)}</div>
   </section>

   <div className="feed-list">
    {isLoading&&<div className="feed-skeleton"/>}
    {error&&<p className="text-flag">Couldn't load the feed right now.</p>}
    {!isLoading&&!error&&visiblePosts.length===0&&<div className="empty-state"><h2>{filter==="for-you"?"Nothing here yet":`No ${filter} posts yet`}</h2><p>Be the first to share something meaningful.</p></div>}
    {visiblePosts.map((post,index)=><div key={post.id}>{index>0&&index%AD_INTERVAL===0&&activeAds.length?<AdvertisementCard ad={activeAds[(Math.floor(index/AD_INTERVAL)-1)%activeAds.length]}/>:null}<PostCard post={post}/></div>)}
    {showSmallFeedAd&&<AdvertisementCard ad={activeAds[0]}/>} 
   </div>
  </div>

  <aside className="feed-rail">
   <div className="rail-card"><p className="eyebrow">POSSARA</p><h2>Community with direction.</h2><p>See people, ideas and opportunities that can help you move forward.</p><Link to="/opportunities" className="rail-link">Explore opportunities →</Link></div>
   <div className="rail-card"><p className="text-sm font-semibold">Learn when you need to.</p><p>Study has its own focused space instead of competing with your Home feed.</p><Link to="/study" className="rail-link">Open POSSARA Study →</Link></div>
  </aside>
 </div>
}
