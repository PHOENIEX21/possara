import { useMemo, useState } from "react";
import { Activity, CheckCircle2, Clock3, ExternalLink, Play, Plus, Radar, RefreshCw, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import {
  useAddDiscoverySource,
  useApproveDiscoveryCandidate,
  useDiscoveryCandidates,
  useDiscoveryCategories,
  useDiscoveryRuns,
  useDiscoverySources,
  useRejectDiscoveryCandidate,
  useRunOpportunityDiscovery,
  useSetDiscoveryAutoPublish,
  useToggleDiscoverySource,
  useVerifyDiscoverySource,
} from "../hooks/useOpportunityDiscoveryAdmin";
import type { DiscoveryCandidate, DiscoverySource } from "../hooks/useOpportunityDiscoveryAdmin";

function timeAgo(value: string | null) {
  if (!value) return "Never";
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  return <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-flag">{error instanceof Error ? error.message : "Something went wrong."}</p>;
}

function trustLabel(value: DiscoverySource["trust_tier"]) {
  if (value === "official") return "Official";
  if (value === "partner") return "Partner";
  return "Trusted aggregator";
}

function CandidateCard({ candidate }: { candidate: DiscoveryCandidate }) {
  const categories = useDiscoveryCategories();
  const approve = useApproveDiscoveryCandidate();
  const reject = useRejectDiscoveryCandidate();
  const defaultSlug = candidate.category_slug ?? candidate.opportunity_sources?.default_category_slug ?? "";
  const defaultCategoryId = categories.data?.find((item) => item.slug === defaultSlug)?.id ?? "";
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  return <article className="rounded-3xl border border-black/[.06] bg-white p-4 shadow-card sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${candidate.status === "needs_review" ? "bg-amber-50 text-amber-700" : "bg-brand-light text-brand-dark"}`}>{candidate.status === "needs_review" ? "Changed · review again" : "New candidate"}</span>
          <span className="rounded-full bg-paper px-2 py-1 text-[10px] font-semibold text-ink-faint">{candidate.opportunity_sources ? trustLabel(candidate.opportunity_sources.trust_tier) : "Source"}</span>
        </div>
        <h2 className="mt-2 text-lg font-semibold leading-snug">{candidate.title}</h2>
        <p className="mt-1 text-xs text-ink-faint">{candidate.organization_name || candidate.opportunity_sources?.name || "Unknown organization"}{candidate.location ? ` · ${candidate.location}` : ""}</p>
      </div>
      <a href={candidate.canonical_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-ink-light hover:text-ink">Official source <ExternalLink size={12}/></a>
    </div>
    {candidate.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink-light">{candidate.description}</p>}
    <div className="mt-3 grid gap-2 sm:grid-cols-3">
      <div className="rounded-xl bg-paper p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Source</p><p className="mt-1 text-xs font-medium">{candidate.opportunity_sources?.name ?? "Unknown"}</p></div>
      <div className="rounded-xl bg-paper p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Deadline</p><p className="mt-1 text-xs font-medium">{candidate.deadline ? new Date(candidate.deadline).toLocaleDateString() : "Not provided"}</p></div>
      <div className="rounded-xl bg-paper p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Seen</p><p className="mt-1 text-xs font-medium">{timeAgo(candidate.last_seen_at)}</p></div>
    </div>
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
      <label className="min-w-0 flex-1 text-xs font-semibold text-ink-light">Publish under category<select value={categoryId} onChange={(event)=>setCategoryId(event.target.value)} className="mt-1 w-full rounded-xl border border-ink-faint/20 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"><option value="">Use detected/default category</option>{categories.data?.map((category)=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <button type="button" disabled={approve.isPending} onClick={()=>approve.mutate({candidateId:candidate.id,categoryId:categoryId||null})} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-trust px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><CheckCircle2 size={16}/>{approve.isPending?"Publishing…":"Approve & publish"}</button>
      <button type="button" onClick={()=>setShowReject((value)=>!value)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-flag/30 px-4 py-2.5 text-sm font-semibold text-flag"><XCircle size={16}/>Reject</button>
    </div>
    {showReject && <div className="mt-3 flex gap-2"><input value={reason} onChange={(event)=>setReason(event.target.value)} maxLength={500} placeholder="Optional reason" className="min-w-0 flex-1 rounded-xl border border-ink-faint/20 px-3 py-2 text-sm outline-none focus:border-brand"/><button type="button" disabled={reject.isPending} onClick={()=>reject.mutate({candidateId:candidate.id,reason})} className="rounded-xl bg-flag px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Confirm reject</button></div>}
    <ErrorBox error={approve.error || reject.error || categories.error}/>
  </article>;
}

function AddSourceForm() {
  const add = useAddDiscoverySource();
  const categories = useDiscoveryCategories();
  const [name,setName]=useState(""); const [endpoint,setEndpoint]=useState(""); const [format,setFormat]=useState<DiscoverySource["format"]>("rss");
  const [trust,setTrust]=useState<DiscoverySource["trust_tier"]>("official"); const [category,setCategory]=useState(""); const [location,setLocation]=useState(""); const [organization,setOrganization]=useState(""); const [appname,setAppname]=useState("");
  async function submit(event: React.FormEvent){event.preventDefault(); await add.mutateAsync({name,endpointUrl:endpoint,format,trustTier:trust,categorySlug:category||null,location,organizationName:organization,appname}); setName("");setEndpoint("");setLocation("");setOrganization("");setAppname("");}
  return <form onSubmit={submit} className="rounded-3xl border border-black/[.06] bg-white p-4 shadow-card sm:p-5">
    <div className="flex items-center gap-2"><Plus size={17} className="text-brand-dark"/><h2 className="font-semibold">Add trusted source</h2></div>
    <p className="mt-1 text-xs leading-5 text-ink-faint">Use official/partner feeds where possible. RSS, Atom, JSON Feed, Grants.gov and ReliefWeb are supported.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-semibold text-ink-light">Source name<input required value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g. University careers feed" className="mt-1 w-full rounded-xl border border-ink-faint/20 px-3 py-2.5 text-sm outline-none focus:border-brand"/></label>
      <label className="text-xs font-semibold text-ink-light">Format<select value={format} onChange={(e)=>setFormat(e.target.value as DiscoverySource["format"])} className="mt-1 w-full rounded-xl border border-ink-faint/20 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"><option value="rss">RSS</option><option value="atom">Atom</option><option value="json_feed">JSON Feed</option><option value="json_api">JSON API</option><option value="grants_gov">Grants.gov API</option><option value="reliefweb">ReliefWeb API</option></select></label>
      <label className="text-xs font-semibold text-ink-light sm:col-span-2">Endpoint URL<input required type="url" value={endpoint} onChange={(e)=>setEndpoint(e.target.value)} placeholder="https://…" className="mt-1 w-full rounded-xl border border-ink-faint/20 px-3 py-2.5 text-sm outline-none focus:border-brand"/></label>
      <label className="text-xs font-semibold text-ink-light">Trust level<select value={trust} onChange={(e)=>setTrust(e.target.value as DiscoverySource["trust_tier"])} className="mt-1 w-full rounded-xl border border-ink-faint/20 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"><option value="official">Official</option><option value="partner">Direct partner</option><option value="trusted_aggregator">Trusted aggregator</option></select></label>
      <label className="text-xs font-semibold text-ink-light">Default category<select value={category} onChange={(e)=>setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-ink-faint/20 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"><option value="">Detect / none</option>{categories.data?.map((item)=><option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
      <label className="text-xs font-semibold text-ink-light">Default organization<input value={organization} onChange={(e)=>setOrganization(e.target.value)} placeholder="Optional" className="mt-1 w-full rounded-xl border border-ink-faint/20 px-3 py-2.5 text-sm outline-none focus:border-brand"/></label>
      <label className="text-xs font-semibold text-ink-light">Default location<input value={location} onChange={(e)=>setLocation(e.target.value)} placeholder="Optional" className="mt-1 w-full rounded-xl border border-ink-faint/20 px-3 py-2.5 text-sm outline-none focus:border-brand"/></label>
      {format === "reliefweb" && <label className="text-xs font-semibold text-ink-light sm:col-span-2">ReliefWeb approved appname<input required value={appname} onChange={(e)=>setAppname(e.target.value)} placeholder="Required by ReliefWeb before enabling" className="mt-1 w-full rounded-xl border border-ink-faint/20 px-3 py-2.5 text-sm outline-none focus:border-brand"/></label>}
    </div>
    <button disabled={add.isPending} className="mt-4 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{add.isPending?"Adding…":"Add source"}</button>
    <ErrorBox error={add.error}/>
  </form>;
}

export function OpportunityDiscoveryAdmin() {
  const sources = useDiscoverySources(); const candidates = useDiscoveryCandidates(); const runs = useDiscoveryRuns();
  const trigger = useRunOpportunityDiscovery(); const toggle = useToggleDiscoverySource(); const verifySource = useVerifyDiscoverySource(); const autoPublish = useSetDiscoveryAutoPublish();
  const healthySources = sources.data?.filter((source)=>source.enabled && !source.last_error).length ?? 0;
  const enabledSources = sources.data?.filter((source)=>source.enabled).length ?? 0;
  const latestRun = runs.data?.[0];
  const failures = sources.data?.filter((source)=>source.enabled && source.last_error).length ?? 0;
  const pending = candidates.data?.length ?? 0;
  const summary = useMemo(()=>({healthySources,enabledSources,failures,pending}),[healthySources,enabledSources,failures,pending]);

  return <div className="mx-auto max-w-5xl space-y-5 pb-12">
    <section className="rounded-[28px] bg-ink p-6 text-white shadow-xl sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-sm font-medium text-white/60"><Radar size={17}/>POSSARA Opportunity Engine</div><h1 className="mt-2 text-3xl font-bold text-white">Fresh opportunities, continuously checked.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Discovery runs every 4 hours. Verified official/direct-partner sources can auto-publish fresh valid items; everything else remains review-first. Deadlines and source links are rechecked daily.</p></div><div className="flex flex-wrap gap-2"><button disabled={trigger.isPending} onClick={()=>trigger.mutate("discover")} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-50"><Play size={15}/>{trigger.isPending?"Running…":"Run discovery now"}</button><button disabled={trigger.isPending} onClick={()=>trigger.mutate("recheck")} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><RefreshCw size={15}/>Recheck published</button></div></div>
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-2xl bg-white/10 p-3"><p className="text-2xl font-bold">{summary.pending}</p><p className="text-xs text-white/55">Awaiting review</p></div><div className="rounded-2xl bg-white/10 p-3"><p className="text-2xl font-bold">{summary.enabledSources}</p><p className="text-xs text-white/55">Enabled sources</p></div><div className="rounded-2xl bg-white/10 p-3"><p className="text-2xl font-bold">{summary.healthySources}</p><p className="text-xs text-white/55">Healthy sources</p></div><div className="rounded-2xl bg-white/10 p-3"><p className="text-2xl font-bold">{summary.failures}</p><p className="text-xs text-white/55">Need attention</p></div></div>
      <ErrorBox error={trigger.error}/>
    </section>

    <section className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
      <div className="rounded-3xl border border-black/[.06] bg-white p-4 shadow-card sm:p-5"><div className="flex items-center justify-between gap-3"><div><p className="eyebrow">Source health</p><h2 className="mt-1 text-xl font-semibold">Trusted source registry</h2></div><ShieldCheck size={20} className="text-trust-dark"/></div><div className="mt-4 space-y-2">{sources.isLoading&&<p className="text-sm text-ink-light">Loading sources…</p>}{sources.data?.map((source)=><div key={source.id} className="rounded-2xl border border-paper-dim p-3"><div className="flex items-start gap-3"><div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${source.enabled?(source.last_error?"bg-amber-500":"bg-trust"):"bg-ink-faint/30"}`}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{source.name}</p><span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-semibold text-ink-faint">{trustLabel(source.trust_tier)}</span>{source.verified_source&&<span className="rounded-full bg-trust-light px-2 py-0.5 text-[10px] font-bold text-trust-dark">Verified source</span>}<span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-semibold text-ink-faint">{source.format}</span></div><p className="mt-1 truncate text-xs text-ink-faint">{source.endpoint_url}</p><p className="mt-1 text-[11px] text-ink-faint">Last success: {timeAgo(source.last_success_at)} · every {Math.round(source.check_every_minutes/60*10)/10}h</p>{source.last_error&&<p className="mt-1 line-clamp-2 text-[11px] text-flag">{source.last_error}</p>}{source.setup_note&&<p className="mt-1 text-[11px] text-amber-700">{source.setup_note}</p>}</div><div className="flex shrink-0 flex-col gap-1"><button onClick={()=>toggle.mutate({id:source.id,enabled:!source.enabled})} className={`rounded-full px-3 py-1 text-[11px] font-semibold ${source.enabled?"bg-trust-light text-trust-dark":"bg-paper text-ink-light"}`}>{source.enabled?"Enabled":"Disabled"}</button>{source.trust_tier!=="trusted_aggregator"&&!source.verified_source&&<button disabled={verifySource.isPending} title="Verify after repeated successful discovery runs" onClick={()=>verifySource.mutate({id:source.id})} className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 disabled:opacity-50">Verify source</button>}{source.trust_tier!=="trusted_aggregator"&&source.verified_source&&<button title="Verified official/partner sources can auto-publish fresh opportunities" onClick={()=>autoPublish.mutate({id:source.id,autoPublish:!source.auto_publish})} className={`rounded-full px-3 py-1 text-[11px] font-semibold ${source.auto_publish?"bg-brand text-white":"bg-paper text-ink-light"}`}>{source.auto_publish?"Auto-publish on":"Review first"}</button>}</div></div></div>)}</div><ErrorBox error={sources.error||toggle.error||verifySource.error||autoPublish.error}/></div>
      <AddSourceForm/>
    </section>

    <section><div className="mb-3 flex items-end justify-between gap-3"><div><p className="eyebrow">Review queue</p><h2 className="mt-1 text-xl font-semibold">Discovered opportunities</h2><p className="mt-1 text-sm text-ink-light">Nothing becomes public from a review-first source until you approve it.</p></div><span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark">{pending} waiting</span></div>{candidates.isLoading&&<div className="feed-skeleton"/>}{!candidates.isLoading&&pending===0&&<div className="rounded-3xl border border-dashed border-black/10 bg-white p-8 text-center"><Sparkles size={24} className="mx-auto text-ink-faint"/><p className="mt-3 font-semibold">Review queue is clear</p><p className="mt-1 text-sm text-ink-light">The next scheduled discovery run will add genuinely new candidates here.</p></div>}<div className="space-y-3">{candidates.data?.map((candidate)=><CandidateCard key={candidate.id} candidate={candidate}/>)}</div><ErrorBox error={candidates.error}/></section>

    <section className="rounded-3xl border border-black/[.06] bg-white p-4 shadow-card sm:p-5"><div className="flex items-center justify-between"><div><p className="eyebrow">Automation history</p><h2 className="mt-1 text-xl font-semibold">Recent discovery runs</h2></div><Activity size={19} className="text-brand-dark"/></div>{latestRun&&<p className="mt-1 text-xs text-ink-faint">Latest run {timeAgo(latestRun.started_at)}</p>}<div className="mt-4 divide-y divide-paper-dim">{runs.data?.map((run)=><div key={run.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${run.status==="success"?"bg-trust-light text-trust-dark":run.status==="failed"?"bg-red-50 text-flag":"bg-paper text-ink-light"}`}>{run.status==="success"?<CheckCircle2 size={17}/>:run.status==="failed"?<XCircle size={17}/>:<Clock3 size={17}/>}</div><div className="min-w-0 flex-1"><p className="text-sm font-medium">{run.opportunity_sources?.name ?? "System recheck"} · {run.mode}</p><p className="mt-0.5 text-xs text-ink-faint">Fetched {run.fetched_count} · new {run.new_count} · updated {run.updated_count} · duplicates {run.duplicate_count}</p>{run.error_message&&<p className="mt-1 line-clamp-1 text-xs text-flag">{run.error_message}</p>}</div><span className="text-xs text-ink-faint">{new Date(run.started_at).toLocaleString()}</span></div>)}</div><ErrorBox error={runs.error}/></section>
  </div>;
}
