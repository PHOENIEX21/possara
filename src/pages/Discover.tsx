import { Link } from "react-router-dom";
import { useMatchedOpportunities } from "../hooks/useMatchedOpportunities";
import { OpportunityCard } from "../components/OpportunityCard";
import { useAuth } from "../store/auth";

export function Discover() {
  const { userId } = useAuth(); const { data, isLoading, error } = useMatchedOpportunities();
  return <div className="page-stack"><section><h1 className="text-2xl">More opportunities</h1><p className="mt-1 text-ink-light">{data?.matched ? "Opportunities relevant to the goals on your profile." : "Recent grants, internships, fellowships, training and other opportunities."}</p></section>{!userId&&<div className="rounded-lg bg-opportunity-light px-4 py-3 text-sm text-opportunity-dark"><Link to="/signin" className="underline underline-offset-2">Sign in</Link> to set goals and get a more relevant feed.</div>}{userId&&data&&!data.matched&&<div className="rounded-lg bg-opportunity-light px-4 py-3 text-sm text-opportunity-dark"><Link to="/profile/me" className="underline underline-offset-2">Set what you're looking for on your profile</Link> to improve relevance.</div>}<div>{isLoading&&<div className="feed-skeleton"/>}{error&&<p className="text-flag">Couldn't load opportunities right now.</p>}{!isLoading&&!error&&data?.opportunities.length===0&&<p className="text-ink-light">Nothing is available in this view right now.</p>}{data?.opportunities.map((opp)=><OpportunityCard key={opp.id} opportunity={opp} organization={opp.organizations} category={opp.opportunity_categories}/>)}</div></div>;
}
