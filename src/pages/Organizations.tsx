import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Briefcase, Building2, Church, ExternalLink, GraduationCap, HandHeart, HardHat, HeartPulse, Landmark, Laptop, MapPin, Palette, Search, ShoppingBag, Trees } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Organization } from "../types/database";
import { OrganizationVerificationBadge } from "../components/OrganizationVerificationBadge";

const INDUSTRIES = [
  { label: "All organizations", value: "", icon: Building2, description: "Browse every organization currently listed on POSSARA." },
  { label: "Hotels", value: "Hotels & Hospitality", icon: Building2, description: "Hotels, resorts, guest houses and hospitality employers." },
  { label: "Schools & Universities", value: "Education & Schools", icon: GraduationCap, description: "Schools, universities, colleges and learning institutions." },
  { label: "Health", value: "Health", icon: HeartPulse, description: "Hospitals, clinics, laboratories and health organizations." },
  { label: "Technology", value: "Technology", icon: Laptop, description: "Technology companies, hubs, training centres and startups." },
  { label: "Finance", value: "Finance", icon: Landmark, description: "Banks, fintechs, insurers and financial institutions." },
  { label: "NGOs & Foundations", value: "NGO & Foundation", icon: HandHeart, description: "Nonprofits, foundations and development organizations." },
  { label: "Government & Public", value: "Government & Public Institution", icon: Landmark, description: "Government agencies, commissions and public institutions." },
  { label: "Religious organizations", value: "Religious Organization", icon: Church, description: "Churches, parishes, ministries, mosques and faith organizations." },
  { label: "Recreation & Tourism", value: "Recreation & Tourism", icon: Trees, description: "Attractions, parks, resorts, cultural and recreational places." },
  { label: "Engineering", value: "Construction & Engineering", icon: HardHat, description: "Construction, engineering and infrastructure organizations." },
  { label: "Media & Creative", value: "Media & Creative", icon: Palette, description: "Media, film, design, entertainment and creative organizations." },
  { label: "Retail & Commerce", value: "Retail & Commerce", icon: ShoppingBag, description: "Retailers, stores, marketplaces and commercial organizations." },
  { label: "Professional Services", value: "Professional Services", icon: Briefcase, description: "Consulting, legal, accounting and other professional services." },
] as const;

const NIGERIA_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara","Federal Capital Territory"
];

type DirectoryOrg = Pick<Organization,"id"|"name"|"slug"|"logo_url"|"website"|"description"|"verified"|"industry"|"country"|"state"|"headquarters">;

function useOrganizationDirectory(){
  return useQuery({queryKey:["organization-directory","full"],queryFn:async():Promise<DirectoryOrg[]>=>{
    const {data,error}=await supabase.from("organizations").select("id,name,slug,logo_url,website,description,verified,industry,country,state,headquarters").order("name");
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
  const [country,setCountry]=useState("");
  const [state,setState]=useState("");
  const directoryStartRef=useRef<HTMLElement>(null);

  const countries=useMemo(()=>{
    const values=new Set<string>();
    for(const org of organizations??[]) if(org.country?.trim()) values.add(org.country.trim());
    return [...values].sort((a,b)=>a.localeCompare(b));
  },[organizations]);

  const availableStates=useMemo(()=>{
    if(!country||country.toLowerCase()==="nigeria") return NIGERIA_STATES;
    const values=new Set<string>();
    for(const org of organizations??[]) if(org.country===country&&org.state?.trim()) values.add(org.state.trim());
    return [...values].sort((a,b)=>a.localeCompare(b));
  },[organizations,country]);

  const filtered=useMemo(()=>organizations?.filter(org=>{
    if(industry&&org.industry!==industry)return false;
    if(country&&org.country!==country)return false;
    if(state&&org.state!==state)return false;
    if(!query.trim())return true;
    const q=query.trim().toLowerCase();
    return [org.name,org.description,org.industry,org.country,org.state,org.headquarters].some(value=>value?.toLowerCase().includes(q));
  })??[],[organizations,industry,country,state,query]);

  const selectedIndustry=INDUSTRIES.find(item=>item.value===industry)?.label??"All organizations";

  function moveToDirectory(){
    window.requestAnimationFrame(()=>directoryStartRef.current?.scrollIntoView({behavior:"smooth",block:"start"}));
  }

  function chooseIndustry(value:string){
    setIndustry(value);
    setState("");
    moveToDirectory();
  }

  function chooseLocation(nextCountry:string,nextState="",nextQuery=""){
    setCountry(nextCountry);
    setState(nextState);
    setQuery(nextQuery);
    moveToDirectory();
  }

  return <div className="page-stack">
    <section className="page-hero"><div className="min-w-0 flex-1"><p className="eyebrow">Organization directory</p><h1>Explore real organizations — or create yours.</h1><p>Organizations on POSSARA can own a profile, publish verified roles and manage applicants. Browse by type and location, or register the organization you manage.</p><div className="mt-4 flex flex-wrap gap-2"><Link to="/organizations/register" className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white">Register an organization</Link><Link to="/organizations/manage" className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold">Manage hiring</Link></div></div></section>

    <section>
      <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Choose a category</h2><p className="text-sm text-ink-faint">Tap a category and POSSARA will take you straight to its directory view.</p></div><button type="button" onClick={()=>{setIndustry("");setCountry("");setState("");setQuery("");moveToDirectory();}} className="text-xs font-medium text-brand-dark">Reset directory</button></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {INDUSTRIES.map(item=>{const Icon=item.icon;const active=industry===item.value;return <button key={item.label} type="button" onClick={()=>chooseIndustry(item.value)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${active?"border-brand bg-brand-light/60":"border-paper-dim bg-white"}`}>
          <div className="flex items-start gap-3"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${active?"bg-brand text-white":"bg-paper-dim text-ink-light"}`}><Icon size={20}/></div><div><h3 className="font-semibold">{item.label}</h3><p className="mt-1 text-sm leading-5 text-ink-light">{item.description}</p></div></div>
        </button>})}
      </div>
    </section>

    <section ref={directoryStartRef} className="scroll-mt-24 rounded-3xl border border-paper-dim bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4"><p className="eyebrow">Directory view</p><h2 className="text-lg font-semibold">{selectedIndustry}</h2><p className="text-sm text-ink-faint">Choose where to look, or search directly.</p></div>
      <label className="relative block w-full"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search organization, hotel, school, city, state or country…" className="w-full rounded-full border border-ink-faint/30 py-3 pl-10 pr-4 text-sm outline-none focus:border-brand"/></label>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 rounded-full border border-ink-faint/30 bg-paper/40 px-3 py-2 text-sm"><MapPin size={15} className="text-ink-faint"/><select value={country} onChange={e=>{setCountry(e.target.value);setState("");}} className="w-full bg-transparent outline-none"><option value="">All countries</option>{countries.map(item=><option key={item} value={item}>{item}</option>)}</select></label>
        <label className="flex items-center gap-2 rounded-full border border-ink-faint/30 bg-paper/40 px-3 py-2 text-sm"><MapPin size={15} className="text-ink-faint"/><select value={state} onChange={e=>setState(e.target.value)} className="w-full bg-transparent outline-none"><option value="">All states / regions</option>{availableStates.map(item=><option key={item} value={item}>{item}</option>)}</select></label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={()=>chooseLocation("Nigeria")} className="rounded-full border border-ink-faint/25 px-3 py-2 text-sm font-medium text-ink-light hover:bg-paper-dim">Nigeria</button>
        <button type="button" onClick={()=>chooseLocation("Nigeria","Kwara")} className="rounded-full border border-ink-faint/25 px-3 py-2 text-sm font-medium text-ink-light hover:bg-paper-dim">Kwara</button>
        <button type="button" onClick={()=>chooseLocation("Nigeria","Kwara","Ilorin")} className="rounded-full border border-ink-faint/25 px-3 py-2 text-sm font-medium text-ink-light hover:bg-paper-dim">Ilorin</button>
      </div>
    </section>

    <section><div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Directory results</h2><p className="text-sm text-ink-faint">{[selectedIndustry,country||null,state||null].filter(Boolean).join(" · ")}</p></div><span className="text-xs text-ink-faint">{filtered.length} listed</span></div>
      {isLoading&&<div className="feed-skeleton"/>}
      {error&&<p className="text-flag">Couldn't load organizations right now.</p>}
      {!isLoading&&!error&&filtered.length===0&&<div className="rounded-2xl border border-paper-dim bg-white p-6 text-center"><h3 className="font-semibold">No organizations found yet</h3><p className="mt-1 text-sm text-ink-light">Try another category or location. The directory is designed to keep expanding across Nigeria and internationally as organizations are added and reviewed.</p></div>}
      <div className="grid gap-3 md:grid-cols-2">{filtered.map(org=>{const activeCount=counts?.[org.id]??0;return <article key={org.id} className="group rounded-2xl border border-paper-dim bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><Link to={`/organizations/${org.slug}`} className="block"><div className="flex items-start gap-3">{org.logo_url?<img src={org.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover"/>:<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-paper-dim text-ink-light"><Building2 size={20}/></div>}<div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate font-semibold group-hover:underline">{org.name}</h3>{org.verified&&<OrganizationVerificationBadge compact/>}</div>{org.industry&&<p className="mt-0.5 text-xs font-medium text-brand-dark">{org.industry}</p>}<p className="mt-1 text-xs text-ink-faint">{[org.headquarters||org.state,org.state!==org.headquarters?org.state:null,org.country].filter(Boolean).join(" · ")||"Location not listed"}</p></div></div>{org.description&&<p className="mt-3 line-clamp-2 text-sm leading-5 text-ink-light">{org.description}</p>}</Link><div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-paper-dim pt-3"><span className="text-xs font-medium text-ink-light">{activeCount} active {activeCount===1?"opportunity":"opportunities"}</span><div className="flex items-center gap-3">{org.website&&<a href={org.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-ink-light hover:text-brand-dark">Website <ExternalLink size={13}/></a>}<Link to={`/organizations/${org.slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-dark">View <ArrowRight size={14}/></Link></div></div></article>})}</div>
    </section>
  </div>;
}
