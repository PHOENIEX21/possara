import { usePersistentDraft } from "../hooks/usePersistentDraft";
import { useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, FileText, ImagePlus, LoaderCircle } from "lucide-react";
import { useApplyToJob, useHiringJob, useScreeningQuestions } from "../hooks/useHiring";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

const FALLBACK_TYPES=["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","image/jpeg","image/png","image/webp"];
import { documentMime, documentAccept, uploadErrorMessage } from "../lib/applicationUploads";
type Uploaded={path:string;name:string;type:string};

export function JobApply(){
 const {id}=useParams();const {userId}=useAuth();const nav=useNavigate();const jobQuery=useHiringJob(id);const {data:j}=jobQuery;const screeningQuery=useScreeningQuestions(id);const {data:questions}=screeningQuery;const apply=useApplyToJob(id||"");
 const draftKey=userId&&id?`possara-job-application-draft:${userId}:${id}`:null;
 const [draft,setDraft,clearDraft,draftError]=usePersistentDraft(draftKey,{uploadedDocs:{} as Record<string,Uploaded>,uploadedPhoto:null as Uploaded|null,cover:"",answers:{} as Record<string,string>});
 const {uploadedDocs,uploadedPhoto,cover,answers}=draft;
 const setCover=(cover:string)=>setDraft(prev=>({...prev,cover}));
 const setAnswers=(next:(value:Record<string,string>)=>Record<string,string>)=>setDraft(prev=>({...prev,answers:next(prev.answers)}));
 const setUploadedDocs=(next:(value:Record<string,Uploaded>)=>Record<string,Uploaded>)=>setDraft(prev=>({...prev,uploadedDocs:next(prev.uploadedDocs)}));
 const setUploadedPhoto=(uploadedPhoto:Uploaded|null)=>setDraft(prev=>({...prev,uploadedPhoto}));const [uploadingField,setUploadingField]=useState("");const [localError,setLocalError]=useState("");
 const uploadLock=useRef(false);const [fieldErrors,setFieldErrors]=useState<Record<string,string>>({});
 const allowed=j?.application_document_accept?.length?j.application_document_accept:FALLBACK_TYPES;
 const documentLabels=(j?.application_document_labels?.length?j.application_document_labels:[j?.application_document_label||"CV / résumé"]) as string[];
 const accept=documentAccept(allowed);
 if(!userId)return <Navigate to="/signin" replace/>;

 async function uploadNow(file:File,kind:string){
  if(!id)throw new Error("This job is unavailable.");
  const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error("Your session expired. Sign in again, then retry your upload.");
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const path=`${userId}/${id}/${kind}-${crypto.randomUUID()}-${safe}`;
  const mime=documentMime(file);const uploadFile=file.type===mime?file:new File([file],file.name,{type:mime,lastModified:file.lastModified});
  const {error}=await supabase.storage.from("job-documents").upload(path,uploadFile,{contentType:mime,upsert:false});
  if(error)throw error;return {path,name:file.name,type:documentMime(file)};
 }
 async function replaceUpload(field:string,file:File|null,photo=false){
  if(!file||uploadLock.current)return;
  const mime=documentMime(file);const limit=photo?5:10;
  const types=photo?["image/jpeg","image/png","image/webp"]:allowed;
  const fail=(message:string)=>setFieldErrors(prev=>({...prev,[field]:message}));
  if(!file.size){fail("This file is empty. Choose another file.");return;}
  if(file.size>limit*1024*1024){fail("Choose a file no larger than "+limit+" MB.");return;}
  if(!types.includes(mime)){fail("That format is not accepted. Choose one of the listed formats.");return;}
  uploadLock.current=true;setUploadingField(field);setFieldErrors(prev=>({...prev,[field]:""}));setLocalError("");
  try{const next=await uploadNow(file,photo?"passport":"document");if(photo)setUploadedPhoto(next);else setUploadedDocs(prev=>({...prev,[field]:next}));}
  catch(error){fail(uploadErrorMessage(error));}finally{uploadLock.current=false;setUploadingField("");}
 }
 async function submit(e:React.FormEvent){e.preventDefault();if(!id)return;setLocalError("");
  const documentPaths=documentLabels.map(label=>uploadedDocs[label]?.path).filter((v):v is string=>!!v);
  if(j?.application_document_required!==false&&documentPaths.length<documentLabels.length){setLocalError("Upload every required application document.");return;}
  if(j?.cover_letter_required&&!cover.trim()){setLocalError("Cover letter is required for this role.");return;}
  if(j?.passport_photo_required&&!uploadedPhoto?.path){setLocalError("Passport photo is required for this role.");return;}
  if(uploadingField){setLocalError("Wait for the current file upload to finish.");return;}
  try{await apply.mutateAsync({cvUrl:documentPaths[0]||"",documentUrls:documentPaths,photoUrl:uploadedPhoto?.path,coverLetter:cover,answers:(questions??[]).map(q=>({questionId:q.id,value:answers[q.id]||""})).filter(a=>a.value)});clearDraft();nav("/applications?submitted=job");}
  catch(err){setLocalError(err instanceof Error?err.message:"Could not submit application. Your uploaded files and draft are still saved.");}
 }
 if(jobQuery.isLoading||screeningQuery.isLoading)return <p role="status">Loading application requirements?</p>;
 if(jobQuery.error||screeningQuery.error)return <div className="empty-state"><h1>Could not load this application</h1><p>Your saved draft is still on this device.</p><button className="mt-4 rounded-xl bg-brand px-5 py-3 text-white" onClick={()=>{void jobQuery.refetch();void screeningQuery.refetch();}}>Try again</button></div>;
 if(!j||j.status!=="open"||(j.closes_at&&new Date(j.closes_at).getTime()<Date.now()))return <div className="empty-state"><h1>This role is no longer accepting applications</h1><p>Your draft has been kept on this device.</p><Link to="/jobs" className="mt-4 font-semibold text-brand-dark">Browse open jobs</Link></div>;
 return <div className="page-stack"><section className="page-hero"><div><p className="eyebrow">Application</p><h1>Apply for {j?.title||"this role"}</h1><p>{j?.organizations?.name}. Your draft and completed uploads survive refresh until you submit.</p></div></section>
 <form onSubmit={submit} className="rounded-3xl border border-paper-dim bg-white p-5 shadow-card sm:p-7">
    {documentLabels.map((label,index)=><label key={label+index} className={`${index?"mt-4 ":""}block rounded-2xl border border-dashed border-black/20 p-4`}><span className="flex items-center gap-2 font-semibold"><FileText size={18}/>{label} {j?.application_document_required===false?<span className="font-normal text-ink-faint">(optional)</span>:<span className="text-flag">*</span>}</span><p className="mt-1 text-xs text-ink-faint">PDF, Word document or image as allowed by the employer · max 10MB. Choose a file and wait for the Uploaded confirmation.</p><input disabled={!!uploadingField||apply.isPending} type="file" onClick={e=>{e.currentTarget.value=""}} accept={accept} onChange={e=>{const file=e.target.files?.[0]||null;void replaceUpload(label,file)}} className="mt-3 block w-full text-sm"/>{fieldErrors[label]&&<p role="alert" className="mt-2 text-sm text-flag">{fieldErrors[label]}</p>}{uploadingField===label&&<span className="mt-2 flex items-center gap-1 text-xs text-ink-faint"><LoaderCircle size={13} className="animate-spin"/>Uploading…</span>}{uploadedDocs[label]&&uploadingField!==label&&<span className="mt-2 flex items-center gap-1 text-xs text-trust-dark"><CheckCircle2 size={13}/>Uploaded · {uploadedDocs[label].name}</span>}</label>)}
    <label className="mt-4 block rounded-2xl border border-dashed border-black/20 p-4"><span className="flex items-center gap-2 font-semibold"><ImagePlus size={18}/>Passport / applicant photo {j?.passport_photo_required?<span className="text-flag">*</span>:<span className="font-normal text-ink-faint">(optional)</span>}</span><p className="mt-1 text-xs text-ink-faint">JPG, PNG or WebP · max 5MB. Saved immediately after selection.</p><input disabled={!!uploadingField||apply.isPending} type="file" onClick={e=>{e.currentTarget.value=""}} accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0]||null;void replaceUpload("__photo",file,true)}} className="mt-3 block w-full text-sm"/>{fieldErrors.__photo&&<p role="alert" className="mt-2 text-sm text-flag">{fieldErrors.__photo}</p>}{uploadingField==="__photo"&&<span className="mt-2 flex items-center gap-1 text-xs text-ink-faint"><LoaderCircle size={13} className="animate-spin"/>Uploading…</span>}{uploadedPhoto&&uploadingField!=="__photo"&&<span className="mt-2 flex items-center gap-1 text-xs text-trust-dark"><CheckCircle2 size={13}/>Uploaded · {uploadedPhoto.name}</span>}</label>
  <label className="mt-4 block text-sm font-semibold">Cover letter {j?.cover_letter_required?<span className="text-flag">*</span>:<span className="font-normal text-ink-faint">(optional)</span>}<textarea required={!!j?.cover_letter_required} rows={5} value={cover} onChange={e=>setCover(e.target.value)} className="mt-1 w-full resize-none rounded-xl border border-black/15 p-3"/></label>
  {questions&&questions.length>0&&<div className="mt-5 border-t border-paper-dim pt-5"><h2 className="font-bold">Screening questions</h2><p className="mb-3 text-xs text-ink-faint">Required questions must be answered before submission.</p>{questions.map(q=><label key={q.id} className="mb-3 block text-sm font-semibold">{q.question_text}{!q.required&&<span className="ml-1 font-normal text-ink-faint">(optional)</span>}{q.answer_type==="yes_no"?<select required={q.required} value={answers[q.id]||""} onChange={e=>setAnswers(prev=>({...prev,[q.id]:e.target.value}))} className="mt-1 w-full rounded-xl border border-black/15 p-3"><option value="">Select an answer</option><option value="Yes">Yes</option><option value="No">No</option></select>:q.answer_type==="single_choice"?<select required={q.required} value={answers[q.id]||""} onChange={e=>setAnswers(prev=>({...prev,[q.id]:e.target.value}))} className="mt-1 w-full rounded-xl border border-black/15 p-3"><option value="">Select an answer</option>{(q.choices??[]).map(choice=><option key={choice} value={choice}>{choice}</option>)}</select>:<input type={q.answer_type==="number"?"number":q.answer_type==="date"?"date":"text"} step={q.answer_type==="number"?"any":undefined} required={q.required} value={answers[q.id]??""} onChange={e=>setAnswers(prev=>({...prev,[q.id]:e.target.value}))} className="mt-1 w-full rounded-xl border border-black/15 p-3"/>}</label>)}</div>}
  {draftError&&<p role="alert" className="text-sm text-flag">{draftError}</p>}{(localError||apply.error)&&<p className="mt-3 text-sm text-flag">{localError||((apply.error as Error)?.message)}</p>}
  <button disabled={!!uploadingField||apply.isPending} className="mt-5 w-full rounded-xl bg-brand px-5 py-3 font-semibold text-white disabled:opacity-50">{uploadingField?"Finishing upload…":apply.isPending?"Submitting securely…":"Submit application"}</button>
 </form></div>;
}
