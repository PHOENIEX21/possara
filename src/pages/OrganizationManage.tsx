import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Briefcase, Building2, CheckCircle2, Copy, Eye, FilePenLine, PauseCircle, PlayCircle, Plus, Settings2, ShieldCheck, Users } from "lucide-react";
import { useInterviewQuestions, useMyOrganizations, useOrganizationJobs, useRecruiterCbtQuestions, useUpdateJob } from "../hooks/useHiring";
import { OrganizationVerificationBadge } from "../components/OrganizationVerificationBadge";

const STATE_COPY = {
  draft: {
    label: "Draft",
    detail: "Not live yet. Only your organization team can see and edit this role.",
    tone: "bg-slate-100 text-slate-700",
  },
  open: {
    label: "Live",
    detail: "Published in POSSARA Jobs and open for applications.",
    tone: "bg-trust-light text-trust-dark",
  },
  closed: {
    label: "Closed",
    detail: "Applications are paused. You can reopen the role when needed.",
    tone: "bg-amber-50 text-amber-800",
  },
  filled: {
    label: "Filled",
    detail: "Hiring is marked complete. Reopen it only if you need more applicants.",
    tone: "bg-brand-light text-brand-dark",
  },
} as const;

function ActionLink({to,children,className=""}:{to:string;children:React.ReactNode;className?:string}){
  return <Link to={to} className={"inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-center text-sm font-semibold transition hover:-translate-y-0.5 "+className}>{children}</Link>;
}

function JobCard({job,org}:{job:any;org:any}){
  const update=useUpdateJob(job.id,org.id);
  const {data:cbt}=useRecruiterCbtQuestions(job.id);
  const {data:interview}=useInterviewQuestions(job.id);
  const state=STATE_COPY[job.status as keyof typeof STATE_COPY]??STATE_COPY.draft;
  const busy=update.isPending;

  function setStatus(status:"draft"|"open"|"closed"|"filled"){ update.mutate({status}); }

  return <article className="overflow-hidden rounded-2xl border border-paper-dim bg-paper/55">
    <div className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-ink shadow-sm"><Briefcase size={19}/></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link to={"/jobs/"+job.id} className="block text-lg font-bold leading-tight text-ink hover:underline">{job.title}</Link>
              <p className="mt-1 text-sm text-ink-light">{[job.rank,job.employment_type,job.work_style,job.location].filter(Boolean).join(" · ")}</p>
            </div>
            <span className={"shrink-0 rounded-full px-3 py-1 text-xs font-bold "+state.tone}>{state.label}</span>
          </div>
          <p className="mt-3 rounded-xl bg-white px-3 py-2.5 text-xs leading-5 text-ink-light">{state.detail}</p>
        </div>
      </div>

      {update.error&&<p className="mt-3 rounded-xl bg-flag-light px-3 py-2.5 text-sm font-medium text-flag-dark">{(update.error as Error).message}</p>}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link to={"/organizations/"+org.id+"/jobs/new"} state={{edit:job}} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold"><FilePenLine size={15}/>Edit role</Link>
        <Link to={"/organizations/"+org.id+"/jobs/new"} state={{duplicate:job}} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold"><Copy size={15}/>Duplicate</Link>

        {job.status==="draft"&&<button disabled={busy} onClick={()=>setStatus("open")} className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-trust px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><PlayCircle size={17}/>{busy?"Publishing…":"Publish role"}</button>}
        {job.status==="open"&&<>
          <button disabled={busy} onClick={()=>setStatus("closed")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold disabled:opacity-50"><PauseCircle size={15}/>Close</button>
          <button disabled={busy} onClick={()=>setStatus("filled")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-light px-3 py-2.5 text-sm font-semibold text-brand-dark disabled:opacity-50"><CheckCircle2 size={15}/>Mark filled</button>
        </>}
        {job.status==="closed"&&<>
          <button disabled={busy} onClick={()=>setStatus("open")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-trust-light px-3 py-2.5 text-sm font-semibold text-trust-dark disabled:opacity-50"><PlayCircle size={15}/>Reopen</button>
          <button disabled={busy} onClick={()=>setStatus("filled")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-light px-3 py-2.5 text-sm font-semibold text-brand-dark disabled:opacity-50"><CheckCircle2 size={15}/>Mark filled</button>
        </>}
        {job.status==="filled"&&<button disabled={busy} onClick={()=>setStatus("open")} className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-ink-faint/25 bg-white px-3 py-2.5 text-sm font-semibold disabled:opacity-50"><PlayCircle size={15}/>Reopen hiring</button>}
      </div>
    </div>

    <div className="border-t border-paper-dim bg-white p-4">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[.12em] text-ink-faint">Hiring workflow</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <ActionLink to={"/organizations/jobs/"+job.id+"/applicants"} className="bg-brand-light text-brand-dark"><Users size={15}/>Applicants</ActionLink>
        {job.requires_cbt
          ? <ActionLink to={"/organizations/jobs/"+job.id+"/cbt"} className="bg-opportunity-light text-opportunity-dark"><Settings2 size={15}/>{cbt?.length?"Manage CBT":"Set up CBT"}</ActionLink>
          : <div className="flex min-h-11 items-center justify-center rounded-xl bg-paper px-3 py-2 text-center text-xs font-medium text-ink-faint">CBT not required</div>}
        <ActionLink to={"/organizations/jobs/"+job.id+"/interview"} className="bg-paper text-ink"><CheckCircle2 size={15}/>{interview?.length?"Interview plan":"Set interview plan"}</ActionLink>
      </div>
    </div>
  </article>;
}

function OrgWorkspace({org}:{org:any}){
  const {data:jobs}=useOrganizationJobs(org.id);
  const live=(jobs??[]).filter(job=>job.status==="open").length;
  const draft=(jobs??[]).filter(job=>job.status==="draft").length;

  return <section className="overflow-hidden rounded-3xl border border-paper-dim bg-white shadow-card">
    <div className="p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-paper-dim">
          {org.logo_url?<img src={org.logo_url} alt="" className="h-full w-full object-cover"/>:<Building2 size={22}/>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Managing organization</p>
          <div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-2xl font-bold">{org.name}</h2>{(org.verified||org.verification_status==="verified")&&<OrganizationVerificationBadge compact/>}</div>
          <p className="mt-1 text-sm leading-6 text-ink-light">{org.verification_status==="verified"||org.verified?"Verified organization":"Verification is pending. You can publish and hire normally; only the verification badge remains pending."}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link to={"/organizations/"+org.slug} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-trust-light px-3 py-2.5 text-sm font-semibold text-trust-dark"><Eye size={15}/>View page</Link>
        <Link to={"/organizations/"+org.id+"/jobs/new"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-3 py-2.5 text-sm font-semibold text-white"><Plus size={15}/>Post a role</Link>
        <Link to={"/organizations/"+org.id+"/settings"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-paper px-3 py-2.5 text-sm font-semibold"><Settings2 size={15}/>Branding</Link>
        <Link to={"/organizations/"+org.id+"/team"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-paper px-3 py-2.5 text-sm font-semibold"><Users size={15}/>Team</Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-paper p-3 text-center">
        <div><p className="text-xl font-bold">{jobs?.length??0}</p><p className="text-[11px] text-ink-faint">Roles</p></div>
        <div><p className="text-xl font-bold text-trust-dark">{live}</p><p className="text-[11px] text-ink-faint">Live</p></div>
        <div><p className="text-xl font-bold text-ink-light">{draft}</p><p className="text-[11px] text-ink-faint">Drafts</p></div>
      </div>
    </div>

    <div className="border-t border-paper-dim bg-paper/35 p-3 sm:p-5">
      {(jobs??[]).length>0?<div className="space-y-3">{jobs?.map(job=><JobCard key={job.id} job={job} org={org}/>)}</div>:<div className="rounded-2xl bg-white p-6 text-center"><Briefcase className="mx-auto text-ink-faint" size={24}/><h3 className="mt-2 font-semibold">No roles yet</h3><p className="mt-1 text-sm text-ink-light">Create your first hiring role, review it, then choose Publish when it is ready.</p><Link to={"/organizations/"+org.id+"/jobs/new"} className="mt-4 inline-flex rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white">Post first role</Link></div>}
    </div>
  </section>;
}

export function OrganizationManage(){
  const {data,isLoading,error}=useMyOrganizations();
  const location=useLocation();
  const orgs=useMemo(()=>data?.map((x:any)=>x.organizations).filter(Boolean)??[],[data]);
  const notice=(location.state as any)?.jobCreated
    ? ((location.state as any)?.published?"Role published successfully. It is now live in POSSARA Jobs.":"Draft saved. It is private to your organization team until you publish it.")
    : (location.state as any)?.jobUpdated
      ? "Role updated successfully."
      : null;

  return <div className="page-stack">
    <section className="page-hero">
      <div className="page-icon bg-brand-light text-brand-dark"><Building2 size={22}/></div>
      <div><p className="eyebrow">Organization workspace</p><h1>Run hiring from one place.</h1><p>Create a role, publish it when ready, manage applicants, assessments and interviews, then close or mark the role filled.</p></div>
    </section>
    {notice&&<div className="rounded-2xl bg-trust-light px-4 py-3 text-sm font-semibold text-trust-dark">{notice}</div>}
    <div className="rounded-2xl border border-paper-dim bg-white p-4 text-sm leading-6 text-ink-light"><strong className="text-ink">Job states:</strong> Draft means not live; Live means accepting applications; Closed pauses applications; Filled means the employer marked hiring complete.</div>
    {isLoading&&<div className="feed-skeleton"/>}
    {error&&<p className="rounded-2xl bg-flag-light p-4 text-flag-dark">Couldn&apos;t load your organizations.</p>}
    {!isLoading&&!orgs.length&&<div className="empty-state"><ShieldCheck size={28}/><h2>No organization profile yet</h2><p>Create one before posting a formal hiring role.</p><Link to="/organizations/register" className="mt-4 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white">Create organization</Link></div>}
    {orgs.map((org:any)=><OrgWorkspace key={org.id} org={org}/>)}
  </div>;
}
