import { ImpactCounterStrip } from "../components/ImpactCounterStrip";
import { MemberStats } from "../components/MemberStats";
import { usePlatformStats } from "../hooks/usePlatformStats";

export function Impact() {
  const { data: stats, isLoading } = usePlatformStats();
  return <div className="max-w-prose"><h1 className="text-2xl">Impact</h1><p className="mt-2 text-ink-light">These figures describe activity recorded inside POSSARA. They are not claims about the wider population.</p><div className="mt-6"><MemberStats /></div><div className="mt-6">{isLoading&&<p className="text-ink-light">Loading…</p>}{stats&&<ImpactCounterStrip metrics={[{label:"Active opportunities",value:stats.active_opportunities.toLocaleString(),provenance:"Under review"},{label:"Verified organizations",value:stats.verified_organizations.toLocaleString(),provenance:"Verified by partner"},{label:"Opportunities saved",value:stats.opportunities_saved.toLocaleString(),provenance:"Reported by user"},{label:"Community posts shared",value:stats.community_posts.toLocaleString(),provenance:"Reported by user"},{label:"Sparks given",value:stats.sparks_given.toLocaleString(),provenance:"Reported by user"},{label:"Countries represented",value:stats.countries_represented.toLocaleString(),provenance:"Self-declared"}]}/>}</div><p className="mt-6 text-sm text-ink-faint">Counts come from POSSARA's own database and are shown without inflated projections.</p></div>;
}
