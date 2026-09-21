import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, Building2, Globe, Image as ImageIcon, Info, MapPin, Settings, Users } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useOpportunities } from "../hooks/useOpportunities";
import { OpportunityCard } from "../components/OpportunityCard";
import { TrustBadge } from "../components/TrustBadge";
import { useCanManageOrganization, useOrganizationJobs } from "../hooks/useHiring";
import { useAuth } from "../store/auth";
import { OrganizationVerificationBadge } from "../components/OrganizationVerificationBadge";
import { useOrganizationFollow } from "../hooks/useOrganizationFollow";
import { OrganizationFollowButton } from "../components/OrganizationFollowButton";
import { PostComposer } from "../components/PostComposer";
import { PostCard } from "../components/PostCard";
import { useFeedPosts } from "../hooks/useFeedPosts";

function useOrganization(slug:string|undefined){
  return useQuery({
    queryKey:["organization",slug],
    enabled:!!slug,
    queryFn:async()=>{
      const {data,error}=await supabase.from("organizations").select("*").eq("slug",slug as string).single();
      if(error)throw error;
      return data;
    },
  });
}

const JOB_STATE_LABEL:Record<string,string>={
  draft:"Draft",
  open:"Live",
  closed:"Closed",
  filled:"Filled",
};

export function OrganizationPage(){
  const [section,setSection]=useState<"posts"|"about"|"media">("posts");
  const {slug}=useParams<{slug:string}>();
  const {userId}=useAuth();
  const {data:org,isLoading,error}=useOrganization(slug);
  const {data:canManageOrganization}=useCanManageOrganization(org?.id);
  const {data:allOpportunities}=useOpportunities({limit:100});
  const orgOpportunities=allOpportunities?.filter(o=>o.organization_id===org?.id);
  const {data:nativeJobs}=useOrganizationJobs(org?.id);
  const {data:followState}=useOrganizationFollow(org?.id);
  const {data:organizationPosts,isLoading:organizationPostsLoading}=useFeedPosts({
    organizationId:org?.id,
    enabled:!!org?.id,
    limit:20,
  });

  const openNativeJobs=(nativeJobs??[]).filter(j=>j.status==="open");
  const canManage=!!userId&&canManageOrganization===true;
  const visibleJobs=canManage?(nativeJobs??[]):openNativeJobs;
  const media=(organizationPosts??[]).flatMap(post=>(post.media_urls??[]).map((src,index)=>({src,id:`${post.id}-${index}`,postId:post.id})));

  if(isLoading)return <p className="text-ink-light">Loading…</p>;
  if(error||!org)return <div><p className="text-flag">This organization couldn&apos;t be found.</p><Link to="/organizations" className="mt-3 inline-block text-sm text-trust-dark underline">Back to organizations</Link></div>;

  return <div className="page-stack">
    <Link to="/organizations" className="inline-flex items-center gap-1.5 text-sm text-ink-light"><ArrowLeft size={15}/>All organizations</Link>

    <section className="overflow-hidden rounded-3xl border border-paper-dim bg-white shadow-sm">
      <div className="relative h-40 overflow-hidden bg-gradient-to-r from-brand-light via-paper to-trust-light sm:h-52">{org.cover_url&&<img src={org.cover_url} alt="" className="h-full w-full object-cover"/>}<div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/5"/></div>
      <div className="p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          {org.logo_url
            ? <img src={org.logo_url} alt="" className="-mt-12 h-24 w-24 rounded-full border-4 border-white bg-white object-cover shadow-lg sm:-mt-14 sm:h-28 sm:w-28"/>
            : <div className="-mt-12 flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white bg-paper-dim text-ink-light shadow-lg sm:-mt-14 sm:h-28 sm:w-28"><Building2 size={32}/></div>}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="break-words text-2xl font-bold leading-tight sm:text-3xl">{org.name}</h1>{org.verified&&<OrganizationVerificationBadge compact/>}</div>
            <div className="mt-2"><TrustBadge verified={org.verified??false} lastVerifiedAt={null} sponsored={org.is_sponsored}/></div>
            {org.industry&&<p className="mt-1 text-sm font-medium text-brand-dark">{org.industry}</p>}
          </div>
        </div>

        {org.description&&<p className="mt-5 max-w-3xl whitespace-pre-line leading-7 text-ink-light">{String(org.description).replace(/\\n/g,"\n")}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {canManage
            ? <span className="rounded-full bg-brand-light px-4 py-2 text-sm font-semibold text-brand-dark">You manage this organization</span>
            : <OrganizationFollowButton organizationId={org.id}/>}
          <span className="text-sm text-ink-light"><strong className="text-ink">{followState?.followers??0}</strong> {(followState?.followers??0)===1?"follower":"followers"}</span>
        </div>

        {canManage&&<div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Link to="/organizations/manage" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-ink-faint/25 px-3 py-2 text-sm font-semibold text-ink"><Settings size={14}/>Manage</Link>
          <Link to={`/organizations/${org.id}/jobs/new`} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-brand-light px-3 py-2 text-sm font-semibold text-brand-dark"><Briefcase size={14}/>Post a role</Link>
          <Link to={`/organizations/${org.id}/team`} className="col-span-2 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-ink-faint/25 px-3 py-2 text-sm font-semibold text-ink sm:col-auto"><Users size={14}/>Team</Link>
        </div>}

        <div className="mt-5 flex flex-wrap gap-2 text-sm text-ink-light">
          {(org.headquarters||org.state||org.country)&&<span className="inline-flex items-center gap-1.5 rounded-full bg-paper-dim px-3 py-1.5"><MapPin size={14}/>{[org.headquarters||org.state,org.country].filter(Boolean).join(" · ")}</span>}
          {org.website&&<a href={org.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-ink-faint/25 px-3 py-1.5 text-trust-dark hover:bg-paper-dim"><Globe size={14}/>{org.website.replace(/^https?:\/\//,"").replace(/\/$/,"")}</a>}
        </div>
      </div>
    </section>

    <nav className="sticky top-[60px] z-20 -mx-1 flex gap-1 overflow-x-auto border-b border-paper-dim bg-paper/95 px-1 py-2 backdrop-blur sm:static sm:rounded-2xl sm:border sm:bg-white sm:px-2" aria-label="Organization profile sections">
      {(["posts","about","media"] as const).map(item=><button key={item} type="button" onClick={()=>setSection(item)} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold capitalize ${section===item?"bg-brand-light text-brand-dark":"text-ink-light hover:bg-paper"}`}>{item}{item==="media"&&media.length?` · ${media.length}`:""}</button>)}
    </nav>

    {visibleJobs.length>0&&<section>
      <div className="mb-3"><p className="eyebrow">{canManage?"Hiring activity":"Hire directly on POSSARA"}</p><h2 className="text-xl">{canManage?"Roles from "+org.name:"Open roles"}</h2><p className="mt-1 text-sm text-ink-light">{canManage?"Your team can see every state here. Other users only see live roles.":"Apply securely without leaving POSSARA."}</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {visibleJobs.map(job=><article key={job.id} className="rounded-2xl border border-paper-dim bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <Link to={"/jobs/"+job.id} className="min-w-0 hover:underline"><h3 className="font-bold">{job.title}</h3><p className="mt-1 text-xs text-ink-faint">{job.rank} · {job.employment_type} · {job.work_style}</p></Link>
            <div className="flex gap-1">{canManage&&<span className="rounded-full bg-paper-dim px-2 py-1 text-[10px] font-bold uppercase text-ink-light">{JOB_STATE_LABEL[job.status]??job.status}</span>}{job.requires_cbt&&<span className="rounded-full bg-opportunity-light px-2 py-1 text-[10px] font-bold text-opportunity-dark">CBT</span>}</div>
          </div>
          <p className="mt-3 text-sm text-ink-light">{job.location}</p>
          {canManage&&<div className="mt-3 grid grid-cols-2 gap-2">
            <Link to={`/organizations/jobs/${job.id}/applicants`} className="rounded-lg bg-brand-light px-3 py-2 text-center text-xs font-semibold text-brand-dark">Applicants</Link>
            <Link to={`/organizations/${org.id}/jobs/new`} state={{edit:job}} className="rounded-lg bg-paper px-3 py-2 text-center text-xs font-semibold">Edit role</Link>
            {job.requires_cbt&&<Link to={`/organizations/jobs/${job.id}/cbt`} className="rounded-lg bg-opportunity-light px-3 py-2 text-center text-xs font-semibold text-opportunity-dark">CBT</Link>}
            <Link to={`/organizations/jobs/${job.id}/interview`} className="rounded-lg bg-paper px-3 py-2 text-center text-xs font-semibold">Interview</Link>
          </div>}
        </article>)}
      </div>
    </section>}

    {section==="posts"&&<div className="grid items-start gap-5 lg:grid-cols-[minmax(250px,.78fr)_minmax(0,1.35fr)]"><aside className="space-y-4 lg:sticky lg:top-20"><section className="rounded-3xl border border-paper-dim bg-white p-5 shadow-sm"><h2 className="font-semibold">About</h2><p className="mt-2 text-sm leading-6 text-ink-light">{org.description||org.industry||"Organization profile"}</p>{org.website&&<a href={org.website} target="_blank" rel="noreferrer" className="mt-3 block break-all text-sm font-semibold text-trust-dark">{org.website.replace(/^https?:\/\//,"")}</a>}</section>{media.length>0&&<section className="rounded-3xl border border-paper-dim bg-white p-3 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Photos</h2><button type="button" onClick={()=>setSection("media")} className="text-xs font-semibold text-brand-dark">See all</button></div><div className="grid grid-cols-3 gap-1">{media.slice(0,6).map(item=><img key={item.id} src={item.src} alt="" className="aspect-square w-full rounded-lg object-cover"/>)}</div></section>}</aside><main className="min-w-0 space-y-4">
{canManage&&<section className="rounded-2xl border border-brand/15 bg-brand-light/35 p-4">
      <p className="eyebrow">Organization workspace</p>
      <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-lg font-semibold">Manage {org.name}</h2><p className="mt-1 text-sm text-ink-light">Publish organization updates here. Use Post a role for a formal vacancy with applicants, CBT and interviews.</p></div>
        <Link to="/organizations/manage" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white">Open hiring workspace</Link>
      </div>
    </section>}

    {canManage&&<section>
      <div className="mb-3"><p className="eyebrow">Publish as {org.name}</p><h2 className="text-xl">Organization update</h2><p className="mt-1 text-sm text-ink-light">Share an organization insight, update, lesson or useful story here. Formal vacancies stay in the hiring tools at the top.</p></div>
      <PostComposer
        organizationId={org.id}
        organizationName={org.name}
        organizationLogoUrl={org.logo_url}
        showHomeTopicPicker
        placeholder={`Share an update as ${org.name}…`}
      />
    </section>}
<section>
      <div className="mb-3"><p className="eyebrow">Organization feed</p><h2 className="text-xl">Updates from {org.name}</h2></div>
      {organizationPostsLoading&&<div className="feed-skeleton"/>}
      {!organizationPostsLoading&&!organizationPosts?.length&&<div className="rounded-2xl border border-paper-dim bg-white p-5"><p className="font-medium">No organization updates yet.</p><p className="mt-1 text-sm text-ink-light">{canManage?"Publish the first update above.":"Follow this organization to be notified when it shares updates or begins hiring."}</p></div>}
      <div className="space-y-3">{organizationPosts?.map(post=><PostCard key={post.id} post={post}/>)}</div>
    </section>
    </main></div>}

    {section==="about"&&<section className="rounded-3xl border border-paper-dim bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2"><Info size={18}/><h2 className="text-xl font-semibold">About {org.name}</h2></div>
      {org.description?<p className="mt-4 whitespace-pre-line leading-7 text-ink-light">{String(org.description).replace(/\\n/g,"\n")}</p>:<p className="mt-4 text-sm text-ink-faint">No organization description has been added yet.</p>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {org.industry&&<div className="rounded-2xl bg-paper p-4"><p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Industry</p><p className="mt-1 font-medium">{org.industry}</p></div>}
        {(org.headquarters||org.state||org.country)&&<div className="rounded-2xl bg-paper p-4"><p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Location</p><p className="mt-1 font-medium">{[org.headquarters||org.state,org.country].filter(Boolean).join(" · ")}</p></div>}
        {org.website&&<a href={org.website} target="_blank" rel="noreferrer" className="rounded-2xl bg-paper p-4 hover:bg-paper-dim"><p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Website</p><p className="mt-1 break-all font-medium text-trust-dark">{org.website.replace(/^https?:\/\//,"")}</p></a>}
      </div>
    </section>}

    {section==="media"&&<section className="rounded-3xl border border-paper-dim bg-white p-3 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-2"><ImageIcon size={18}/><h2 className="text-xl font-semibold">Media</h2></div>
      {!media.length?<div className="py-10 text-center text-sm text-ink-faint">No organization media yet.</div>:<div className="grid grid-cols-3 gap-1 sm:gap-2">{media.map(item=><Link key={item.id} to={`/?post=${item.postId}`} className="aspect-square overflow-hidden rounded-xl bg-paper-dim"><img src={item.src} alt="" loading="lazy" className="h-full w-full object-cover"/></Link>)}</div>}
    </section>}

    <section>
      <div className="mb-3 flex items-end justify-between gap-3"><div><p className="eyebrow">Openings</p><h2 className="text-xl">Other opportunities from {org.name}</h2><p className="mt-1 text-sm text-ink-light">Scholarships, admissions and other active opportunities connected to this organization appear here.</p></div><span className="inline-flex items-center gap-1 rounded-full bg-paper-dim px-3 py-1.5 text-xs font-medium text-ink-light"><Briefcase size={13}/>{orgOpportunities?.length??0} active</span></div>
      {orgOpportunities?.length===0&&<div className="rounded-2xl border border-paper-dim bg-white p-5"><p className="font-medium">No other active opportunities right now.</p><p className="mt-1 text-sm text-ink-light">Check again later for new opportunities.</p></div>}
      {orgOpportunities?.map(opp=><OpportunityCard key={opp.id} opportunity={opp} organization={opp.organizations} category={opp.opportunity_categories}/>)}
    </section>
  </div>;
}
