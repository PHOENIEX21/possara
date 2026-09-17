import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, Building2, Sparkles, GraduationCap, BriefcaseBusiness, UserCheck, UserPlus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { ProfilePhotoViewer } from "../components/ProfilePhotoViewer";
import { useOwnProfile } from "../hooks/useProfile";
import { useFollowStatus, useToggleFollow } from "../hooks/useFollow";
import { useAuth } from "../store/auth";
import type { Profile, Organization } from "../types/database";

const PROFESSIONS: { label: string; keywords: string[] }[] = [
  { label: "Tutor / Teacher", keywords: ["tutor", "teacher", "teach", "education", "educator", "lesson", "mathematics", "english", "science"] },
  { label: "Mentor / Coach", keywords: ["mentor", "coach", "guidance"] },
  { label: "Graphic Designer", keywords: ["graphic", "design"] },
  { label: "Web Developer", keywords: ["web dev", "website", "frontend", "backend", "full stack", "fullstack"] },
  { label: "Video Editor", keywords: ["video edit", "videography", "film"] },
  { label: "Writer", keywords: ["writ", "content", "copywrit"] },
  { label: "Marketer", keywords: ["market", "social media", "seo"] },
  { label: "Photographer", keywords: ["photograph"] },
  { label: "Data / Tech", keywords: ["data", "software", "programming", "python", "developer", "engineer"] },
  { label: "Entrepreneur", keywords: ["entrepreneur", "business", "founder", "startup"] },
];

function useMemberDirectory() {
  return useQuery({
    queryKey:["member-directory"],
    queryFn:async():Promise<Pick<Profile,"id"|"username"|"full_name"|"avatar_url"|"headline"|"profession"|"skills"|"location"|"country">[]>=>{
      const {data,error}=await supabase.from("profiles").select("id, username, full_name, avatar_url, headline, profession, skills, location, country").not("username","is",null).order("created_at",{ascending:false}).limit(100);
      if(error)throw error;
      return data??[];
    }
  });
}

function useOrganizations(){
  return useQuery({
    queryKey:["organization-directory"],
    queryFn:async():Promise<Pick<Organization,"id"|"name"|"slug"|"logo_url"|"description"|"verified">[]>=>{
      const {data,error}=await supabase.from("organizations").select("id,name,slug,logo_url,description,verified").order("name").limit(100);
      if(error)throw error;
      return data??[];
    }
  });
}

function tokens(values:Array<string|null|undefined>){
  return values.flatMap(v=>(v??"").toLowerCase().split(/[^a-z0-9+#.]+/)).filter(v=>v.length>2);
}

function FollowAction({ targetUserId }: { targetUserId: string }) {
  const { userId } = useAuth();
  const { data: isFollowing, isLoading } = useFollowStatus(targetUserId);
  const toggle = useToggleFollow(targetUserId);

  if (!userId) {
    return <Link to="/signin" className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand/25 bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand-dark"><UserPlus size={14}/>Follow</Link>;
  }
  if (userId === targetUserId) return null;

  return <div className="flex shrink-0 flex-col items-end gap-1">
    <button
      type="button"
      disabled={isLoading || toggle.isPending}
      onClick={()=>toggle.mutate(!!isFollowing)}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${isFollowing?"border border-ink-faint/30 bg-white text-ink-light":"bg-ink text-white"}`}
    >
      {isFollowing?<UserCheck size={14}/>:<UserPlus size={14}/>} {toggle.isPending?"Working…":isFollowing?"Following":"Follow"}
    </button>
    {toggle.error&&<span className="max-w-40 text-right text-[10px] text-flag">{(toggle.error as Error).message}</span>}
  </div>;
}

export function Connect(){
  const {data:members,isLoading}=useMemberDirectory();
  const {data:organizations}=useOrganizations();
  const {data:ownProfile}=useOwnProfile();
  const [query,setQuery]=useState("");
  const [profession,setProfession]=useState<string|null>(null);
  const [tab,setTab]=useState<"people"|"organizations">("people");
  const [photo,setPhoto]=useState<{src:string;name:string}|null>(null);

  const activeKeywords=profession?PROFESSIONS.find(p=>p.label===profession)?.keywords??[]:[];
  const ownTokens=useMemo(()=>new Set(tokens([ownProfile?.profession,ownProfile?.headline,...(ownProfile?.skills??[])])),[ownProfile]);
  const filtered=members?.filter(m=>{
    if(m.id===ownProfile?.id)return false;
    if(profession){
      const hay=[m.profession??"",...(m.skills??[])].join(" ").toLowerCase();
      if(!activeKeywords.some(kw=>hay.includes(kw)))return false;
    }
    if(!query.trim())return true;
    const q=query.trim().toLowerCase().replace(/^@/,"");
    return m.full_name?.toLowerCase().includes(q)
      ||m.username?.toLowerCase().includes(q)
      ||m.profession?.toLowerCase().includes(q)
      ||m.headline?.toLowerCase().includes(q)
      ||m.skills?.some(s=>s.toLowerCase().includes(q))
      ||m.location?.toLowerCase().includes(q)
      ||m.country?.toLowerCase().includes(q);
  }).map(member=>{
    const matchCount=tokens([member.profession,member.headline,...(member.skills??[])]).filter(t=>ownTokens.has(t)).length;
    return{member,matchCount};
  }).sort((a,b)=>b.matchCount-a.matchCount);
  const filteredOrgs=organizations?.filter(o=>!query.trim()||o.name.toLowerCase().includes(query.toLowerCase())||o.description?.toLowerCase().includes(query.toLowerCase()));

  return <div className="page-stack">
    <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl">Connect</h1><p className="mt-1 text-ink-light">Find people to follow, tutors, mentors, skilled people and organizations worth knowing.</p></div>
      <Link to="/opportunities" className="inline-flex w-fit items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"><BriefcaseBusiness size={16}/>Match Opportunities</Link>
    </section>

    <div className="rounded-2xl border border-brand/15 bg-brand-light/40 p-4">
      <div className="flex items-start gap-3"><div className="rounded-xl bg-white p-2 text-brand-dark"><Sparkles size={18}/></div><div><p className="font-medium">People to follow</p><p className="mt-1 text-sm text-ink-light">Search by name or @username, or browse recommendations based on profession, skills and interests from your profile.</p><div className="mt-3 flex flex-wrap gap-3"><Link to="/profile/me" className="text-sm font-medium text-brand-dark hover:underline">Improve my recommendations →</Link><Link to="/opportunities" className="text-sm font-medium text-brand-dark hover:underline">Find opportunities for me →</Link></div></div></div>
    </div>

    <div className="flex gap-2">
      <button onClick={()=>setTab("people")} className={`rounded-full px-4 py-2 text-sm font-medium ${tab==="people"?"bg-ink text-white":"bg-white text-ink-light"}`}><Users size={15} className="mr-1 inline"/>People</button>
      <button onClick={()=>setTab("organizations")} className={`rounded-full px-4 py-2 text-sm font-medium ${tab==="organizations"?"bg-ink text-white":"bg-white text-ink-light"}`}><Building2 size={15} className="mr-1 inline"/>Organizations</button>
    </div>

    <label className="relative block max-w-md"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={tab==="people"?"Search name, @username, skill or location…":"Search organizations…"} className="w-full rounded-full border border-ink-faint/30 py-2 pl-9 pr-4 text-sm outline-none focus:border-brand"/></label>

    {tab==="people"&&<>
      <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"><button onClick={()=>setProfession(null)} className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm ${!profession?"border-ink bg-ink text-white":"border-ink-faint/30 text-ink-light"}`}>People to follow</button>{PROFESSIONS.map(p=><button key={p.label} onClick={()=>setProfession(p.label)} className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm ${profession===p.label?"border-brand bg-brand text-white":"border-ink-faint/30 text-ink-light"}`}>{p.label}</button>)}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        {isLoading&&<div className="feed-skeleton"/>}
        {!isLoading&&filtered?.length===0&&<div className="rounded-2xl border border-dashed border-paper-dim bg-white p-5 text-sm text-ink-light">No people match that search yet.</div>}
        {filtered?.map(({member,matchCount})=>{
          const name=member.full_name??"Member";
          const path=member.username?`/profile/${member.username}`:`/profile/id/${member.id}`;
          const isTutor=/tutor|teacher|educator|teaching/.test([member.profession??"",...(member.skills??[])].join(" ").toLowerCase());
          return <div key={member.id} className="rounded-2xl border border-paper-dim bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              {member.avatar_url?<button type="button" onClick={()=>setPhoto({src:member.avatar_url!,name})} className="h-11 w-11 shrink-0 rounded-full"><img src={member.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover"/></button>:<Link to={path} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-trust-light text-trust-dark">{name.charAt(0).toUpperCase()}</Link>}
              <Link to={path} className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate font-medium hover:underline">{name}</p>{isTutor&&<span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-medium text-brand-dark"><GraduationCap size={11}/>Tutor</span>}</div>{member.username&&<p className="truncate text-xs text-ink-faint">@{member.username}</p>}{(member.headline||member.profession)&&<p className="truncate text-xs text-ink-light">{member.headline||member.profession}</p>}{member.skills?.length>0&&<p className="mt-1 line-clamp-1 text-xs text-ink-faint">{member.skills.slice(0,3).join(" · ")}</p>}{member.location&&<p className="text-xs text-ink-faint">{member.location}{member.country?`, ${member.country}`:""}</p>}{matchCount>0&&<p className="mt-1 text-[11px] font-medium text-trust-dark">Relevant to your profile</p>}</Link>
              <FollowAction targetUserId={member.id}/>
            </div>
          </div>;
        })}
      </div>
    </>}

    {tab==="organizations"&&<div className="grid gap-3 sm:grid-cols-2">{filteredOrgs?.map(org=><Link key={org.id} to={`/organizations/${org.slug}`} className="flex items-start gap-3 rounded-2xl border border-paper-dim bg-white p-4 shadow-sm">{org.logo_url?<img src={org.logo_url} alt="" className="h-11 w-11 rounded-xl object-cover"/>:<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-paper-dim"><Building2 size={18}/></div>}<div><p className="font-medium">{org.name}{org.verified&&<span className="ml-2 text-xs text-trust-dark">Verified</span>}</p>{org.description&&<p className="mt-1 line-clamp-2 text-xs text-ink-light">{org.description}</p>}</div></Link>)}</div>}
    {photo&&<ProfilePhotoViewer src={photo.src} name={photo.name} onClose={()=>setPhoto(null)}/>} 
  </div>;
}
