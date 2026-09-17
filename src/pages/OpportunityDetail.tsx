import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Bookmark, BriefcaseBusiness, CheckCircle2, ThumbsUp } from "lucide-react";
import { useOpportunity } from "../hooks/useOpportunities";
import { useOpportunityViewerState, useToggleOpportunitySave, useToggleOpportunityUseful } from "../hooks/useOpportunityActions";
import { useApplicationForOpportunity, useSaveApplication } from "../hooks/usePossaraPlus";
import { useAuth } from "../store/auth";
import { TrustBadge } from "../components/TrustBadge";
import { OpportunityMatchCard } from "../components/OpportunityMatchCard";
import { getCategoryIcon } from "../lib/categoryIcon";

export function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const { userId } = useAuth();
  const { data: opportunity, isLoading, error } = useOpportunity(id);
  const { data: viewerState } = useOpportunityViewerState(id ?? "");
  const { data: application } = useApplicationForOpportunity(id);
  const toggleSave = useToggleOpportunitySave(id ?? "");
  const toggleUseful = useToggleOpportunityUseful(id ?? "");
  const trackApplication = useSaveApplication();

  if (isLoading) return <p className="text-ink-light">Loading…</p>;
  if (error || !opportunity) return <div><p className="text-flag">This opportunity couldn't be found — it may have been closed, or the link may be incorrect.</p><Link to="/opportunities" className="mt-3 inline-block text-sm text-trust-dark underline">Back to all opportunities</Link></div>;

  const deadline = opportunity.deadline ? new Date(opportunity.deadline).toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"}) : null;
  const category = opportunity.opportunity_categories;
  const CategoryIcon = category ? getCategoryIcon(category.icon) : null;

  async function startTracking() {
    if (!userId || !id || application) return;
    await trackApplication.mutateAsync({ opportunityId: id, status: "preparing", nextStep: "Review eligibility and required documents" });
  }

  return <div className="max-w-prose">
    <Link to="/opportunities" className="inline-flex items-center gap-1.5 text-sm text-ink-light hover:text-ink"><ArrowLeft size={15}/>All opportunities</Link>
    <div className="mt-4"><TrustBadge verified={opportunity.organizations?.verified??false} lastVerifiedAt={opportunity.last_verified_at} sponsored={opportunity.organizations?.is_sponsored}/></div>
    {opportunity.status==="closed"&&<div className="mt-3 rounded-lg bg-flag-light px-4 py-3 text-sm text-flag-dark">This opportunity is closed and shown for reference.</div>}
    {opportunity.status==="active"&&opportunity.deadline&&new Date(opportunity.deadline)<new Date()&&<div className="mt-3 rounded-lg bg-flag-light px-4 py-3 text-sm text-flag-dark">The recorded deadline has passed. Check the official source before acting.</div>}
    {category&&CategoryIcon&&<span className="mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium" style={{backgroundColor:(category.color??"#4A4468")+"1a",color:category.color??"#4A4468"}}><CategoryIcon size={12}/>{category.name}</span>}
    <h1 className="mt-3 text-3xl leading-tight">{opportunity.title}</h1>
    {opportunity.organizations?.name&&<p className="mt-1 text-ink-light">{opportunity.organizations.name}</p>}
    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-light">{deadline&&<span>Deadline: {deadline}</span>}{opportunity.location&&<span>Location: {opportunity.location}</span>}</div>
    <p className="mt-6 whitespace-pre-line leading-relaxed text-ink">{opportunity.description}</p>
    {opportunity.eligibility&&<div className="mt-6"><h2 className="text-sm font-medium text-ink-faint">Eligibility</h2><p className="mt-1 whitespace-pre-line leading-relaxed text-ink-light">{opportunity.eligibility}</p></div>}

    {userId && <OpportunityMatchCard opportunity={opportunity}/>} 

    {userId && <section className="mt-5 rounded-3xl border border-black/[.06] bg-white p-4 shadow-card sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow">POSSARA+ action</p><h2 className="mt-1 text-lg font-semibold">Turn this opportunity into a plan</h2><p className="mt-1 max-w-xl text-sm leading-6 text-ink-light">Track your stage, next action, private notes and deadline in one place.</p></div>{application?<Link to="/applications" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-trust-light px-4 py-2.5 text-sm font-semibold text-trust-dark"><CheckCircle2 size={16}/>Tracked · {application.status}</Link>:<button type="button" onClick={startTracking} disabled={trackApplication.isPending} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><BriefcaseBusiness size={16}/>{trackApplication.isPending?"Adding…":"Track application"}</button>}</div>
      {trackApplication.error&&<p className="mt-2 text-xs text-flag">{(trackApplication.error as Error).message}</p>}
    </section>}

    <div className="mt-8 flex flex-wrap items-center gap-4">
      <button disabled={!userId||toggleUseful.isPending} onClick={()=>userId&&toggleUseful.mutate(!!viewerState?.reacted)} className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm ${viewerState?.reacted?"border-trust bg-trust-light text-trust-dark":"border-ink-faint/30"}`}><ThumbsUp size={15}/>Useful</button>
      <button disabled={!userId||toggleSave.isPending} onClick={()=>userId&&toggleSave.mutate(!!viewerState?.saved)} className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm ${viewerState?.saved?"border-opportunity bg-opportunity-light text-opportunity-dark":"border-ink-faint/30"}`}><Bookmark size={15}/>{viewerState?.saved?"Saved":"Save"}</button>
      {opportunity.link&&<a href={opportunity.link} target="_blank" rel="noreferrer" className="ml-auto rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper hover:bg-ink/90">View opportunity</a>}
    </div>
  </div>;
}
