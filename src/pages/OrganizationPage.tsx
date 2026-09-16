import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, Building2, Globe, MapPin } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useOpportunities } from "../hooks/useOpportunities";
import { OpportunityCard } from "../components/OpportunityCard";
import { TrustBadge } from "../components/TrustBadge";

function useOrganization(slug:string|undefined){return useQuery({queryKey:["organization",slug],enabled:!!slug,queryFn:async()=>{const {data,error}=await supabase.from("organizations").select("*").eq("slug",slug as string).single();if(error)throw error;return data;}})}

export function OrganizationPage(){
  const {slug}=useParams<{slug:string}>();
  const {data:org,isLoading,error}=useOrganization(slug);
  const {data:allOpportunities}=useOpportunities({limit:100});
  const orgOpportunities=allOpportunities?.filter(o=>o.organization_id===org?.id);

  if(isLoading)return <p className="text-ink-light">Loading…</p>;
  if(error||!org)return <div><p className="text-flag">This organization couldn't be found.</p><Link to="/organizations" className="mt-3 inline-block text-sm text-trust-dark underline">Back to organizations</Link></div>;

  return <div className="page-stack">
    <Link to="/organizations" className="inline-flex items-center gap-1.5 text-sm text-ink-light"><ArrowLeft size={15}/>All organizations</Link>

    <section className="overflow-hidden rounded-3xl border border-paper-dim bg-white shadow-sm">
      <div className="h-20 bg-gradient-to-r from-brand-light via-paper to-trust-light"/>
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {org.logo_url?<img src={org.logo_url} alt="" className="-mt-10 h-20 w-20 rounded-2xl border-4 border-white bg-white object-cover shadow-sm"/>:<div className="-mt-10 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-paper-dim text-ink-light shadow-sm"><Building2 size={30}/></div>}
          <div className="min-w-0 flex-1"><TrustBadge verified={org.verified??false} lastVerifiedAt={null} sponsored={org.is_sponsored}/><h1 className="mt-2 text-3xl leading-tight">{org.name}</h1>{org.industry&&<p className="mt-1 text-sm font-medium text-brand-dark">{org.industry}</p>}</div>
        </div>

        {org.description&&<p className="mt-5 max-w-3xl leading-7 text-ink-light">{org.description}</p>}

        <div className="mt-5 flex flex-wrap gap-2 text-sm text-ink-light">
          {(org.headquarters||org.state||org.country)&&<span className="inline-flex items-center gap-1.5 rounded-full bg-paper-dim px-3 py-1.5"><MapPin size={14}/>{[org.headquarters||org.state,org.country].filter(Boolean).join(" · ")}</span>}
          {org.website&&<a href={org.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-ink-faint/25 px-3 py-1.5 text-trust-dark hover:bg-paper-dim"><Globe size={14}/>{org.website.replace(/^https?:\/\//,"").replace(/\/$/,"")}</a>}
        </div>
      </div>
    </section>

    <section>
      <div className="mb-3 flex items-end justify-between gap-3"><div><p className="eyebrow">Openings</p><h2 className="text-xl">Jobs & opportunities from {org.name}</h2><p className="mt-1 text-sm text-ink-light">Active opportunities connected to this organization appear here.</p></div><span className="inline-flex items-center gap-1 rounded-full bg-paper-dim px-3 py-1.5 text-xs font-medium text-ink-light"><Briefcase size={13}/>{orgOpportunities?.length??0} active</span></div>
      {orgOpportunities?.length===0&&<div className="rounded-2xl border border-paper-dim bg-white p-5"><p className="font-medium">No active opportunities right now.</p><p className="mt-1 text-sm text-ink-light">You can still visit the organization's official website or check again later.</p></div>}
      {orgOpportunities?.map(opp=><OpportunityCard key={opp.id} opportunity={opp} organization={opp.organizations} category={opp.opportunity_categories}/>) }
    </section>
  </div>;
}
