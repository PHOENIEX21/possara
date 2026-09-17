import { Award } from "lucide-react";
import { useOpportunities } from "../hooks/useOpportunities";
import { useFeedPosts } from "../hooks/useFeedPosts";
import { OpportunityCard } from "../components/OpportunityCard";
import { PostCard } from "../components/PostCard";

export function Competitions() {
  const { data: opportunities, isLoading, error } = useOpportunities({ limit: 50, categorySlug: "competitions" });
  const { data: communityPosts } = useFeedPosts({ categorySlug: "competitions" });

  return (
    <div className="page-stack">
      <section className="page-hero">
        <div className="page-icon bg-brand-light text-brand-dark"><Award size={22} /></div>
        <div>
          <p className="eyebrow">Challenge yourself</p>
          <h1>Competitions</h1>
          <p>Verified essay contests, academic challenges, hackathons, Bible competitions, talent contests and other live opportunities. Entries past their recorded deadline are hidden automatically.</p>
        </div>
      </section>

      <div>
        {isLoading && <div className="feed-skeleton" />}
        {error && <p className="text-flag">Couldn&apos;t load competitions right now.</p>}
        {!isLoading && !error && opportunities?.length === 0 && communityPosts?.length === 0 && (
          <div className="empty-state">
            <Award size={28} />
            <h2>No live competitions right now</h2>
            <p>New verified competitions will appear here as they open.</p>
          </div>
        )}
        {opportunities?.map((opp) => (
          <OpportunityCard key={opp.id} opportunity={opp} organization={opp.organizations} category={opp.opportunity_categories} />
        ))}
      </div>

      {communityPosts && communityPosts.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-ink-faint">Shared by the community</h2>
          <div className="space-y-4">
            {communityPosts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        </section>
      )}
    </div>
  );
}
