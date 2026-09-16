import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, MessageSquareText, Plus, Users } from "lucide-react";
import { useAuth } from "../store/auth";
import { useCreateStudyThread, useStudyProfile, useStudyThreads, useStudyTopic } from "../hooks/useStudy";

const SUBJECTS=["Mathematics","English Language","Biology","Chemistry","Physics","Economics","Government","Literature","Computer Studies"];
const CLASSES=["JSS1","JSS2","JSS3","SS1","SS2","SS3"];

export function StudyTogether(){
  const {userId}=useAuth();
  const {data:profile}=useStudyProfile();
  const [params]=useSearchParams();
  const topicId=params.get("topic")??undefined;
  const {data:topic}=useStudyTopic(topicId);
  const {data:threads,isLoading}=useStudyThreads(profile?.class_level??null);
  const create=useCreateStudyThread();
  const [asking,setAsking]=useState(!!topicId);
  const [classLevel,setClassLevel]=useState(profile?.class_level??topic?.class_level??"JSS3");
  const [subject,setSubject]=useState(topic?.subject??profile?.subjects?.[0]??"Mathematics");
  const [title,setTitle]=useState(topic?`Question about ${topic.title}`:"");
  const [body,setBody]=useState("");

  const visible=useMemo(()=>threads??[],[threads]);
  async function submit(e:React.FormEvent){e.preventDefault();if(!title.trim()||!body.trim())return;await create.mutateAsync({class_level:classLevel,subject,topic_id:topicId??null,title:title.trim(),body:body.trim()});setTitle("");setBody("");setAsking(false);}

  return <div className="page-stack">
    <section className="rounded-3xl bg-ink p-6 text-white"><div className="flex items-center gap-2 text-sm text-white/70"><Users size={16}/> POSSARA Study Together</div><h1 className="mt-2 text-3xl font-semibold">Ask clearly. Explain your thinking. Solve it together.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Academic discussion stays separate from the main social feed so students can focus on useful subject questions.</p></section>

    <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Questions</h2><p className="text-sm text-ink-light">{profile?.class_level?`${profile.class_level} discussions shown first.`:"Browse current student discussions."}</p></div>{userId?<button onClick={()=>setAsking(v=>!v)} className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white"><Plus size={16}/> Ask a question</button>:<Link to="/signin" className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white">Sign in to ask</Link>}</div>

    {asking&&userId&&<form onSubmit={submit} className="rounded-2xl border border-paper-dim bg-white p-5 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-ink-light">Class<select value={classLevel} onChange={e=>setClassLevel(e.target.value)} className="mt-1 w-full rounded-xl border border-ink-faint/30 px-3 py-2">{CLASSES.map(x=><option key={x}>{x}</option>)}</select></label><label className="text-sm text-ink-light">Subject<select value={subject} onChange={e=>setSubject(e.target.value)} className="mt-1 w-full rounded-xl border border-ink-faint/30 px-3 py-2">{SUBJECTS.map(x=><option key={x}>{x}</option>)}</select></label></div>
      {topic&&<p className="mt-3 rounded-xl bg-paper-dim px-3 py-2 text-xs text-ink-light">Linked lesson: {topic.title}</p>}
      <label className="mt-3 block text-sm text-ink-light">Question title<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={140} className="mt-1 w-full rounded-xl border border-ink-faint/30 px-3 py-2" placeholder="What exactly are you stuck on?"/></label>
      <label className="mt-3 block text-sm text-ink-light">Show what you have tried<textarea value={body} onChange={e=>setBody(e.target.value)} rows={4} maxLength={3000} className="mt-1 w-full rounded-xl border border-ink-faint/30 px-3 py-2" placeholder="Write the problem and your attempt so others can help properly."/></label>
      {create.error&&<p className="mt-2 text-sm text-flag">{(create.error as Error).message}</p>}
      <div className="mt-4 flex gap-2"><button disabled={create.isPending||!title.trim()||!body.trim()} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white disabled:opacity-40">{create.isPending?"Posting…":"Post question"}</button><button type="button" onClick={()=>setAsking(false)} className="rounded-full px-4 py-2 text-sm text-ink-light">Cancel</button></div>
    </form>}

    <div className="space-y-3">{isLoading&&<div className="feed-skeleton"/>}{!isLoading&&visible.length===0&&<div className="rounded-2xl bg-white p-5 text-sm text-ink-light">No Study questions here yet. Ask a clear academic question to start one.</div>}{visible.map(thread=><Link key={thread.id} to={`/study/together/${thread.id}`} className="block rounded-2xl border border-paper-dim bg-white p-5 shadow-sm transition hover:-translate-y-0.5"><div className="flex items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2 text-xs text-ink-faint"><span>{thread.class_level}</span><span>·</span><span>{thread.subject}</span>{thread.accepted_answer_id&&<span className="inline-flex items-center gap-1 rounded-full bg-trust-light px-2 py-1 font-medium text-trust-dark"><CheckCircle2 size={12}/> Solved</span>}</div><MessageSquareText size={17} className="text-brand"/></div><h3 className="mt-2 font-semibold">{thread.title}</h3><p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-light">{thread.body}</p><p className="mt-3 text-xs text-ink-faint">Asked by {thread.profiles?.full_name??"a student"}</p></Link>)}</div>
  </div>;
}
