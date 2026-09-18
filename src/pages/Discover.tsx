import { Link } from "react-router-dom";
import { useMatchedOpportunities } from "../hooks/useMatchedOpportunities";
import { useFeedPosts } from "../hooks/useFeedPosts";
import { OpportunityCard } from "../components/OpportunityCard";
import { PostCard } from "../components/PostCard";
import { useAuth } from "../store/auth";

const MORE_CATEGORY_SLUGS = ["business-funding","fellowships","grants","internships","mentorship","training","volunteering"];

export function Discover() {
  const { userId } = useAuth();
  const { data, isLoading, error } = useMatchedOpportunities();
  const { data: communityPosts } = useFeedPosts({ categorySlugs: MORE_CATEGORY_SLUGS });

  return <div className="page-stack">
    <section><h1 className="text-2xl">More opportunities</h1><p className="mt-1 text-ink-light">{data?.matched ? "Opportunities relevant to the goals on your profile." : "Recent grants, internships, fellowships, training, mentoring and other opportunities."}</p></section>
    {!userId&&<div className="rounded-lg bg-opportunity-light px-4 py-3 text-sm text-opportunity-dark"><Link to="/signin" className="underline underline-offset-2">Sign in</Link> to set goals and get a more relevant feed.</div>}
    {userId&&data&&!data.matched&&<div className="rounded-lg bg-opportunity-light px-4 py-3 text-sm text-opportunity-dark"><Link to="/profile/me" className="underline underline-offset-2">Set what you&apos;re looking for on your profile</Link> to improve relevance.</div>}

    <div>
      {isLoading&&<div className="feed-skeleton"/>}
      {error&&<p className="text-flag">Couldn&apos;t load opportunities right now.</p>}
      {!isLoading&&!error&&data?.opportunities.length===0&&communityPosts?.length===0&&<p className="text-ink-light">Nothing is available in this view right now.</p>}
      {data?.opportunities.map((opp)=><OpportunityCard key={opp.id} opportunity={opp} organization={opp.organizations} category={opp.opportunity_categories}/>)}
    </div>

    {communityPosts&&communityPosts.length>0&&<section>
      <h2 className="mb-3 text-sm font-medium text-ink-faint">Shared by the community</h2>
      <div className="space-y-4">{communityPosts.map((post)=><PostCard key={post.id} post={post}/>)}</div>
    </section>}
  </div>;
}
