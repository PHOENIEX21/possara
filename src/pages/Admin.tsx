import { OrganizationVerificationAdmin } from "../components/OrganizationVerificationAdmin";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Building2, Plus, ShieldCheck, FileText, Images, GraduationCap, ArrowLeft, ArrowUpRight, Users, UserRoundCog, Flag, Megaphone, Briefcase, Trash2, Radar } from "lucide-react";
import {
  useUnverifiedOrganizations,
  useAccountDeletionRequests,
  useAdminOrganizations,
  useCreateOrganization,
  useModerateAdvertisement,
  usePendingAdvertisements,
  usePendingOpportunities,
  usePendingReports,
  useProfilesWithRoles,
  useResolveReport,
  useSetOpportunityReviewStatus,
  useSetUserRole,
  useUpdateAccountDeletionRequest,
} from "../hooks/useAdminData";
import {
  useAdminActiveMoments,
  useAdminDeleteMoment,
  useAdminRecentPosts,
  useAdminSetPostStatus,
  useAdminStudyOverview,
} from "../hooks/useAdminContent";
import { AdminFollowerOverview } from "../components/AdminFollowerOverview";
import { AdminSignupSummary } from "../components/AdminSignupSummary";
import { useAuth } from "../store/auth";
import type { UserRole } from "../types/database";

const ADMIN_TOOLS = [
  {id:"verification",label:"Organization verification",description:"Review organizations and approve their verified tick.",icon:ShieldCheck,group:"Review & approve"},
  {id:"opportunities",label:"Opportunity approvals",description:"Approve or flag submitted jobs and opportunities.",icon:Briefcase,group:"Review & approve"},
  {id:"reports",label:"Reported content",description:"Investigate reports and record the action taken.",icon:Flag,group:"Review & approve"},
  {id:"advertisements",label:"Advertisement approvals",description:"Review ads before they appear on POSSARA.",icon:Megaphone,group:"Review & approve"},
  {id:"organizations",label:"Organization directory",description:"Add employers and institutions to the directory.",icon:Building2,group:"Manage the community"},
  {id:"members",label:"Members & roles",description:"Review member accounts and assign permitted roles.",icon:UserRoundCog,group:"Manage the community"},
  {id:"connections",label:"Followers & connections",description:"Look up members and review their connections.",icon:Users,group:"Manage the community"},
  {id:"deletions",label:"Account deletion requests",description:"Review requests, record notes and track processing.",icon:Trash2,group:"Manage the community"},
  {id:"posts",label:"Post moderation",description:"Review recent posts and remove or restore content.",icon:FileText,group:"Content & learning"},
  {id:"moments",label:"Moment moderation",description:"Review active Moments and remove inappropriate ones.",icon:Images,group:"Content & learning"},
  {id:"study",label:"Study overview",description:"See learning activity, questions and participation.",icon:GraduationCap,group:"Content & learning"},
  {id:"discovery",label:"Opportunity discovery",description:"Manage sources and review discovered opportunities.",icon:Radar,group:"Content & learning",href:"/admin/opportunity-discovery"},
];

const INDUSTRIES = [
  "Hotels & Hospitality",
  "Education & Schools",
  "Education & Scholarships",
  "Technology",
  "Health",
  "Finance",
  "NGO & Foundation",
  "Construction & Engineering",
  "Media & Creative",
  "Retail & Commerce",
  "Professional Services",
  "Government & Public Sector",
  "Agriculture",
  "Transport & Logistics",
];

const NIGERIA_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara","Federal Capital Territory"
];

function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  return <p className="mt-2 text-sm text-flag">{error instanceof Error ? error.message : "Something went wrong."}</p>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-paper-dim bg-white p-4 shadow-sm"><h2 className="text-lg font-semibold">{title}</h2><div className="mt-3">{children}</div></section>;
}

function OrganizationDirectoryAdmin(){
  const organizations=useAdminOrganizations();
  const createOrganization=useCreateOrganization();
  const [open,setOpen]=useState(false);
  const [name,setName]=useState("");
  const [industry,setIndustry]=useState("");
  const [country,setCountry]=useState("Nigeria");
  const [state,setState]=useState("");
  const [headquarters,setHeadquarters]=useState("");
  const [website,setWebsite]=useState("");
  const [description,setDescription]=useState("");
  const [success,setSuccess]=useState<string|null>(null);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(!name.trim()||!industry)return;
    setSuccess(null);
    const created=await createOrganization.mutateAsync({name,industry,country,state:country==="Nigeria"?state:"",headquarters,website,description});
    setSuccess(`${name.trim()} added to the organization directory.`);
    setName("");setIndustry("");setCountry("Nigeria");setState("");setHeadquarters("");setWebsite("");setDescription("");setOpen(false);
    return created;
  }

  return <Section title="Organization directory">
    <div className="flex flex-col gap-3 rounded-2xl bg-paper/60 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Building2 size={18} className="text-brand-dark"/><p className="font-medium">Industries, employers & institutions</p></div><p className="mt-1 text-sm text-ink-light">Add real organizations with clear industry and location data so people can browse them and see their jobs or opportunities.</p></div><button type="button" onClick={()=>setOpen(v=>!v)} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white"><Plus size={15}/>{open?"Close form":"Add organization"}</button></div>

    {open&&<form onSubmit={submit} className="mt-4 rounded-2xl border border-paper-dim p-4"><div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm text-ink-light">Organization name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. E-Phoenix Hotels & Tourism" className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>
      <label className="text-sm text-ink-light">Industry<select required value={industry} onChange={e=>setIndustry(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 bg-white px-3 py-2 text-ink outline-none focus:border-brand"><option value="">Select industry…</option>{INDUSTRIES.map(item=><option key={item} value={item}>{item}</option>)}</select></label>
      <label className="text-sm text-ink-light">Country<input value={country} onChange={e=>{setCountry(e.target.value);if(e.target.value!=="Nigeria")setState("");}} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>
      {country.trim().toLowerCase()==="nigeria"?<label className="text-sm text-ink-light">State<select value={state} onChange={e=>setState(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 bg-white px-3 py-2 text-ink outline-none focus:border-brand"><option value="">Not specified</option>{NIGERIA_STATES.map(item=><option key={item} value={item}>{item}</option>)}</select></label>:<label className="text-sm text-ink-light">State / region<input value={state} onChange={e=>setState(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>}
      <label className="text-sm text-ink-light">Headquarters / city<input value={headquarters} onChange={e=>setHeadquarters(e.target.value)} placeholder="e.g. Ilorin" className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>
      <label className="text-sm text-ink-light">Official website<input type="url" value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>
    </div><label className="mt-3 block text-sm text-ink-light">Short description<textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="What does this organization do?" className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label><p className="mt-2 text-xs text-ink-faint">New organizations start unverified. Verify them only after checking the official source.</p><button type="submit" disabled={!name.trim()||!industry||createOrganization.isPending} className="mt-4 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{createOrganization.isPending?"Adding…":"Add to directory"}</button><ErrorText error={createOrganization.error}/></form>}

    {success&&<p className="mt-3 rounded-xl bg-trust-light px-3 py-2 text-sm text-trust-dark">{success}</p>}
    <div className="mt-4"><div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium">Current organizations</p><span className="text-xs text-ink-faint">{organizations.data?.length??0} total</span></div>{organizations.isLoading&&<p className="text-sm text-ink-light">Loading…</p>}<div className="grid gap-2 sm:grid-cols-2">{organizations.data?.map(org=><div key={org.id} className="rounded-xl border border-paper-dim p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-medium">{org.name}</p><p className="mt-0.5 text-xs text-brand-dark">{org.industry||"Industry not set"}</p><p className="mt-1 text-xs text-ink-faint">{[org.headquarters||org.state,org.country].filter(Boolean).join(" · ")||"Location not set"}</p></div><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${org.verified?"bg-trust-light text-trust-dark":"bg-paper-dim text-ink-faint"}`}>{org.verified?"Verified":"Unverified"}</span></div></div>)}</div><ErrorText error={organizations.error}/></div>
  </Section>;
}

function ContentAdmin({view}:{view:string}){
  const posts=useAdminRecentPosts();
  const setPostStatus=useAdminSetPostStatus();
  const moments=useAdminActiveMoments();
  const deleteMoment=useAdminDeleteMoment();
  const study=useAdminStudyOverview();
  return <div className="space-y-5">
    {view==="study"&&<Section title="Study overview">
      <div className="mb-3 flex items-center gap-2 text-sm text-ink-light"><GraduationCap size={17}/>Monitor learning activity without mixing it into social moderation.</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{[["Topics",study.data?.topics],["Questions",study.data?.questions],["Learners",study.data?.learners],["Discussions",study.data?.discussions],["Attempts",study.data?.attempts]].map(([label,value])=><div key={label as string} className="rounded-xl bg-paper p-3"><p className="text-xl font-semibold">{value??"—"}</p><p className="text-xs text-ink-faint">{label as string}</p></div>)}</div><ErrorText error={study.error}/>
    </Section>}

    {view==="posts"&&<Section title="Recent posts">
      <div className="mb-3 flex items-center gap-2 text-sm text-ink-light"><FileText size={17}/>Review recent posts and remove or restore content when necessary.</div>
      <div className="space-y-2">{posts.data?.map(post=>{const profile=Array.isArray(post.profiles)?post.profiles[0]:post.profiles;return <div key={post.id} className="rounded-xl border border-paper-dim p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs text-ink-faint"><Link to={`/profile/id/${post.author_id}`} className="hover:underline">{profile?.full_name??"Member"}</Link>{post.topic?` · ${post.topic}`:""}</p><p className="mt-1 line-clamp-2 text-sm text-ink">{post.content}</p></div><span className="shrink-0 rounded-full bg-paper-dim px-2 py-0.5 text-[10px]">{post.status}</span></div><div className="mt-2 flex gap-2">{post.status==="published"?<button onClick={()=>setPostStatus.mutate({id:post.id,status:"removed"})} className="rounded-full border border-flag px-3 py-1 text-xs font-medium text-flag">Remove</button>:<button onClick={()=>setPostStatus.mutate({id:post.id,status:"published"})} className="rounded-full bg-trust px-3 py-1 text-xs font-medium text-white">Restore</button>}</div></div>})}</div><ErrorText error={posts.error||setPostStatus.error}/>
    </Section>}

    {view==="moments"&&<Section title="Active Moments">
      <div className="mb-3 flex items-center gap-2 text-sm text-ink-light"><Images size={17}/>Moderate currently active Moments when something inappropriate is reported or noticed.</div>
      <div className="space-y-2">{moments.data?.map(moment=>{const profile=Array.isArray(moment.profiles)?moment.profiles[0]:moment.profiles;return <div key={moment.id} className="flex items-center justify-between gap-3 rounded-xl border border-paper-dim p-3"><div className="min-w-0"><Link to={`/profile/id/${moment.author_id}`} className="text-sm font-medium hover:underline">{profile?.full_name??"Member"}</Link><p className="truncate text-xs text-ink-faint">{moment.caption||"Moment without caption"}</p></div><button onClick={()=>deleteMoment.mutate({id:moment.id,storagePath:moment.storage_path,musicPath:moment.music_path})} className="rounded-full border border-flag px-3 py-1 text-xs font-medium text-flag">Remove</button></div>})}</div><ErrorText error={moments.error||deleteMoment.error}/>
    </Section>}
  </div>;
}

export function Admin() {
  const { email, role, isVerified } = useAuth();
  const [searchParams,setSearchParams]=useSearchParams();
  const selected=ADMIN_TOOLS.find(tool=>tool.id===searchParams.get("section")&&!tool.href);
  const section=selected?.id??"overview";
  const verification=useUnverifiedOrganizations();
  const headingRef=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{document.querySelector(".app-main")?.scrollTo({top:0});window.scrollTo({top:0});headingRef.current?.focus({preventScroll:true});},[section]);
  const pendingOpps = usePendingOpportunities();
  const reviewOpp = useSetOpportunityReviewStatus();
  const reports = usePendingReports();
  const resolveReport = useResolveReport();
  const ads = usePendingAdvertisements();
  const moderateAd = useModerateAdvertisement();
  const members = useProfilesWithRoles();
  const setRole = useSetUserRole();
  const deletionRequests = useAccountDeletionRequests();
  const updateDeletionRequest = useUpdateAccountDeletionRequest();
  const [reportNotes, setReportNotes] = useState<Record<string, string>>({});
  const [deletionNotes, setDeletionNotes] = useState<Record<string, string>>({});

  const counts:Record<string,number|undefined>={verification:verification.data?.length,opportunities:pendingOpps.data?.length,reports:reports.data?.length,advertisements:ads.data?.length,deletions:deletionRequests.data?.length};
  const reviewQueries=[verification,pendingOpps,reports,ads,deletionRequests];
  const queueFailed=reviewQueries.some(query=>query.isError);
  const queueLoading=reviewQueries.some(query=>query.isLoading);
  const pendingTotal=Object.values(counts).reduce<number>((sum,count)=>sum+(count??0),0);
  return <div className="admin-workspace mx-auto max-w-5xl space-y-5 pb-10">
    <header className="rounded-3xl border border-brand/10 bg-gradient-to-br from-white to-brand-light/50 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">POSSARA workspace</p><h1 ref={headingRef} tabIndex={-1} className="mt-1 text-2xl font-bold sm:text-3xl">Admin dashboard</h1><p className="mt-2 max-w-xl text-sm leading-6 text-ink-light">Clear tools for a trusted, well-run community.</p></div><span className="hidden items-center gap-1.5 rounded-full bg-white sm:inline-flex px-3 py-2 text-xs font-semibold text-trust-dark"><ShieldCheck size={15}/>{isVerified?"Verified admin":"Admin account"}</span></div>
      <p className="mt-4 break-all text-xs text-ink-faint">{email??"Admin account"} &middot; {role??"loading"}</p>
    </header>
    {section==="overview"?<>
      <div className="grid grid-cols-2 gap-3"><AdminSignupSummary compact/><section className="flex flex-col justify-between rounded-2xl border border-brand/15 bg-white p-5"><div><p className="text-sm font-semibold text-ink-light">Awaiting your review</p><p className="mt-2 text-3xl font-bold">{queueLoading||queueFailed?"...":pendingTotal}</p><p className="mt-1 text-xs leading-5 text-ink-faint">Items across your review queues.</p></div>{queueFailed?<button onClick={()=>reviewQueries.forEach(query=>void query.refetch())} className="mt-3 text-left text-sm font-semibold text-flag">Some counts could not load. Retry</button>:null}</section></div>
      {["Review & approve","Manage the community","Content & learning"].map(group=><section key={group} aria-label={group}><h2 className="mb-3 text-sm font-bold text-ink-light">{group}</h2><div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4">{ADMIN_TOOLS.filter(tool=>tool.group===group).map(tool=>{const Icon=tool.icon;const count=counts[tool.id];return <Link key={tool.id} to={tool.href??("/admin?section="+tool.id)} className="admin-tool-card group flex min-h-44 flex-col rounded-2xl border border-paper-dim bg-white p-4 shadow-sm transition hover:border-brand/40 hover:shadow-md"><div className="flex items-center justify-between gap-2"><span className="rounded-xl bg-brand-light p-2.5 text-brand-dark"><Icon size={21}/></span>{count!==undefined&&count>0?<span className="rounded-full bg-opportunity-light px-2 py-1 text-[11px] font-bold text-ink">{count} pending</span>:<ArrowUpRight size={17} className="text-ink-faint"/>}</div><h3 className="mt-3 text-sm font-bold leading-5">{tool.label}</h3><p className="mt-1 flex-1 text-xs leading-5 text-ink-light">{tool.description}</p><span className="mt-3 text-xs font-semibold text-brand-dark">Open tool &rarr;</span></Link>})}</div></section>)}
    </>:<section className="rounded-2xl border border-paper-dim bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><Link to="/admin" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-paper px-3 text-sm font-semibold"><ArrowLeft size={16}/>All admin tools</Link><label className="min-w-0"><span className="sr-only">Switch admin tool</span><select aria-label="Switch admin tool" value={section} onChange={event=>setSearchParams({section:event.target.value})} className="max-w-full rounded-xl border border-paper-dim bg-white px-3 py-2.5 text-sm">{ADMIN_TOOLS.filter(tool=>!tool.href).map(tool=><option key={tool.id} value={tool.id}>{tool.label}</option>)}</select></label></div><h2 className="mt-4 text-xl font-bold">{selected?.label}</h2><p className="mt-1 text-sm leading-6 text-ink-light">{selected?.description}</p></section>}
    {section==="verification"&&<OrganizationVerificationAdmin/>}
    {section==="connections"&&<AdminFollowerOverview/>}
    {["posts","moments","study"].includes(section)&&<ContentAdmin view={section}/>}
    {section==="organizations"&&<OrganizationDirectoryAdmin/>}

    {section==="opportunities"&&<Section title="Opportunities awaiting review">
      {pendingOpps.isLoading && <p className="text-sm text-ink-light">Loading…</p>}
      {!pendingOpps.isLoading && pendingOpps.data?.length === 0 && <p className="text-sm text-ink-light">Nothing waiting for review.</p>}
      <div className="space-y-3">{pendingOpps.data?.map((opp) => <div key={opp.id} className="rounded-xl border border-paper-dim p-3"><p className="font-medium">{opp.title}</p><p className="mt-1 line-clamp-2 text-sm text-ink-light">{opp.description}</p><div className="mt-3 flex gap-2"><button disabled={reviewOpp.isPending} onClick={()=>reviewOpp.mutate({id:opp.id,status:"active"})} className="rounded-full bg-trust px-3 py-1.5 text-sm font-medium text-white">Approve</button><button disabled={reviewOpp.isPending} onClick={()=>reviewOpp.mutate({id:opp.id,status:"flagged"})} className="rounded-full border border-flag px-3 py-1.5 text-sm font-medium text-flag">Flag</button></div></div>)}</div>
      <ErrorText error={pendingOpps.error||reviewOpp.error}/>
    </Section>}



    {section==="reports"&&<Section title="Reports">
      {reports.isLoading && <p className="text-sm text-ink-light">Loading…</p>}
      {!reports.isLoading && reports.data?.length === 0 && <p className="text-sm text-ink-light">No open reports.</p>}
      <div className="space-y-3">{reports.data?.map((report) => <div key={report.id} className="rounded-xl border border-paper-dim p-3"><p className="font-medium">{report.reason}</p><input aria-label="Report action taken" value={reportNotes[report.id]??""} onChange={e=>setReportNotes({...reportNotes,[report.id]:e.target.value})} placeholder="Action taken" className="mt-2 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-sm"/><div className="mt-2 flex gap-2"><button disabled={resolveReport.isPending} onClick={()=>resolveReport.mutate({id:report.id,status:"resolved",actionTaken:reportNotes[report.id]??""})} className="rounded-full bg-trust px-3 py-1.5 text-sm font-medium text-white">Resolve</button><button disabled={resolveReport.isPending} onClick={()=>resolveReport.mutate({id:report.id,status:"dismissed",actionTaken:reportNotes[report.id]??""})} className="rounded-full border border-ink-faint/30 px-3 py-1.5 text-sm">Dismiss</button></div></div>)}</div>
      <ErrorText error={reports.error||resolveReport.error}/>
    </Section>}

    {section==="advertisements"&&<Section title="Advertisements awaiting review">
      {ads.isLoading && <p className="text-sm text-ink-light">Loading…</p>}
      {!ads.isLoading && ads.data?.length === 0 && <p className="text-sm text-ink-light">No advertisements waiting for review.</p>}
      <div className="space-y-3">{ads.data?.map((ad) => <div key={ad.id} className="rounded-xl border border-paper-dim p-3"><p className="font-medium">{ad.title}</p><p className="text-sm text-ink-light">{ad.organization_name}</p><div className="mt-2 flex gap-2"><button disabled={moderateAd.isPending} onClick={()=>moderateAd.mutate({id:ad.id,status:"active"})} className="rounded-full bg-trust px-3 py-1.5 text-sm font-medium text-white">Approve</button><button disabled={moderateAd.isPending} onClick={()=>moderateAd.mutate({id:ad.id,status:"rejected"})} className="rounded-full border border-flag px-3 py-1.5 text-sm font-medium text-flag">Reject</button></div></div>)}</div>
      <ErrorText error={ads.error||moderateAd.error}/>
    </Section>}

    {section==="deletions"&&<Section title="Account deletion requests">
      {deletionRequests.isLoading&&<p className="text-sm text-ink-light">Loading…</p>}
      {!deletionRequests.isLoading&&deletionRequests.data?.length===0&&<p className="text-sm text-ink-light">No deletion requests awaiting action.</p>}
      <div className="space-y-3">{deletionRequests.data?.map((request)=>{
        const name=request.profile?.full_name??request.profile?.username??"Member";
        return <div key={request.id} className="rounded-xl border border-paper-dim p-3">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-medium">{name}</p><p className="text-xs text-ink-faint">Requested {new Date(request.requested_at).toLocaleString()} · {request.status}</p></div><span className="rounded-full bg-paper px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">{request.status}</span></div>
          <textarea aria-label="Account request processing note" value={deletionNotes[request.id]??request.admin_note??""} onChange={e=>setDeletionNotes(current=>({...current,[request.id]:e.target.value}))} rows={2} placeholder="Internal processing note" className="mt-3 w-full rounded-xl border border-ink-faint/25 px-3 py-2 text-sm"/>
          <div className="mt-2 flex flex-wrap gap-2">
            {request.status==="requested"&&<button type="button" onClick={()=>updateDeletionRequest.mutate({id:request.id,status:"processing",adminNote:deletionNotes[request.id]})} className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white">Start processing</button>}
            <button type="button" onClick={()=>updateDeletionRequest.mutate({id:request.id,status:"rejected",adminNote:deletionNotes[request.id]})} className="rounded-full border border-flag/50 px-3 py-1.5 text-xs font-semibold text-flag-dark">Reject with reason</button>
          </div>
        </div>;
      })}</div>
      <p className="mt-3 text-xs leading-5 text-ink-faint">Marking a request as processing does not erase the account automatically. Complete erasure only after linked applications, organization ownership, audit retention and legal obligations have been handled correctly.</p>
      <ErrorText error={deletionRequests.error||updateDeletionRequest.error}/>
    </Section>}

    {section==="members"&&<Section title="Members & roles">
      {members.isLoading && <p className="text-sm text-ink-light">Loading…</p>}
      <div className="space-y-2">{members.data?.map((profile) => {
        const rel = Array.isArray(profile.user_roles) ? profile.user_roles[0] : profile.user_roles;
        const currentRole = (rel?.role ?? "user") as UserRole;
        const isAdminAccount = currentRole === "admin";
        return <div key={profile.id} className="flex items-center justify-between gap-3 rounded-xl border border-paper-dim p-3"><div className="min-w-0"><Link to={`/profile/id/${profile.id}`} className="block truncate text-sm font-medium hover:underline">{profile.full_name ?? "Member"}</Link><p className="truncate text-xs text-ink-faint">{profile.username ? `@${profile.username}` : profile.id.slice(0,8)}</p></div>{isAdminAccount?<span className="rounded-full bg-trust-light px-3 py-1.5 text-xs font-semibold text-trust-dark">admin · locked</span>:<select aria-label={`Role for ${profile.full_name??profile.username??"member"}`} disabled={setRole.isPending} value={currentRole} onChange={e=>setRole.mutate({userId:profile.id,role:e.target.value as UserRole})} className="rounded-lg border border-ink-faint/30 px-2 py-1.5 text-sm"><option value="user">user</option><option value="creator">creator</option><option value="moderator">moderator</option></select>}</div>;
      })}</div>
      <ErrorText error={members.error||setRole.error}/>
    </Section>}
  </div>;
}
