import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, MessageCircle, UserRound, XCircle } from "lucide-react";
import { useHiringJob, useJobApplicants, useMessageJobApplicants, useUpdateJobApplication } from "../hooks/useHiring";

const STATUS_LABEL:Record<string,string>={
  new:"New",
  shortlisted:"Shortlisted",
  rejected:"Not selected",
  hired:"Hired",
  withdrawn:"Withdrawn",
};

export function JobApplicants(){
  const {id}=useParams();
  const {data:job}=useHiringJob(id);
  const {data,isLoading,error}=useJobApplicants(id);
  const update=useUpdateJobApplication(id||"");
  const messageAll=useMessageJobApplicants(id||"");
  const [message,setMessage]=useState("");

  async function sendAll(){
    await messageAll.mutateAsync({recipientIds:(data??[]).map((a:any)=>a.applicant_id),content:message});
    setMessage("");
  }

  return <div className="page-stack">
    <Link to="/organizations/manage" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-light"><ArrowLeft size={15}/>Hiring workspace</Link>

    <section className="page-hero">
      <div><p className="eyebrow">Applicants</p><h1>{job?.title||"Role"}</h1><p>Review each application, assessment and profile, then move the candidate to the next stage. Decisions stay attached to this role.</p></div>
    </section>

    <section className="grid grid-cols-3 gap-2 rounded-2xl border border-paper-dim bg-white p-3 text-center shadow-sm">
      <div><p className="text-xl font-bold">{data?.length??0}</p><p className="text-[11px] text-ink-faint">Applicants</p></div>
      <div><p className="text-xl font-bold text-trust-dark">{data?.filter((a:any)=>a.status==="shortlisted").length??0}</p><p className="text-[11px] text-ink-faint">Shortlisted</p></div>
      <div><p className="text-xl font-bold">{data?.filter((a:any)=>a.status==="hired").length??0}</p><p className="text-[11px] text-ink-faint">Hired</p></div>
    </section>

    {!!data?.length&&<section className="rounded-2xl border border-paper-dim bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2"><MessageCircle size={17}/><h2 className="font-semibold">Message all applicants</h2></div>
      <p className="mt-1 text-xs leading-5 text-ink-faint">Send one hiring update privately to everyone who applied for this role.</p>
      <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={3} maxLength={4000} placeholder="Write an update for all applicants…" className="mt-3 w-full resize-none rounded-xl border border-paper-dim p-3 text-sm outline-none focus:border-brand"/>
      <button type="button" disabled={messageAll.isPending||!message.trim()} onClick={()=>void sendAll().catch(()=>undefined)} className="mt-2 min-h-11 w-full rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 sm:w-auto">{messageAll.isPending?"Sending…":`Message all ${data.length} applicants`}</button>
      {messageAll.isSuccess&&<p className="mt-2 text-xs font-medium text-trust-dark">Message sent to all applicants.</p>}
      {messageAll.error&&<p className="mt-2 text-xs text-flag">{(messageAll.error as Error).message}</p>}
    </section>}

    {isLoading&&<div className="feed-skeleton"/>}
    {error&&<p className="rounded-2xl bg-flag-light p-4 text-sm text-flag-dark">Couldn&apos;t load applicants. Only organization owners and recruiters can access this list.</p>}
    {update.error&&<p className="rounded-2xl bg-flag-light p-4 text-sm text-flag-dark">{(update.error as Error).message}</p>}

    <div className="space-y-3">
      {data?.map((a:any)=><article key={a.id} className="rounded-2xl border border-paper-dim bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          {a.profiles?.avatar_url?<img src={a.profiles.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover"/>:<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper-dim"><UserRound size={18}/></div>}
          <div className="min-w-0 flex-1">
            <Link to={a.profiles?.username?"/profile/"+a.profiles.username:"/profile/id/"+a.applicant_id} className="block truncate font-bold hover:underline">{a.profiles?.full_name||"POSSARA member"}</Link>
            <p className="mt-0.5 text-xs leading-5 text-ink-faint">{a.profiles?.headline||a.profiles?.location||"Applicant"} · Applied {new Date(a.applied_at).toLocaleDateString()}</p>
            {a.profiles?.skills?.length>0&&<p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-light">{a.profiles.skills.slice(0,6).join(" · ")}</p>}
          </div>
          <span className="shrink-0 rounded-full bg-paper-dim px-2 py-1 text-[10px] font-bold">{STATUS_LABEL[a.status]??a.status}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link to={"/organizations/jobs/"+id+"/applicants/"+a.id} className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-white">Review full application</Link>
          <button disabled={update.isPending||a.status==="shortlisted"} onClick={()=>update.mutate({id:a.id,status:"shortlisted"})} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-trust-light px-3 py-2 text-xs font-semibold text-trust-dark disabled:opacity-45"><CheckCircle2 size={14}/>Shortlist</button>
          <button disabled={update.isPending||a.status==="rejected"} onClick={()=>update.mutate({id:a.id,status:"rejected"})} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-flag disabled:opacity-45"><XCircle size={14}/>Not selected</button>
          <Link to={"/messages/"+a.applicant_id} className="col-span-2 inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-brand-light px-3 py-2 text-xs font-semibold text-brand-dark"><MessageCircle size={14}/>Message applicant</Link>
        </div>
      </article>)}
    </div>

    {!isLoading&&!error&&data?.length===0&&<div className="empty-state"><UserRound size={28}/><h2>No applicants yet</h2><p>When someone applies, the organization team will receive a notification and the application will appear here.</p></div>}
  </div>;
}
