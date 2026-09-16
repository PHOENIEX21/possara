import { Briefcase } from "lucide-react";
import { useOpportunities } from "../hooks/useOpportunities";
import { useFeedPosts } from "../hooks/useFeedPosts";
import { OpportunityCard } from "../components/OpportunityCard";
import { PostCard } from "../components/PostCard";

export function Jobs() {
  const { data: opportunities, isLoading, error } = useOpportunities({ limit: 50, categorySlug: "jobs" });
  const { data: communityPosts } = useFeedPosts({ categorySlug: "jobs" });
  return <div className="page-stack"><section className="page-hero"><div className="page-icon bg-brand-light text-brand-dark"><Briefcase size={22}/></div><div><p className="eyebrow">Career opportunities</p><h1>Jobs</h1><p>Current roles and career openings. Listings past their recorded deadline are hidden from this live view.</p></div></section><div>{isLoading&&<div className="feed-skeleton"/>}{error&&<p className="text-flag">Couldn't load jobs right now.</p>}{!isLoading&&!error&&opportunities?.length===0&&communityPosts?.length===0&&<div className="empty-state"><Briefcase size={28}/><h2>No live jobs right now</h2><p>New openings will appear here as they are published.</p></div>}{opportunities?.map((opp)=><OpportunityCard key={opp.id} opportunity={opp} organization={opp.organizations} category={opp.opportunity_categories}/>)}</div>{communityPosts&&communityPosts.length>0&&<section><h2 className="mb-3 text-sm font-medium text-ink-faint">Shared by the community</h2><div className="space-y-4">{communityPosts.map((post)=><PostCard key={post.id} post={post}/>)}</div></section>}</div>;
}
