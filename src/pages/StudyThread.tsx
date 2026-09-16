import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "../store/auth";
import { useCreateStudyAnswer, useMarkStudySolved, useStudyAnswers, useStudyThread } from "../hooks/useStudy";

export function StudyThread(){
  const {id}=useParams<{id:string}>();
  const {userId}=useAuth();
  const {data:thread,isLoading,error}=useStudyThread(id);
  const {data:answers}=useStudyAnswers(id);
  const createAnswer=useCreateStudyAnswer(id as string);
  const markSolved=useMarkStudySolved(id as string);
  const [body,setBody]=useState("");

  if(isLoading)return <div className="feed-skeleton"/>;
  if(error||!thread)return <p className="text-flag">This Study discussion could not be loaded.</p>;

  async function submit(e:React.FormEvent){e.preventDefault();if(!body.trim())return;await createAnswer.mutateAsync(body.trim());setBody("");}

  return <div className="mx-auto max-w-3xl">
    <Link to="/study/together" className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-brand-dark"><ArrowLeft size={15}/> Study Together</Link>
    <article className="rounded-3xl border border-paper-dim bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-faint"><span>{thread.class_level}</span><span>·</span><span>{thread.subject}</span>{thread.accepted_answer_id&&<span className="inline-flex items-center gap-1 rounded-full bg-trust-light px-2 py-1 font-medium text-trust-dark"><CheckCircle2 size={12}/> Solved</span>}</div>
      <h1 className="mt-3 text-2xl font-semibold">{thread.title}</h1>
      <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-ink">{thread.body}</p>
      <p className="mt-4 text-xs text-ink-faint">Asked by {thread.profiles?.username?<Link to={`/profile/${thread.profiles.username}`} className="font-medium text-brand-dark">{thread.profiles.full_name??"Student"}</Link>:thread.profiles?.full_name??"a student"}</p>
    </article>

    <section className="mt-6"><h2 className="text-lg font-semibold">Answers</h2><p className="mt-1 text-sm text-ink-light">Explain the method, not just the final answer.</p>
      <div className="mt-3 space-y-3">{answers?.length===0&&<div className="rounded-2xl bg-white p-4 text-sm text-ink-light">No answer yet.</div>}{answers?.map(answer=>{const accepted=thread.accepted_answer_id===answer.id;return <div key={answer.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${accepted?"border-trust":"border-paper-dim"}`}><div className="flex items-start justify-between gap-3"><p className="text-xs text-ink-faint">{answer.profiles?.username?<Link to={`/profile/${answer.profiles.username}`} className="font-medium text-brand-dark">{answer.profiles.full_name??"Student"}</Link>:answer.profiles?.full_name??"Student"}</p>{accepted&&<span className="inline-flex items-center gap-1 rounded-full bg-trust-light px-2 py-1 text-xs font-medium text-trust-dark"><CheckCircle2 size={12}/> Solved it</span>}</div><p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink">{answer.body}</p>{userId===thread.author_id&&!thread.accepted_answer_id&&<button onClick={()=>markSolved.mutate(answer.id)} disabled={markSolved.isPending} className="mt-3 text-xs font-semibold text-brand-dark">Mark as the answer that solved it</button>}</div>})}</div>
    </section>

    <section className="mt-6">{userId?<form onSubmit={submit} className="rounded-2xl border border-paper-dim bg-white p-5"><h2 className="font-semibold">Add an explanation</h2><textarea value={body} onChange={e=>setBody(e.target.value)} rows={4} maxLength={3000} placeholder="Show the steps or reasoning that can help the student understand." className="mt-3 w-full rounded-xl border border-ink-faint/30 px-3 py-2 text-sm outline-none focus:border-brand"/>{createAnswer.error&&<p className="mt-2 text-sm text-flag">{(createAnswer.error as Error).message}</p>}<button disabled={!body.trim()||createAnswer.isPending} className="mt-3 rounded-full bg-ink px-5 py-2 text-sm font-medium text-white disabled:opacity-40">{createAnswer.isPending?"Posting…":"Post explanation"}</button></form>:<div className="rounded-2xl bg-paper-dim p-4 text-sm text-ink-light"><Link to="/signin" className="font-semibold text-brand-dark underline">Sign in</Link> to answer this question.</div>}</section>
  </div>;
}
