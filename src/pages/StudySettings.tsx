import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useSaveStudyProfile, useStudyProfile } from "../hooks/useStudy";

const CLASSES=["JSS1","JSS2","JSS3","SS1","SS2","SS3"];
const EXAMS=["BECE","WAEC","NECO","JAMB"];
const SUBJECTS=["Mathematics","English Language","Biology","Chemistry","Physics","Economics","Government","Literature","Computer Studies"];

export function StudySettings(){
 const {data:profile,isLoading}=useStudyProfile(); const save=useSaveStudyProfile();
 const [classLevel,setClassLevel]=useState("JSS3"); const [examTargets,setExamTargets]=useState<string[]>([]); const [subjects,setSubjects]=useState<string[]>([]); const [discoverable,setDiscoverable]=useState(true);
 useEffect(()=>{if(!profile)return;setClassLevel(profile.class_level??"JSS3");setExamTargets(profile.exam_targets??[]);setSubjects(profile.subjects??[]);setDiscoverable(profile.study_discoverable);},[profile]);
 function toggle(list:string[],value:string,setter:(x:string[])=>void){setter(list.includes(value)?list.filter(x=>x!==value):[...list,value]);}
 async function submit(e:React.FormEvent){e.preventDefault();await save.mutateAsync({education_stage:"secondary",class_level:classLevel,exam_targets:examTargets,subjects,study_discoverable:discoverable});}
 if(isLoading)return <div className="feed-skeleton"/>;
 return <div className="mx-auto max-w-2xl"><Link to="/study" className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-brand-dark"><ArrowLeft size={15}/> Study</Link><form onSubmit={submit} className="rounded-3xl border border-paper-dim bg-white p-6 shadow-sm"><h1 className="text-2xl font-semibold">Study profile</h1><p className="mt-1 text-sm text-ink-light">Control the class, subjects and exam preparation POSSARA Study uses for you.</p><label className="mt-5 block text-sm font-medium">Class<select value={classLevel} onChange={e=>setClassLevel(e.target.value)} className="mt-1 w-full rounded-xl border border-ink-faint/30 px-3 py-2">{CLASSES.map(x=><option key={x}>{x}</option>)}</select></label><div className="mt-5"><p className="text-sm font-medium">Exam targets</p><div className="mt-2 flex flex-wrap gap-2">{EXAMS.map(x=><button type="button" key={x} onClick={()=>toggle(examTargets,x,setExamTargets)} className={`rounded-full border px-3 py-1.5 text-sm ${examTargets.includes(x)?"border-brand bg-brand-light text-brand-dark":"border-ink-faint/30 text-ink-light"}`}>{x}</button>)}</div></div><div className="mt-5"><p className="text-sm font-medium">Subjects</p><div className="mt-2 flex flex-wrap gap-2">{SUBJECTS.map(x=><button type="button" key={x} onClick={()=>toggle(subjects,x,setSubjects)} className={`rounded-full border px-3 py-1.5 text-sm ${subjects.includes(x)?"border-brand bg-brand-light text-brand-dark":"border-ink-faint/30 text-ink-light"}`}>{x}</button>)}</div></div><label className="mt-5 flex items-start gap-2 text-sm text-ink-light"><input type="checkbox" checked={discoverable} onChange={e=>setDiscoverable(e.target.checked)} className="mt-1"/><span>Allow other students to discover me through Study.</span></label>{save.error&&<p className="mt-3 text-sm text-flag">{(save.error as Error).message}</p>}{save.isSuccess&&<p className="mt-3 text-sm text-trust-dark">Study profile saved.</p>}<button disabled={save.isPending||subjects.length===0} className="mt-5 rounded-full bg-ink px-5 py-2 text-sm font-medium text-white disabled:opacity-40">{save.isPending?"Saving…":"Save Study profile"}</button></form></div>;
}
