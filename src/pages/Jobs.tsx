import { useMemo, useState } from "react";
import { Briefcase, MapPin, Search } from "lucide-react";
import { useOpportunities } from "../hooks/useOpportunities";
import { useFeedPosts } from "../hooks/useFeedPosts";
import { OpportunityCard } from "../components/OpportunityCard";
import { PostCard } from "../components/PostCard";

type WorkStyle = "all" | "remote" | "hybrid" | "onsite";

function matchesWorkStyle(location: string | null, tags: string[] | null, style: WorkStyle) {
  if (style === "all") return true;
  const haystack = `${location ?? ""} ${(tags ?? []).join(" ")}`.toLowerCase();
  if (style === "remote") return haystack.includes("remote") || haystack.includes("virtual");
  if (style === "hybrid") return haystack.includes("hybrid");
  return haystack.includes("on-site") || haystack.includes("onsite") || haystack.includes("on site");
}

export function Jobs() {
  const { data: opportunities, isLoading, error } = useOpportunities({ limit: 100, categorySlug: "jobs" });
  const { data: communityPosts } = useFeedPosts({ categorySlug: "jobs" });
  const [locationQuery, setLocationQuery] = useState("");
  const [workStyle, setWorkStyle] = useState<WorkStyle>("all");

  const filtered = useMemo(() => {
    const q = locationQuery.trim().toLowerCase();
    return (opportunities ?? []).filter((opp) => {
      if (!matchesWorkStyle(opp.location, opp.tags, workStyle)) return false;
      if (!q) return true;
      return [opp.title, opp.location, opp.description, ...(opp.tags ?? [])]
        .some((value) => value?.toLowerCase().includes(q));
    });
  }, [opportunities, locationQuery, workStyle]);

  return (
    <div className="page-stack">
      <section className="page-hero">
        <div className="page-icon bg-brand-light text-brand-dark"><Briefcase size={22}/></div>
        <div>
          <p className="eyebrow">Career opportunities</p>
          <h1>Jobs</h1>
          <p>Current roles and career openings. Listings past their recorded deadline are hidden from this live view.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-paper-dim bg-white p-4 shadow-sm">
        <label className="relative block">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"/>
          <input
            value={locationQuery}
            onChange={(event) => setLocationQuery(event.target.value)}
            placeholder="Search role, city or state — e.g. Ilorin, Lagos, Abuja…"
            className="w-full rounded-full border border-ink-faint/30 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-faint"><MapPin size={13}/>Work style</span>
          {(["all","remote","hybrid","onsite"] as WorkStyle[]).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => setWorkStyle(style)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${workStyle === style ? "border-brand bg-brand text-white" : "border-ink-faint/25 text-ink-light hover:bg-paper-dim"}`}
            >
              {style === "all" ? "Any" : style === "onsite" ? "On-site" : style.charAt(0).toUpperCase() + style.slice(1)}
            </button>
          ))}
          {!isLoading && !error && <span className="ml-auto text-xs text-ink-faint">{filtered.length} live {filtered.length === 1 ? "role" : "roles"}</span>}
        </div>
      </section>

      <div>
        {isLoading && <div className="feed-skeleton"/>}
        {error && <p className="text-flag">Couldn&apos;t load jobs right now.</p>}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="empty-state"><Briefcase size={28}/><h2>No matching live jobs</h2><p>Try another city, state or work style. New verified openings will appear here as they are added.</p></div>
        )}
        {filtered.map((opp) => <OpportunityCard key={opp.id} opportunity={opp} organization={opp.organizations} category={opp.opportunity_categories}/>) }
      </div>

      {communityPosts && communityPosts.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-ink-faint">Shared by the community</h2>
          <div className="space-y-4">{communityPosts.map((post) => <PostCard key={post.id} post={post}/>)}</div>
        </section>
      )}
    </div>
  );
}
