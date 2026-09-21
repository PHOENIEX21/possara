import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, FileText, ImagePlus } from "lucide-react";
import { useApplyToJob, useHiringJob, useScreeningQuestions } from "../hooks/useHiring";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

const FALLBACK_TYPES=["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","image/jpeg","image/png","image/webp"];
export function JobApply(){
 const {id}=useParams();const {userId}=useAuth();const nav=useNavigate();const {data:j}=useHiringJob(id);const {data:questions}=useScreeningQuestions(id);const apply=useApplyToJob(id||"");
 const [documents,setDocuments]=useState<Record<string,File|null>>({});const [photo,setPhoto]=useState<File|null>(null);const [cover,setCover]=useState("");const [answers,setAnswers]=useState<Record<string,string>>({});const [uploading,setUploading]=useState(false);const [localError,setLocalError]=useState("");
 const allowed=j?.application_document_accept?.length?j.application_document_accept:FALLBACK_TYPES;
 const documentLabels=(j?.application_document_labels?.length?j.application_document_labels:[j?.application_document_label||"CV / résumé"]) as string[];
 const draftKey=`possara-job-application-draft:${userId}:${id}`;
 useEffect(()=>{try{const raw=localStorage.getItem(draftKey);if(!raw)return;const d=JSON.parse(raw);setCover(d.cover||"");setAnswers(d.answers||{});}catch{}},[draftKey]);
 useEffect(()=>{const timer=window.setTimeout(()=>localStorage.setItem(draftKey,JSON.stringify({cover,answers})),250);return()=>window.clearTimeout(timer)},[draftKey,cover,answers]);
 const accept=allowed.join(",");
 if(!userId)return <Navigate to="/signin" replace/>;
 async function upload(file:File,kind:"document"|"passport"){const path=userId+"/"+id+"/"+kind+"-"+crypto.randomUUID()+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const {error}=await supabase.storage.from("job-documents").upload(path,file,{contentType:file.type||"application/octet-stream"});if(error)throw error;return path;}
 async function submit(e:React.FormEvent){e.preventDefault();if(!id)return;setLocalError("");
  const selectedDocuments=documentLabels.map(label=>documents[label]).filter((file):file is File=>!!file);
  if(j?.application_document_required!==false&&selectedDocuments.length<documentLabels.length){setLocalError("Upload every required application document.");return;}
  if(selectedDocuments.some(file=>file.size>10*1024*1024)){setLocalError("Each application document must be 10MB or smaller.");return;}
  if(selectedDocuments.some(file=>file.type&&!allowed.includes(file.type))){setLocalError("One of the selected files is not accepted for this role.");return;}
  if(j?.cover_letter_required&&!cover.trim()){setLocalError("Cover letter is required for this role.");return;}
  if(j?.passport_photo_required&&!photo){setLocalError("Passport photo is required for this role.");return;}
  if(photo&&!["image/jpeg","image/png","image/webp"].includes(photo.type)){setLocalError("Passport photo must be JPG, PNG or WebP.");return;}
  if(photo&&photo.size>5*1024*1024){setLocalError("Passport photo must be 5MB or smaller.");return;}
  setUploading(true);const uploaded:string[]=[];try{
   const documentPaths:string[]=[];for(const file of selectedDocuments){const path=await upload(file,"document");documentPaths.push(path);uploaded.push(path);}const documentPath=documentPaths[0]||"";
   const photoPath=photo?await upload(photo,"passport"):"";if(photoPath)uploaded.push(photoPath);
   await apply.mutateAsync({cvUrl:documentPath,documentUrls:documentPaths,photoUrl:photoPath||undefined,coverLetter:cover,answers:(questions??[]).map(q=>({questionId:q.id,value:answers[q.id]||""})).filter(a=>a.value)});
   localStorage.removeItem(draftKey);nav("/applications?submitted=job");
  }catch(err){if(uploaded.length)await supabase.storage.from("job-documents").remove(uploaded);setLocalError(err instanceof Error?err.message:"Could not submit application.");}finally{setUploading(false);}
 }
 return <div className="page-stack"><section className="page-hero"><div><p className="eyebrow">Application</p><h1>Apply for {j?.title||"this role"}</h1><p>{j?.organizations?.name}. Upload only the documents this employer requests. Files stay private to you and authorized recruiters.</p></div></section>
 <form onSubmit={submit} className="rounded-3xl border border-paper-dim bg-white p-5 shadow-card sm:p-7">
  {documentLabels.map((label,index)=><label key={label+index} className={`${index?"mt-4 ":""}block rounded-2xl border border-dashed border-black/20 p-4`}><span className="flex items-center gap-2 font-semibold"><FileText size={18}/>{label} {j?.application_document_required===false?<span className="font-normal text-ink-faint">(optional)</span>:<span className="text-flag">*</span>}</span><p className="mt-1 text-xs text-ink-faint">PDF, Word document or image as allowed by the employer · max 10MB. Selecting another category will not remove this file.</p><input required={j?.application_document_required!==false} type="file" accept={accept} onChange={e=>setDocuments(prev=>({...prev,[label]:e.target.files?.[0]||null}))} className="mt-3 block w-full text-sm"/>{documents[label]&&<span className="mt-2 flex items-center gap-1 text-xs text-trust-dark"><CheckCircle2 size={13}/>{documents[label]?.name}</span>}</label>)}
  <label className="mt-4 block rounded-2xl border border-dashed border-black/20 p-4"><span className="flex items-center gap-2 font-semibold"><ImagePlus size={18}/>Passport / applicant photo {j?.passport_photo_required?<span className="text-flag">*</span>:<span className="font-normal text-ink-faint">(optional)</span>}</span><p className="mt-1 text-xs text-ink-faint">JPG, PNG or WebP · max 5MB.</p><input required={!!j?.passport_photo_required} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPhoto(e.target.files?.[0]||null)} className="mt-3 block w-full text-sm"/>{photo&&<span className="mt-2 flex items-center gap-1 text-xs text-trust-dark"><CheckCircle2 size={13}/>{photo.name}</span>}</label>
  <label className="mt-4 block text-sm font-semibold">Cover letter {j?.cover_letter_required?<span className="text-flag">*</span>:<span className="font-normal text-ink-faint">(optional)</span>}<textarea required={!!j?.cover_letter_required} rows={5} value={cover} onChange={e=>setCover(e.target.value)} className="mt-1 w-full resize-none rounded-xl border border-black/15 p-3"/></label>
  {questions&&questions.length>0&&<div className="mt-5 border-t border-paper-dim pt-5"><h2 className="font-bold">Screening questions</h2><p className="mb-3 text-xs text-ink-faint">Required questions must be answered before submission.</p>{questions.map(q=><label key={q.id} className="mb-3 block text-sm font-semibold">{q.question_text}{!q.required&&<span className="ml-1 font-normal text-ink-faint">(optional)</span>}{q.answer_type==="yes_no"?<select required={q.required} value={answers[q.id]||""} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})} className="mt-1 w-full rounded-xl border border-black/15 p-3"><option value="">Select an answer</option><option value="Yes">Yes</option><option value="No">No</option></select>:q.answer_type==="single_choice"?<select required={q.required} value={answers[q.id]||""} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})} className="mt-1 w-full rounded-xl border border-black/15 p-3"><option value="">Select an answer</option>{(q.choices??[]).map(choice=><option key={choice} value={choice}>{choice}</option>)}</select>:<input type={q.answer_type==="number"?"number":q.answer_type==="date"?"date":"text"} step={q.answer_type==="number"?"any":undefined} required={q.required} value={answers[q.id]??""} onChange={e=>setAnswers(prev=>({...prev,[q.id]:e.target.value}))} className="mt-1 w-full rounded-xl border border-black/15 p-3"/>}</label>)}</div>}
  {(localError||apply.error)&&<p className="mt-3 text-sm text-flag">{localError||((apply.error as Error)?.message)}</p>}
  <button disabled={uploading||apply.isPending} className="mt-5 w-full rounded-xl bg-brand px-5 py-3 font-semibold text-white disabled:opacity-50">{uploading||apply.isPending?"Submitting securely…":"Submit application"}</button>
 </form></div>;
}