import { useFeedPosts } from "../hooks/useFeedPosts";
import { useActiveAdvertisements } from "../hooks/useAdvertisements";
import { PostComposer } from "../components/PostComposer";
import { PostCard } from "../components/PostCard";
import { AdvertisementCard } from "../components/AdvertisementCard";
import { StoriesBar } from "../components/StoriesBar";
export function Home(){
 const {data:posts,isLoading,error}=useFeedPosts({postType:"general",noCategoryOnly:true}); const {data:ads}=useActiveAdvertisements();
 return <div className="feed-layout"><div className="feed-column"><section className="home-intro"><div className="home-kicker">A positive place to grow</div><h1>Something good can start here.</h1><p>Real encouragement, meaningful stories and people sharing what helped them keep moving.</p></section><StoriesBar/><PostComposer placeholder="Share something that could lift someone today…" showCategoryPicker={false}/><div className="feed-list">{isLoading&&<div className="feed-skeleton"/>}{error&&<p className="text-flag">Couldn't load the feed right now.</p>}{!isLoading&&!error&&posts?.length===0&&<div className="empty-state"><h2>Start something positive</h2><p>Be the first to share encouragement or a story that could help someone move forward.</p></div>}{posts?.map((post,index)=><div key={post.id}>{index>0&&index%5===0&&ads?.length?<AdvertisementCard ad={ads[(index/5-1)%ads.length]}/>:null}<PostCard post={post}/></div>)}</div></div><aside className="feed-rail"><div className="rail-card"><p className="eyebrow">POSSARA</p><h2>Feed with a purpose.</h2><p>Home is for motivation, uplifting stories, lessons, progress and constructive conversation.</p></div><div className="rail-card"><p className="text-sm font-semibold">Looking for your next step?</p><a href="/opportunities" className="rail-link">Explore opportunities →</a></div></aside></div>
}
