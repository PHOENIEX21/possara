import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Briefcase, Building2, GraduationCap, HandHeart, HardHat, HeartPulse, Landmark, Laptop, MapPin, Palette, Search, ShoppingBag } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Organization } from "../types/database";

const INDUSTRIES = [
  { label: "All industries", value: "", icon: Building2 },
  { label: "Hotels & Hospitality", value: "Hotels & Hospitality", icon: Building2 },
  { label: "Education & Schools", value: "Education & Schools", icon: GraduationCap },
  { label: "Technology", value: "Technology", icon: Laptop },
  { label: "Health", value: "Health", icon: HeartPulse },
  { label: "Finance", value: "Finance", icon: Landmark },
  { label: "NGO & Foundation", value: "NGO & Foundation", icon: HandHeart },
  { label: "Construction & Engineering", value: "Construction & Engineering", icon: HardHat },
  { label: "Media & Creative", value: "Media & Creative", icon: Palette },
  { label: "Retail & Commerce", value: "Retail & Commerce", icon: ShoppingBag },
  { label: "Professional Services", value: "Professional Services", icon: Briefcase },
] as const;

const NIGERIA_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara","Federal Capital Territory"
];

type DirectoryOrg = Pick<Organization,"id"|"name"|"slug"|"logo_url"|"description"|"verified"|"industry"|"country"|"state"|"headquarters">;

function useOrganizationDirectory(){
  return useQuery({queryKey:["organization-directory","full"],queryFn:async():Promise<DirectoryOrg[]>=>{
    const {data,error}=await supabase.from("organizations").select("id,name,slug,logo_url,description,verified,industry,country,state,headquarters").order("name");
    if(error)throw error;
    return data??[];
  }});
}

function useOrganizationOpportunityCounts(){
  return useQuery({queryKey:["organization-directory","opportunity-counts"],queryFn:async()=>{
    const nowIso=new Date().toISOString();
    const {data,error}=await supabase.from("opportunities").select("organization_id").eq("status","active").or(`deadline.is.null,deadline.gte.${nowIso}`);
    if(error)throw error;
    const counts:Record<string,number>={};
    for(const row of data??[]){if(row.organization_id)counts[row.organization_id]=(counts[row.organization_id]??0)+1;}
    return counts;
  }});
}

export function Organizations(){
  const {data:organizations,isLoading,error}=useOrganizationDirectory();
  const {data:counts}=useOrganizationOpportunityCounts();
  const [query,setQuery]=useState("");
  const [industry,setIndustry]=useState("");
  const [state,setState]=useState("");

  const filtered=useMemo(()=>organizations?.filter(org=>{
    if(industry&&org.industry!==industry)return false;
    if(state&&org.state!==state)return false;
    if(!query.trim())return true;
    const q=query.trim().toLowerCase();
    return [org.name,org.description,org.industry,org.country,org.state,org.headquarters].some(value=>value?.toLowerCase().includes(q));
  })??[],[organizations,industry,state,query]);

  return <div className="page-stack">
    <section className="page-hero"><div><p className="eyebrow">Organizations</p><h1>Explore organizations by industry and location.</h1><p>Discover real organizations, understand what they do, and open their page to see active jobs, scholarships and other opportunities.</p></div></section>

    <section className="rounded-3xl border border-paper-dim bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full lg:max-w-md"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search organizations or industries…" className="w-full rounded-full border border-ink-faint/30 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand"/></label>
        <label className="flex min-w-[210px] items-center gap-2 rounded-full border border-ink-faint/30 bg-paper/40 px-3 py-2 text-sm"><MapPin size={15} className="text-ink-faint"/><select value={state} onChange={e=>setState(e.target.value)} className="w-full bg-transparent outline-none"><option value="">All States</option>{NIGERIA_STATES.map(item=><option key={item} value={item}>{item}</option>)}</select></label>
      </div>

      <div className="mt-5"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Browse by industry</p><div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">{INDUSTRIES.map(item=>{const Icon=item.icon;const active=industry===item.value;return <button key={item.label} type="button" onClick={()=>setIndustry(item.value)} className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition ${active?"border-brand bg-brand text-white":"border-ink-faint/25 bg-white text-ink-light hover:bg-paper-dim"}`}><Icon size={15}/>{item.label}</button>})}</div></div>
    </section>

    <section><div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">{industry||"All organizations"}</h2><p className="text-sm text-ink-faint">{state?`Showing organizations in ${state}.`:"Use All States to browse without a state restriction."}</p></div><span className="text-xs text-ink-faint">{filtered.length} listed</span></div>
      {isLoading&&<div className="feed-skeleton"/>}
      {error&&<p className="text-flag">Couldn't load organizations right now.</p>}
      {!isLoading&&!error&&filtered.length===0&&<div className="rounded-2xl border border-paper-dim bg-white p-6 text-center"><h3 className="font-semibold">No organizations found</h3><p className="mt-1 text-sm text-ink-light">Try All States, another industry, or a broader search.</p></div>}
      <div className="grid gap-3 md:grid-cols-2">{filtered.map(org=>{const activeCount=counts?.[org.id]??0;return <Link key={org.id} to={`/organizations/${org.slug}`} className="group rounded-2xl border border-paper-dim bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start gap-3">{org.logo_url?<img src={org.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover"/>:<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-paper-dim text-ink-light"><Building2 size={20}/></div>}<div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate font-semibold group-hover:underline">{org.name}</h3>{org.verified&&<span className="shrink-0 rounded-full bg-trust-light px-2 py-0.5 text-[10px] font-medium text-trust-dark">Verified</span>}</div>{org.industry&&<p className="mt-0.5 text-xs font-medium text-brand-dark">{org.industry}</p>}<p className="mt-1 text-xs text-ink-faint">{[org.headquarters||org.state,org.country].filter(Boolean).join(" · ")||"Location not listed"}</p></div></div>{org.description&&<p className="mt-3 line-clamp-2 text-sm leading-5 text-ink-light">{org.description}</p>}<div className="mt-4 flex items-center justify-between border-t border-paper-dim pt-3"><span className="text-xs font-medium text-ink-light">{activeCount} active {activeCount===1?"opportunity":"opportunities"}</span><span className="inline-flex items-center gap-1 text-sm font-medium text-brand-dark">View organization <ArrowRight size={14}/></span></div></Link>})}</div>
    </section>
  </div>;
}
