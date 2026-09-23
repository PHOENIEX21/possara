import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { useCbtAttempt, useCbtQuestions, useHiringJob, useMyJobApplication, useStartCbt, useSubmitCbt } from "../hooks/useHiring";
import { usePersistentDraft } from "../hooks/usePersistentDraft";
import { supabase } from "../lib/supabase";

type ExamSession={started_at:string;time_limit_seconds:number;submitted_at?:string|null;score?:number;draft_answers?:Record<string,string>};
export function JobCbt(){
 const {id}=useParams();
 const jobQuery=useHiringJob(id);const applicationQuery=useMyJobApplication(id);
 const job=jobQuery.data,application=applicationQuery.data;
 const questionsQuery=useCbtQuestions(id);const questions=questionsQuery.data;
 const attemptQuery=useCbtAttempt(application?.id);
 const start=useStartCbt(application?.id||"");const submit=useSubmitCbt(id||"",application?.id||"");
 const [session,setSession]=useState<ExamSession|null>(null);
 const attempt=(attemptQuery.data||session) as ExamSession|null;
 const draftKey=application?.id&&attempt?.started_at?'possara-cbt-draft:'+application.id+':'+attempt.started_at:null;
 const [answers,setAnswers,clearDraft,draftError]=usePersistentDraft<Record<string,string>>(draftKey,attempt?.draft_answers||{});
 const [now,setNow]=useState(Date.now);const [score,setScore]=useState<number|null>(null);
 const [syncError,setSyncError]=useState("");const [syncing,setSyncing]=useState(false);
 const autoSubmitted=useRef(false);const submissionLock=useRef(false);const pendingSave=useRef(Promise.resolve());
 const deadline=attempt?Date.parse(attempt.started_at)+attempt.time_limit_seconds*1000:0;
 const remaining=deadline?Math.max(0,Math.ceil((deadline-now)/1000)):0;
 const finished=!!attempt?.submitted_at||score!==null;
 const answered=(questions||[]).filter(question=>question.choices.includes(answers[question.id])).length;
 useEffect(()=>{if(!deadline||finished)return;const tick=()=>setNow(Date.now());tick();const timer=window.setInterval(tick,1000);document.addEventListener('visibilitychange',tick);return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',tick);};},[deadline,finished]);
 // Restore unsynced device answers after reload and retry them on reconnection.
 useEffect(()=>{
  if(!application?.id||!deadline||finished||!Object.keys(answers).length)return;
  let active=true;
  const sync=()=>{
   if(Date.now()>=deadline||submissionLock.current)return;
   setSyncing(true);
   pendingSave.current=pendingSave.current.then(async()=>{
    if(Date.now()>=deadline)return;
    const {error}=await supabase.rpc('save_job_cbt_draft',{p_application_id:application.id,p_answers:answers});
    if(error)throw error;
    if(active)setSyncError('');
   }).catch(()=>{if(active)setSyncError('Answers are saved on this device. We will retry when your connection returns.');})
     .finally(()=>{if(active)setSyncing(false);});
  };
  sync();window.addEventListener('online',sync);
  return()=>{active=false;window.removeEventListener('online',sync);};
 },[application?.id,deadline,finished,answers]);
 function choose(questionId:string,choice:string){
  if(!attempt||Date.now()>=deadline||submissionLock.current)return;
  setAnswers(previous=>({...previous,[questionId]:choice}));
 }
 async function finish(){
  if(!application||submissionLock.current||finished)return;
  submissionLock.current=true;
  try{await pendingSave.current;const result=await submit.mutateAsync({answers});clearDraft();setScore(result);}
  catch{/* Keep the draft and show the mutation error with a retry button. */}
  finally{submissionLock.current=false;}
 }
 useEffect(()=>{if(!draftKey||!deadline||remaining>0||finished||autoSubmitted.current||!questions?.length)return;autoSubmitted.current=true;void finish();},[draftKey,deadline,remaining,finished,questions]);
 async function begin(){try{const result=await start.mutateAsync();if(result){setSession(result);setNow(Date.now());}}catch{/* Error shown below. */}}
 if(jobQuery.isLoading||applicationQuery.isLoading||(application&&attemptQuery.isLoading))return <p role="status">Loading assessment...</p>;
 if(jobQuery.error||applicationQuery.error||attemptQuery.error||questionsQuery.error)return <div className="empty-state"><h1>Assessment could not load</h1><p>{(jobQuery.error||applicationQuery.error||attemptQuery.error||questionsQuery.error)?.message}</p><button onClick={()=>{void jobQuery.refetch();void applicationQuery.refetch();void attemptQuery.refetch();void questionsQuery.refetch();}}>Retry</button></div>;
 if(!application||application.needs_reapply)return <div className="empty-state"><h1>Complete your application first</h1><Link to={'/jobs/'+id+'/apply'}>Open application</Link></div>;
 if(finished)return <div className="page-stack"><div className="empty-state"><CheckCircle2 size={34}/><h1>Assessment submitted</h1><p>Your result is recorded with this application.</p><p className="mt-3 text-2xl font-bold">{score??attempt?.score}%</p><Link to="/applications" className="mt-4 rounded-xl bg-ink px-4 py-3 text-white">Back to applications</Link></div></div>;
 if(!attempt)return <div className="empty-state"><ShieldCheck size={34}/><h1>{job?.title||'Role'} CBT</h1><p>Your answers are saved as you choose them. Refreshing does not restart the timer.</p>{!questions?.length&&<p>The employer has not finished setting up this assessment yet.</p>}<button onClick={()=>void begin()} disabled={start.isPending||questionsQuery.isLoading||!questions?.length} className="mt-4 rounded-xl bg-ink px-5 py-3 font-semibold text-white disabled:opacity-40">{start.isPending?'Starting...':'Start assessment'}</button>{start.error&&<p role="alert" className="text-flag">{start.error.message}</p>}</div>;
 return <div className="page-stack"><section className="rounded-3xl bg-ink p-5 text-white"><h1 className="text-2xl font-bold">{job?.title} CBT</h1><p className="mt-3"><Clock3 size={16} className="mr-2 inline"/>{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')} remaining</p><p role="status" className="mt-2 text-sm">{syncing?'Saving answers...':syncError||'Answers saved as you choose them.'}</p>{draftError&&<p role="alert">{draftError}</p>}</section>
 <div className="space-y-3">{questions?.map((question,index)=><fieldset disabled={!remaining||submit.isPending} key={question.id} className="rounded-2xl border border-paper-dim bg-white p-4"><legend className="px-1 font-semibold">Question {index+1}: {question.question_text}</legend><div className="grid gap-2">{question.choices.map(choice=><label key={choice} className={'flex items-center gap-3 rounded-xl border p-3 text-sm '+(answers[question.id]===choice?'border-brand bg-brand-light':'border-paper-dim')}><input type="radio" name={question.id} checked={answers[question.id]===choice} onChange={()=>choose(question.id,choice)}/>{choice}</label>)}</div></fieldset>)}</div>
 <div className="sticky bottom-20 rounded-2xl bg-white p-3 shadow-xl sm:bottom-4"><p className="mb-2 text-sm">{answered}/{questions?.length||0} answered{remaining===0?' - Time elapsed. Only answers saved before the deadline count.':''}</p><button onClick={()=>void finish()} disabled={submit.isPending||(!remaining&&!submit.error)||!!remaining&&answered<(questions?.length||0)} className="w-full rounded-xl bg-brand p-3 font-semibold text-white disabled:opacity-40">{submit.isPending?'Submitting...':submit.error?'Retry submission':'Submit CBT'}</button>{submit.error&&<p role="alert" className="mt-2 text-sm text-flag">{submit.error.message}</p>}</div></div>;
}
