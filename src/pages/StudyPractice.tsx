import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, CircleAlert } from "lucide-react";
import { useAuth } from "../store/auth";
import { useRecordStudyAttempt, useStudyProfile, useStudyQuestions, useStudyTopic, useStudyTopics } from "../hooks/useStudy";

export function StudyPractice(){
  const {topicId}=useParams<{topicId:string}>();
  const {data:profile}=useStudyProfile();
  const {data:topics}=useStudyTopics(profile?.class_level ?? undefined, profile?.subjects ?? undefined);
  if(!topicId)return <div className="page-stack"><section><h1 className="text-2xl font-semibold">Practice</h1><p className="mt-1 text-ink-light">Choose a topic. Questions here are POSSARA-original, not copied past questions.</p></section><div className="grid gap-3 sm:grid-cols-2">{topics?.map(t=><Link key={t.id} to={`/study/practice/${t.id}`} className="rounded-2xl border border-paper-dim bg-white p-5 shadow-sm"><span className="text-xs text-ink-faint">{t.class_level} · {t.subject}</span><h2 className="mt-2 font-semibold">{t.title}</h2><p className="mt-1 text-sm text-ink-light">Start multiple-choice practice →</p></Link>)}</div></div>;
  return <TopicPractice topicId={topicId}/>;
}

function TopicPractice({topicId}:{topicId:string}){
  const {userId}=useAuth();
  const {data:topic}=useStudyTopic(topicId);
  const {data:questions,isLoading,error}=useStudyQuestions(topicId);
  const record=useRecordStudyAttempt();
  const [index,setIndex]=useState(0);
  const [selected,setSelected]=useState<number|null>(null);
  const [answered,setAnswered]=useState(false);
  const [score,setScore]=useState(0);
  const [finished,setFinished]=useState(false);
  const current=questions?.[index];
  const percent=useMemo(()=>questions?.length?Math.round((score/questions.length)*100):0,[score,questions?.length]);

  async function answer(option:number){
    if(answered||!current)return;
    const correct=option===current.correct_option;
    setSelected(option);setAnswered(true);if(correct)setScore(s=>s+1);
    await record.mutateAsync({questionId:current.id,selectedOption:option,isCorrect:correct});
  }
  function next(){if(!questions)return;if(index>=questions.length-1){setFinished(true);return;}setIndex(i=>i+1);setSelected(null);setAnswered(false);}

  if(isLoading)return <div className="feed-skeleton"/>;
  if(error||!questions?.length)return <p className="text-flag">No practice questions are published for this topic yet.</p>;
  if(!current)return <p className="text-flag">This practice question could not be loaded.</p>;
  if(finished)return <div className="mx-auto max-w-xl rounded-3xl border border-paper-dim bg-white p-6 text-center shadow-sm"><CheckCircle2 size={34} className="mx-auto text-brand"/><h1 className="mt-3 text-2xl font-semibold">Practice complete</h1><p className="mt-2 text-4xl font-semibold">{score}/{questions.length}</p><p className="mt-1 text-ink-light">{percent}% correct</p><div className="mt-5 flex justify-center gap-2"><button onClick={()=>{setIndex(0);setScore(0);setSelected(null);setAnswered(false);setFinished(false)}} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white">Try again</button><Link to="/study" className="rounded-full border border-ink-faint/30 px-5 py-2 text-sm font-medium">Back to Study</Link></div></div>;

  return <div className="mx-auto max-w-2xl">
    <Link to={topic?`/study/topic/${topic.id}`:"/study"} className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-brand-dark"><ArrowLeft size={15}/> {topic?.title??"Study"}</Link>
    <div className="rounded-3xl border border-paper-dim bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between text-xs text-ink-faint"><span>{topic?.class_level} · {topic?.subject}</span><span>{index+1} of {questions.length}</span></div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-dim"><div className="h-full bg-brand transition-all" style={{width:`${((index+1)/questions.length)*100}%`}}/></div>
      <h1 className="mt-6 text-xl font-semibold leading-8">{current.stem}</h1>
      <div className="mt-5 space-y-2">{current.options.map((option,i)=>{const isCorrect=i===current.correct_option;const isSelected=i===selected;let cls="border-ink-faint/30 hover:border-brand";if(answered&&isCorrect)cls="border-trust bg-trust-light";else if(answered&&isSelected&&!isCorrect)cls="border-flag bg-red-50";return <button key={i} disabled={answered} onClick={()=>answer(i)} className={`block w-full rounded-2xl border p-4 text-left text-sm transition ${cls}`}><span className="mr-2 font-semibold">{String.fromCharCode(65+i)}.</span>{option}</button>})}</div>
      {answered&&<div className={`mt-5 rounded-2xl p-4 ${selected===current.correct_option?"bg-trust-light":"bg-paper-dim"}`}><div className="flex items-center gap-2 font-semibold">{selected===current.correct_option?<CheckCircle2 size={18}/>:<CircleAlert size={18}/>} {selected===current.correct_option?"Correct":"Review this"}</div><p className="mt-2 text-sm leading-6 text-ink-light">{current.explanation}</p><p className="mt-2 text-xs text-ink-faint">{current.source_label}</p></div>}
      {!userId&&<p className="mt-4 text-xs text-ink-faint">Sign in if you want POSSARA to remember your attempts and weak areas.</p>}
      {answered&&<button onClick={next} className="mt-5 rounded-full bg-ink px-5 py-2 text-sm font-medium text-white">{index===questions.length-1?"See result":"Next question"}</button>}
    </div>
  </div>;
}
