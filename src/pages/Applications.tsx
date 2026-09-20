import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BriefcaseBusiness, CalendarClock, Check, CheckCircle2, Circle, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useAddApplicationTask, useApplicationTasks, useDeleteApplication, useDeleteApplicationTask, useOpportunityApplications, useSaveApplication, useToggleApplicationTask } from "../hooks/usePossaraPlus";
import type { ApplicationStatus, OpportunityApplication } from "../hooks/usePossaraPlus";
import { useMyJobApplications } from "../hooks/useHiring";

const STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: "preparing", label: "Preparing" }, { value: "applied", label: "Applied" }, { value: "interview", label: "Interview" },
  { value: "accepted", label: "Accepted" }, { value: "rejected", label: "Not selected" }, { value: "withdrawn", label: "Withdrawn" },
];

function Checklist({ applicationId }: { applicationId: string }) {
  const { data: tasks, isLoading } = useApplicationTasks(applicationId);
  const add = useAddApplicationTask(applicationId);
  const toggle = useToggleApplicationTask(applicationId);
  const remove = useDeleteApplicationTask(applicationId);
  const [label, setLabel] = useState("");
  const [due, setDue] = useState("");
  const doneCount = tasks?.filter((task) => task.done).length ?? 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!label.trim()) return;
    await add.mutateAsync({ label, dueAt: due ? new Date(`${due}T12:00:00`).toISOString() : null });
    setLabel(""); setDue("");
  }

  return <div className="mt-4 rounded-2xl bg-paper/70 p-3">
    <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-ink">Application checklist</p><p className="mt-0.5 text-[11px] text-ink-faint">{tasks?.length ? `${doneCount}/${tasks.length} complete` : "Add documents and actions you cannot forget."}</p></div>{tasks?.length ? <div className="h-2 w-20 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-trust" style={{width:`${Math.round((doneCount/tasks.length)*100)}%`}}/></div> : null}</div>
    {isLoading && <p className="mt-3 text-xs text-ink-faint">Loading checklist…</p>}
    <div className="mt-2 space-y-1">{tasks?.map((task) => { const overdue = !task.done && task.due_at && new Date(task.due_at).getTime() < Date.now(); return <div key={task.id} className="flex items-start gap-2 rounded-xl bg-white px-2.5 py-2"><button type="button" onClick={() => toggle.mutate({id:task.id,done:!task.done})} className={`mt-0.5 shrink-0 ${task.done?"text-trust-dark":"text-ink-faint"}`} aria-label={task.done?"Mark incomplete":"Mark complete"}>{task.done?<CheckCircle2 size={17}/>:<Circle size={17}/>}</button><div className="min-w-0 flex-1"><p className={`text-sm ${task.done?"text-ink-faint line-through":"text-ink"}`}>{task.label}</p>{task.due_at&&<p className={`mt-0.5 text-[10px] ${overdue?"font-semibold text-flag":"text-ink-faint"}`}>{overdue?"Overdue · ":"Due "}{new Date(task.due_at).toLocaleDateString()}</p>}</div><button type="button" onClick={() => remove.mutate(task.id)} className="rounded-full p-1.5 text-ink-faint hover:bg-red-50 hover:text-flag" aria-label="Remove checklist item"><Trash2 size={13}/></button></div>; })}</div>
    <form onSubmit={submit} className="mt-2 grid gap-2 sm:grid-cols-[1fr_150px_auto]"><input value={label} onChange={(event)=>setLabel(event.target.value)} maxLength={240} placeholder="Add document or next action" className="min-w-0 rounded-xl border border-ink-faint/20 bg-white px-3 py-2 text-xs outline-none focus:border-brand"/><input type="date" value={due} onChange={(event)=>setDue(event.target.value)} className="rounded-xl border border-ink-faint/20 bg-white px-2 py-2 text-xs outline-none focus:border-brand"/><button disabled={add.isPending||!label.trim()} className="inline-flex items-center justify-center gap-1 rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"><Plus size={13}/>Add</button></form>
    {add.error&&<p className="mt-2 text-[11px] text-flag">{(add.error as Error).message}</p>}
  </div>;
}

function TrackerCard({ item }: { item: OpportunityApplication }) {
  const save = useSaveApplication();
  const remove = useDeleteApplication();
  const [nextStep, setNextStep] = useState(item.next_step ?? "");
  const [due, setDue] = useState(item.next_step_due_at?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  useEffect(()=>{setNextStep(item.next_step??"");setDue(item.next_step_due_at?.slice(0,10)??"");setNotes(item.notes??"");},[item.next_step,item.next_step_due_at,item.notes]);
  const title = item.opportunities?.title ?? "Tracked opportunity";
  const nextDue = item.next_step_due_at ? new Date(item.next_step_due_at) : null;
  const overdue = !!nextDue && nextDue.getTime() < Date.now() && !["accepted","rejected","withdrawn"].includes(item.status);

  async function persist(patch: Partial<{ status: ApplicationStatus; notes: string; nextStep: string; nextStepDueAt: string | null }>) {
    await save.mutateAsync({ opportunityId: item.opportunity_id, status: patch.status ?? item.status, notes: patch.notes ?? notes, nextStep: patch.nextStep ?? nextStep, nextStepDueAt: patch.nextStepDueAt === undefined ? (due ? new Date(`${due}T12:00:00`).toISOString() : null) : patch.nextStepDueAt });
  }

  return <article className="rounded-3xl border border-black/[.06] bg-white p-4 shadow-card sm:p-5">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link to={`/opportunities/${item.opportunity_id}`} className="text-lg font-semibold text-ink hover:underline">{title}</Link>{item.opportunities?.organizations?.name && <p className="mt-0.5 text-xs text-ink-faint">{item.opportunities.organizations.name}</p>}</div><button type="button" onClick={() => remove.mutate(item.id)} disabled={remove.isPending} className="rounded-full p-2 text-ink-faint hover:bg-red-50 hover:text-flag" aria-label="Remove from application tracker"><Trash2 size={16}/></button></div>
    {overdue&&<div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-flag">Your next action is overdue. Update it or complete the step.</div>}
    <div className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr]"><label className="text-xs font-semibold text-ink-light">Stage<select value={item.status} onChange={(event) => void persist({ status: event.target.value as ApplicationStatus })} disabled={save.isPending} className="mt-1 w-full rounded-xl border border-ink-faint/25 bg-white px-3 py-2 text-sm font-medium text-ink outline-none focus:border-brand">{STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label><label className="text-xs font-semibold text-ink-light">Next step<input value={nextStep} onChange={(event) => setNextStep(event.target.value)} onBlur={() => void persist({ nextStep })} placeholder="e.g. Request transcript" className="mt-1 w-full rounded-xl border border-ink-faint/25 px-3 py-2 text-sm outline-none focus:border-brand"/></label><label className="text-xs font-semibold text-ink-light">Action due<input type="date" value={due} onChange={(event) => setDue(event.target.value)} onBlur={() => void persist({ nextStepDueAt: due ? new Date(`${due}T12:00:00`).toISOString() : null })} className="mt-1 w-full rounded-xl border border-ink-faint/25 px-3 py-2 text-sm outline-none focus:border-brand"/></label><label className="text-xs font-semibold text-ink-light">Private notes<textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} onBlur={() => void persist({ notes })} placeholder="Documents, contact person, requirements…" className="mt-1 w-full resize-none rounded-xl border border-ink-faint/25 px-3 py-2 text-sm outline-none focus:border-brand"/></label></div>
    <Checklist applicationId={item.id}/>
    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ink-faint">{item.opportunities?.deadline && <span className="inline-flex items-center gap-1"><CalendarClock size={13}/>Deadline {new Date(item.opportunities.deadline).toLocaleDateString()}</span>}{item.opportunities?.link && <a href={item.opportunities.link} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 font-semibold text-brand-dark">Official page <ExternalLink size={12}/></a>}</div>
  </article>;
}

export function Applications() {
  const { data: applications, isLoading, error } = useOpportunityApplications();
  const { data: jobApplications, isLoading: jobsLoading, error: jobsError } = useMyJobApplications();
  const grouped = useMemo(() => { const rows = applications ?? []; return STATUSES.map((status) => ({ ...status, count: rows.filter((item) => item.status === status.value).length })); }, [applications]);
  return <div className="page-stack"><section className="rounded-3xl bg-ink p-6 text-white sm:p-7"><div className="flex items-center gap-2 text-sm font-medium text-white/65"><BriefcaseBusiness size={16}/> POSSARA+</div><h1 className="mt-2 text-3xl font-semibold">Application Command Center</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Turn opportunities into action. Track each application, the next thing you need to do, documents/actions in your checklist and approaching deadlines.</p></section><section className="rounded-3xl border border-paper-dim bg-white p-5 shadow-card"><div className="flex items-end justify-between gap-3"><div><p className="eyebrow">Applied inside POSSARA</p><h2 className="text-xl font-bold">Organization job applications</h2></div><Link to="/jobs" className="text-xs font-semibold text-brand-dark">Find jobs</Link></div>{jobsLoading&&<div className="mt-3 feed-skeleton"/>}{jobsError&&<p className="mt-3 text-sm text-flag">Couldn&apos;t load job applications.</p>}<div className="mt-3 space-y-2">{jobApplications?.map((a:any)=><Link key={a.id} to={a.job_postings?.requires_cbt?"/jobs/"+a.job_posting_id+"/cbt":"/jobs/"+a.job_posting_id} className="flex items-center justify-between gap-3 rounded-2xl bg-paper p-3"><div className="min-w-0"><p className="font-semibold">{a.job_postings?.title}</p>{a.needs_reapply&&<p className="mt-1 text-xs font-semibold text-flag">Employer updated this role — review the changes and update your application.</p>}<p className="text-xs text-ink-faint">{a.job_postings?.organizations?.name} · Applied {new Date(a.applied_at).toLocaleDateString()}</p></div><div className="flex shrink-0 items-center gap-2">{a.needs_reapply&&<span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-flag">Update required</span>}<span className="rounded-full bg-paper-dim px-2.5 py-1 text-[11px] font-bold capitalize">{a.status}</span>{a.job_postings?.requires_cbt&&<span className="rounded-full bg-opportunity-light px-2.5 py-1 text-[11px] font-bold text-opportunity-dark">CBT</span>}</div></Link>)}</div>{!jobsLoading&&!jobsError&&jobApplications?.length===0&&<p className="mt-3 text-sm text-ink-faint">No direct job applications yet.</p>}</section><section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{grouped.map((status) => <div key={status.value} className="rounded-2xl border border-black/[.05] bg-white p-3 text-center shadow-sm"><p className="text-xl font-bold">{status.count}</p><p className="mt-0.5 text-[11px] font-medium text-ink-faint">{status.label}</p></div>)}</section>{isLoading && <div className="feed-skeleton"/>}{error && <p className="rounded-2xl bg-red-50 p-4 text-sm text-flag">Couldn&apos;t load your application tracker.</p>}{!isLoading && !error && applications?.length === 0 && <section className="rounded-3xl border border-dashed border-black/10 bg-white p-8 text-center"><Check size={28} className="mx-auto text-ink-faint"/><h2 className="mt-3 text-lg font-semibold">Nothing tracked yet</h2><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-ink-light">Open an opportunity and choose <strong>Track application</strong>. POSSARA will keep the application, next steps and checklist here.</p><Link to="/opportunities" className="mt-4 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">Find opportunities</Link></section>}<div className="space-y-3">{applications?.map((item) => <TrackerCard key={item.id} item={item}/>)}</div></div>;
}
