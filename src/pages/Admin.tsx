import { useState } from "react";
import { Building2, Plus, ShieldCheck, FileText, Images, GraduationCap } from "lucide-react";
import {
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
  useUnverifiedOrganizations,
  useVerifyOrganization,
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

function ContentAdmin(){
  const posts=useAdminRecentPosts();
  const setPostStatus=useAdminSetPostStatus();
  const moments=useAdminActiveMoments();
  const deleteMoment=useAdminDeleteMoment();
  const study=useAdminStudyOverview();
  return <div className="space-y-5">
    <Section title="Study overview">
      <div className="mb-3 flex items-center gap-2 text-sm text-ink-light"><GraduationCap size={17}/>Monitor learning activity without mixing it into social moderation.</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{[["Topics",study.data?.topics],["Questions",study.data?.questions],["Learners",study.data?.learners],["Discussions",study.data?.discussions],["Attempts",study.data?.attempts]].map(([label,value])=><div key={label as string} className="rounded-xl bg-paper p-3"><p className="text-xl font-semibold">{value??"—"}</p><p className="text-xs text-ink-faint">{label as string}</p></div>)}</div><ErrorText error={study.error}/>
    </Section>

    <Section title="Recent posts">
      <div className="mb-3 flex items-center gap-2 text-sm text-ink-light"><FileText size={17}/>Review recent posts and remove or restore content when necessary.</div>
      <div className="space-y-2">{posts.data?.map(post=>{const profile=Array.isArray(post.profiles)?post.profiles[0]:post.profiles;return <div key={post.id} className="rounded-xl border border-paper-dim p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs text-ink-faint">{profile?.full_name??"Member"}{post.topic?` · ${post.topic}`:""}</p><p className="mt-1 line-clamp-2 text-sm text-ink">{post.content}</p></div><span className="shrink-0 rounded-full bg-paper-dim px-2 py-0.5 text-[10px]">{post.status}</span></div><div className="mt-2 flex gap-2">{post.status==="published"?<button onClick={()=>setPostStatus.mutate({id:post.id,status:"removed"})} className="rounded-full border border-flag px-3 py-1 text-xs font-medium text-flag">Remove</button>:<button onClick={()=>setPostStatus.mutate({id:post.id,status:"published"})} className="rounded-full bg-trust px-3 py-1 text-xs font-medium text-white">Restore</button>}</div></div>})}</div><ErrorText error={posts.error||setPostStatus.error}/>
    </Section>

    <Section title="Active Moments">
      <div className="mb-3 flex items-center gap-2 text-sm text-ink-light"><Images size={17}/>Moderate currently active Moments when something inappropriate is reported or noticed.</div>
      <div className="space-y-2">{moments.data?.map(moment=>{const profile=Array.isArray(moment.profiles)?moment.profiles[0]:moment.profiles;return <div key={moment.id} className="flex items-center justify-between gap-3 rounded-xl border border-paper-dim p-3"><div className="min-w-0"><p className="text-sm font-medium">{profile?.full_name??"Member"}</p><p className="truncate text-xs text-ink-faint">{moment.caption||"Moment without caption"}</p></div><button onClick={()=>deleteMoment.mutate({id:moment.id,storagePath:moment.storage_path,musicPath:moment.music_path})} className="rounded-full border border-flag px-3 py-1 text-xs font-medium text-flag">Remove</button></div>})}</div><ErrorText error={moments.error||deleteMoment.error}/>
    </Section>
  </div>;
}

export function Admin() {
  const { email, role, isVerified } = useAuth();
  const pendingOpps = usePendingOpportunities();
  const reviewOpp = useSetOpportunityReviewStatus();
  const orgs = useUnverifiedOrganizations();
  const verifyOrg = useVerifyOrganization();
  const reports = usePendingReports();
  const resolveReport = useResolveReport();
  const ads = usePendingAdvertisements();
  const moderateAd = useModerateAdvertisement();
  const members = useProfilesWithRoles();
  const setRole = useSetUserRole();
  const [reportNotes, setReportNotes] = useState<Record<string, string>>({});

  return <div className="mx-auto max-w-4xl space-y-5 pb-10">
    <div className="flex items-start gap-3"><div className="rounded-xl bg-trust-light p-2 text-trust-dark"><ShieldCheck size={22}/></div><div><h1 className="text-2xl">Admin</h1><p className="text-sm text-ink-light">Moderation, Study oversight, organizations, verification and member-role controls.</p></div></div>
    <div className="rounded-2xl bg-trust-light px-4 py-3 text-sm text-trust-dark">Signed in as <b>{email ?? "admin"}</b> · role <b>{role ?? "loading"}</b> · {isVerified ? "verified" : "not verified"}</div>

    <AdminSignupSummary/>
    <AdminFollowerOverview/>
    <ContentAdmin/>
    <OrganizationDirectoryAdmin/>

    <Section title="Opportunities awaiting review">
      {pendingOpps.isLoading && <p className="text-sm text-ink-light">Loading…</p>}
      {!pendingOpps.isLoading && pendingOpps.data?.length === 0 && <p className="text-sm text-ink-light">Nothing waiting for review.</p>}
      <div className="space-y-3">{pendingOpps.data?.map((opp) => <div key={opp.id} className="rounded-xl border border-paper-dim p-3"><p className="font-medium">{opp.title}</p><p className="mt-1 line-clamp-2 text-sm text-ink-light">{opp.description}</p><div className="mt-3 flex gap-2"><button onClick={()=>reviewOpp.mutate({id:opp.id,status:"active"})} className="rounded-full bg-trust px-3 py-1.5 text-sm font-medium text-white">Approve</button><button onClick={()=>reviewOpp.mutate({id:opp.id,status:"flagged"})} className="rounded-full border border-flag px-3 py-1.5 text-sm font-medium text-flag">Flag</button></div></div>)}</div>
      <ErrorText error={reviewOpp.error}/>
    </Section>

    <Section title="Organizations awaiting verification">
      {orgs.isLoading && <p className="text-sm text-ink-light">Loading…</p>}
      {!orgs.isLoading && orgs.data?.length === 0 && <p className="text-sm text-ink-light">Nothing waiting for verification.</p>}
      <div className="space-y-3">{orgs.data?.map((org) => <div key={org.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-paper-dim p-3"><div><p className="font-medium">{org.name}</p>{org.website&&<p className="text-xs text-ink-faint">{org.website}</p>}</div><button onClick={()=>verifyOrg.mutate(org.id)} className="rounded-full bg-trust px-3 py-1.5 text-sm font-medium text-white">Verify</button></div>)}</div>
      <ErrorText error={verifyOrg.error}/>
    </Section>

    <Section title="Reports">
      {reports.isLoading && <p className="text-sm text-ink-light">Loading…</p>}
      {!reports.isLoading && reports.data?.length === 0 && <p className="text-sm text-ink-light">No open reports.</p>}
      <div className="space-y-3">{reports.data?.map((report) => <div key={report.id} className="rounded-xl border border-paper-dim p-3"><p className="font-medium">{report.reason}</p><input value={reportNotes[report.id]??""} onChange={e=>setReportNotes({...reportNotes,[report.id]:e.target.value})} placeholder="Action taken" className="mt-2 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-sm"/><div className="mt-2 flex gap-2"><button onClick={()=>resolveReport.mutate({id:report.id,status:"resolved",actionTaken:reportNotes[report.id]??""})} className="rounded-full bg-trust px-3 py-1.5 text-sm font-medium text-white">Resolve</button><button onClick={()=>resolveReport.mutate({id:report.id,status:"dismissed",actionTaken:reportNotes[report.id]??""})} className="rounded-full border border-ink-faint/30 px-3 py-1.5 text-sm">Dismiss</button></div></div>)}</div>
      <ErrorText error={resolveReport.error}/>
    </Section>

    <Section title="Advertisements awaiting review">
      {ads.isLoading && <p className="text-sm text-ink-light">Loading…</p>}
      {!ads.isLoading && ads.data?.length === 0 && <p className="text-sm text-ink-light">No advertisements waiting for review.</p>}
      <div className="space-y-3">{ads.data?.map((ad) => <div key={ad.id} className="rounded-xl border border-paper-dim p-3"><p className="font-medium">{ad.title}</p><p className="text-sm text-ink-light">{ad.organization_name}</p><div className="mt-2 flex gap-2"><button onClick={()=>moderateAd.mutate({id:ad.id,status:"active"})} className="rounded-full bg-trust px-3 py-1.5 text-sm font-medium text-white">Approve</button><button onClick={()=>moderateAd.mutate({id:ad.id,status:"rejected"})} className="rounded-full border border-flag px-3 py-1.5 text-sm font-medium text-flag">Reject</button></div></div>)}</div>
      <ErrorText error={moderateAd.error}/>
    </Section>

    <Section title="Members & roles">
      {members.isLoading && <p className="text-sm text-ink-light">Loading…</p>}
      <div className="space-y-2">{members.data?.map((profile) => {
        const rel = Array.isArray(profile.user_roles) ? profile.user_roles[0] : profile.user_roles;
        const currentRole = (rel?.role ?? "user") as UserRole;
        const isAdminAccount = currentRole === "admin";
        return <div key={profile.id} className="flex items-center justify-between gap-3 rounded-xl border border-paper-dim p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{profile.full_name ?? "Member"}</p><p className="truncate text-xs text-ink-faint">{profile.username ? `@${profile.username}` : profile.id.slice(0,8)}</p></div>{isAdminAccount?<span className="rounded-full bg-trust-light px-3 py-1.5 text-xs font-semibold text-trust-dark">admin · locked</span>:<select value={currentRole} onChange={e=>setRole.mutate({userId:profile.id,role:e.target.value as UserRole})} className="rounded-lg border border-ink-faint/30 px-2 py-1.5 text-sm"><option value="user">user</option><option value="creator">creator</option><option value="moderator">moderator</option></select>}</div>;
      })}</div>
      <ErrorText error={setRole.error}/>
    </Section>
  </div>;
}
