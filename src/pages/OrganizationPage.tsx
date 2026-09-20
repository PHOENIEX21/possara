import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, Building2, Globe, MapPin, Settings, Users } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useOpportunities } from "../hooks/useOpportunities";
import { OpportunityCard } from "../components/OpportunityCard";
import { TrustBadge } from "../components/TrustBadge";
import { useMyOrganizations, useOrganizationJobs } from "../hooks/useHiring";
import { useAuth } from "../store/auth";
import { OrganizationVerificationBadge } from "../components/OrganizationVerificationBadge";
import { useOrganizationFollow, useToggleOrganizationFollow } from "../hooks/useOrganizationFollow";

function useOrganization(slug:string|undefined){return useQuery({queryKey:["organization",slug],enabled:!!slug,queryFn:async()=>{const {data,error}=await supabase.from("organizations").select("*").eq("slug",slug as string).single();if(error)throw error;return data;}})}

export function OrganizationPage(){
  const {slug}=useParams<{slug:string}>();
  const {userId}=useAuth();
  const {data:myOrganizations}=useMyOrganizations();
  const {data:org,isLoading,error}=useOrganization(slug);
  const {data:allOpportunities}=useOpportunities({limit:100});
  const orgOpportunities=allOpportunities?.filter(o=>o.organization_id===org?.id);
  const {data:nativeJobs}=useOrganizationJobs(org?.id);
  const {data:followState}=useOrganizationFollow(org?.id);
  const toggleFollow=useToggleOrganizationFollow(org?.id??"");
  const openNativeJobs=(nativeJobs??[]).filter(j=>j.status==="open");
  const membership=(myOrganizations??[]).find((row:any)=>row.organizations?.id===org?.id);
  const canManage=!!userId&&!!membership&&["owner","recruiter"].includes((membership as any).role);
  const visibleJobs=canManage?(nativeJobs??[]):openNativeJobs;

  if(isLoading)return <p className="text-ink-light">Loading…</p>;
  if(error||!org)return <div><p className="text-flag">This organization couldn't be found.</p><Link to="/organizations" className="mt-3 inline-block text-sm text-trust-dark underline">Back to organizations</Link></div>;

  return <div className="page-stack">
    <Link to="/organizations" className="inline-flex items-center gap-1.5 text-sm text-ink-light"><ArrowLeft size={15}/>All organizations</Link>

    <section className="overflow-hidden rounded-3xl border border-paper-dim bg-white shadow-sm">
      <div className="h-20 bg-gradient-to-r from-brand-light via-paper to-trust-light"/>
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {org.logo_url?<img src={org.logo_url} alt="" className="-mt-10 h-20 w-20 rounded-2xl border-4 border-white bg-white object-cover shadow-sm"/>:<div className="-mt-10 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-paper-dim text-ink-light shadow-sm"><Building2 size={30}/></div>}
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl leading-tight">{org.name}</h1>{org.verified&&<OrganizationVerificationBadge compact/>}</div><div className="mt-2"><TrustBadge verified={org.verified??false} lastVerifiedAt={null} sponsored={org.is_sponsored}/></div>{org.industry&&<p className="mt-1 text-sm font-medium text-brand-dark">{org.industry}</p>}</div>
        </div>

        {org.description&&<p className="mt-5 max-w-3xl leading-7 text-ink-light">{org.description}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-2"><button type="button" disabled={toggleFollow.isPending} onClick={()=>userId?toggleFollow.mutate(!!followState?.following):window.location.assign("/signin")} className={`rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50 ${followState?.following?"border border-ink-faint/30 bg-white text-ink":"bg-ink text-white"}`}>{toggleFollow.isPending?"Saving…":followState?.following?"Following":"Follow"}</button><span className="text-sm text-ink-light"><strong className="text-ink">{followState?.followers??0}</strong> {(followState?.followers??0)===1?"follower":"followers"}</span>{canManage&&<><Link to="/organizations/manage" className="inline-flex items-center gap-1.5 rounded-full border border-ink-faint/25 px-4 py-2 text-sm font-semibold text-ink"><Settings size={14}/>Manage organization</Link><Link to={`/organizations/${org.id}/jobs/new`} className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-4 py-2 text-sm font-semibold text-brand-dark"><Briefcase size={14}/>Post a job</Link><Link to={`/organizations/${org.id}/team`} className="inline-flex items-center gap-1.5 rounded-full border border-ink-faint/25 px-4 py-2 text-sm font-semibold text-ink"><Users size={14}/>Team</Link></>}</div>\n\n        <div className="mt-5 flex flex-wrap gap-2 text-sm text-ink-light">
          {(org.headquarters||org.state||org.country)&&<span className="inline-flex items-center gap-1.5 rounded-full bg-paper-dim px-3 py-1.5"><MapPin size={14}/>{[org.headquarters||org.state,org.country].filter(Boolean).join(" · ")}</span>}
          {org.website&&<a href={org.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-ink-faint/25 px-3 py-1.5 text-trust-dark hover:bg-paper-dim"><Globe size={14}/>{org.website.replace(/^https?:\/\//,"").replace(/\/$/,"")}</a>}
        </div>
      </div>
    </section>

    {canManage&&<section className="rounded-2xl border border-brand/15 bg-brand-light/35 p-4"><p className="eyebrow">Organization workspace</p><div className="mt-1 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Manage {org.name}</h2><p className="mt-1 text-sm text-ink-light">Jobs, applicants, CBT, interviews and team management stay connected to this same organization page.</p></div><Link to="/organizations/manage" className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white">Open management</Link></div></section>}\n\n    {visibleJobs.length>0&&<section><div className="mb-3"><p className="eyebrow">{canManage?"Your hiring activity":"Hire directly on POSSARA"}</p><h2 className="text-xl">{canManage?"Jobs from "+org.name:"Open roles"}</h2><p className="mt-1 text-sm text-ink-light">{canManage?"Draft, open, closed and filled roles remain visible to your organization team here.":"Apply securely without leaving POSSARA."}</p></div><div className="grid gap-3 sm:grid-cols-2">{visibleJobs.map(job=><div key={job.id} className="rounded-2xl border border-paper-dim bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-2"><Link to={"/jobs/"+job.id} className="min-w-0 hover:underline"><h3 className="font-bold">{job.title}</h3><p className="mt-1 text-xs text-ink-faint">{job.rank} · {job.employment_type} · {job.work_style}</p></Link><div className="flex gap-1">{canManage&&<span className="rounded-full bg-paper-dim px-2 py-1 text-[10px] font-bold uppercase text-ink-light">{job.status}</span>}{job.requires_cbt&&<span className="rounded-full bg-opportunity-light px-2 py-1 text-[10px] font-bold text-opportunity-dark">CBT</span>}</div></div><p className="mt-3 text-sm text-ink-light">{job.location}</p>{canManage&&<div className="mt-3 flex flex-wrap gap-2"><Link to={`/organizations/jobs/${job.id}/applicants`} className="rounded-lg bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand-dark">Applicants</Link><Link to={`/organizations/${org.id}/jobs/new`} state={{edit:job}} className="rounded-lg bg-paper px-3 py-1.5 text-xs font-semibold">Edit job</Link>{job.requires_cbt&&<Link to={`/organizations/jobs/${job.id}/cbt`} className="rounded-lg bg-opportunity-light px-3 py-1.5 text-xs font-semibold text-opportunity-dark">CBT</Link>}<Link to={`/organizations/jobs/${job.id}/interview`} className="rounded-lg bg-paper px-3 py-1.5 text-xs font-semibold">Interview</Link></div>}</div>)}</div></section>}

    <section>
      <div className="mb-3 flex items-end justify-between gap-3"><div><p className="eyebrow">Openings</p><h2 className="text-xl">Jobs & opportunities from {org.name}</h2><p className="mt-1 text-sm text-ink-light">Active opportunities connected to this organization appear here.</p></div><span className="inline-flex items-center gap-1 rounded-full bg-paper-dim px-3 py-1.5 text-xs font-medium text-ink-light"><Briefcase size={13}/>{orgOpportunities?.length??0} active</span></div>
      {orgOpportunities?.length===0&&<div className="rounded-2xl border border-paper-dim bg-white p-5"><p className="font-medium">No active opportunities right now.</p><p className="mt-1 text-sm text-ink-light">You can still visit the organization's official website or check again later.</p></div>}
      {orgOpportunities?.map(opp=><OpportunityCard key={opp.id} opportunity={opp} organization={opp.organizations} category={opp.opportunity_categories}/>) }
    </section>
  </div>;
}
