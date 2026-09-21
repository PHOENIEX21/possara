import { useMemo, useState } from "react";
import { Briefcase, Building2, MapPin, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useHiringJobs } from "../hooks/useHiring";
import { useOpportunities } from "../hooks/useOpportunities";
import { useFeedPosts } from "../hooks/useFeedPosts";
import { OpportunityCard } from "../components/OpportunityCard";
import { PostCard } from "../components/PostCard";
import { OrganizationVerificationBadge } from "../components/OrganizationVerificationBadge";

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
  const { data: communityPosts } = useFeedPosts({ noCategoryOnly: true, topic: "job" });
  const { data: nativeJobs, isLoading: nativeLoading, error: nativeError } = useHiringJobs();
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

      <section>
        <div className="mb-3 flex items-end justify-between gap-3"><div><p className="eyebrow">Apply inside POSSARA</p><h2 className="text-xl font-bold">Jobs from registered organizations</h2></div><Link to="/organizations/manage" className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold"><Building2 size={13}/>I&apos;m hiring</Link></div>
        {nativeLoading&&<div className="feed-skeleton"/>}
        {nativeError&&<p className="text-flag">Couldn&apos;t load organization jobs right now.</p>}
        <div className="space-y-3">{nativeJobs?.map(job=><Link key={job.id} to={"/jobs/"+job.id} className="block rounded-2xl border border-paper-dim bg-white p-4 shadow-sm"><div className="flex items-start gap-3">{job.organizations?.logo_url?<img src={job.organizations.logo_url} alt="" className="h-11 w-11 rounded-xl object-cover"/>:<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-paper-dim"><Building2 size={18}/></div>}<div className="min-w-0 flex-1"><h3 className="font-bold">{job.title}</h3><p className="text-sm text-ink-light">{job.organizations?.name} · {job.location}</p><div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold"><span className="rounded-full bg-brand-light px-2 py-1 text-brand-dark">{job.employment_type} · {job.work_style}</span><span className="rounded-full bg-paper-dim px-2 py-1">{job.rank}</span>{job.requires_cbt&&<span className="rounded-full bg-opportunity-light px-2 py-1 text-opportunity-dark">CBT</span>}{(job.organizations?.verified||job.organizations?.verification_status==="verified")&&<OrganizationVerificationBadge compact/>}</div></div></div></Link>)}</div>
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
          <h2 className="mb-1 text-sm font-semibold text-ink">Job updates & hiring awareness</h2><p className="mb-3 text-xs text-ink-faint">Community and organization updates can announce hiring or upcoming roles. Formal live vacancies are listed above.</p>
          <div className="space-y-4">{communityPosts.map((post) => <PostCard key={post.id} post={post}/>)}</div>
        </section>
      )}
    </div>
  );
}
