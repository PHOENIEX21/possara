import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export type JobPosting={id:string;organization_id:string;title:string;role_type:string;rank:string;employment_type:string;work_style:string;location:string;pay_min:number|null;pay_max:number|null;description:string;requirements:string[];requires_cbt:boolean;status:"draft"|"open"|"closed"|"filled";posted_by:string;created_at:string;closes_at:string|null;cbt_time_limit_seconds:number;application_document_label:string;application_document_required:boolean;application_document_accept:string[];passport_photo_required:boolean;cover_letter_required:boolean;application_revision:number;updated_at:string;organizations?:{id:string;name:string;slug:string;logo_url:string|null;verified:boolean|null;verification_status:string}|null};
export type ScreeningQuestion={id:string;job_posting_id:string;question_text:string;answer_type:"short_text"|"number"|"date"|"yes_no"|"single_choice";choices:string[]|null;required:boolean;sort_order:number};

export function useHiringJobs(){
 return useQuery({queryKey:["hiring-jobs"],queryFn:async()=>{const {data,error}=await supabase.from("job_postings").select("*, organizations(id,name,slug,logo_url,verified,verification_status)").eq("status","open").order("created_at",{ascending:false});if(error)throw error;return (data??[]) as JobPosting[];}});
}
export function useHiringJob(id:string|undefined){
 return useQuery({queryKey:["hiring-job",id],enabled:!!id,queryFn:async()=>{const {data,error}=await supabase.from("job_postings").select("*, organizations(id,name,slug,logo_url,verified,verification_status)").eq("id",id as string).single();if(error)throw error;return data as JobPosting;}});
}
export function useScreeningQuestions(jobId:string|undefined){
 return useQuery({queryKey:["screening-questions",jobId],enabled:!!jobId,queryFn:async()=>{const {data,error}=await supabase.from("screening_questions").select("*").eq("job_posting_id",jobId as string).order("sort_order");if(error)throw error;return (data??[]) as ScreeningQuestion[];}});
}
export function useMyOrganizations(){
 const {userId}=useAuth();
 return useQuery({queryKey:["my-organizations",userId],enabled:!!userId,queryFn:async()=>{const {data,error}=await supabase.from("organization_members").select("role, organizations(*)").eq("user_id",userId as string);if(error)throw error;return data??[];}});
}
export function useOrganizationJobs(organizationId:string|undefined){
 return useQuery({queryKey:["organization-jobs",organizationId],enabled:!!organizationId,queryFn:async()=>{const {data,error}=await supabase.from("job_postings").select("*").eq("organization_id",organizationId as string).order("created_at",{ascending:false});if(error)throw error;return (data??[]) as JobPosting[];}});
}
export function useRegisterOrganization(){
 const {userId}=useAuth();const qc=useQueryClient();
 return useMutation({mutationFn:async(input:{name:string;category:string;location:string;description:string;logoUrl?:string})=>{if(!userId)throw new Error("Sign in first.");const slugBase=input.name.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48)||"organization";const slug=`${slugBase}-${crypto.randomUUID().slice(0,6)}`;const handle=(slugBase.replace(/-/g,"").slice(0,22)||"org")+crypto.randomUUID().replace(/-/g,"").slice(0,6);const {data,error}=await supabase.from("organizations").insert({owner_id:userId,name:input.name.trim(),slug,handle,category:input.category,industry:input.category,location:input.location,headquarters:input.location,description:input.description.trim(),logo_url:input.logoUrl||null,verification_status:"pending",verified:false}).select("*").single();if(error)throw error;return data;},onSuccess:()=>qc.invalidateQueries({queryKey:["my-organizations"]})});
}
export function useCreateJob(){
 const {userId}=useAuth();const qc=useQueryClient();
 return useMutation({mutationFn:async(input:{organizationId:string;title:string;roleType:string;rank:string;employmentType:string;workStyle:string;location:string;payMin?:number;payMax?:number;description:string;requirements:string[];requiresCbt:boolean;cbtTimeLimitSeconds?:number;applicationDocumentLabel?:string;applicationDocumentRequired?:boolean;applicationDocumentAccept?:string[];passportPhotoRequired?:boolean;coverLetterRequired?:boolean;publish?:boolean;closesAt?:string;screening:{questionText:string;answerType:"short_text"|"number"|"date"|"yes_no"|"single_choice";choices?:string[];required:boolean}[]})=>{if(!userId)throw new Error("Sign in first.");const {data,error}=await supabase.from("job_postings").insert({organization_id:input.organizationId,title:input.title.trim(),role_type:input.roleType.trim(),rank:input.rank,employment_type:input.employmentType,work_style:input.workStyle,location:input.location.trim(),pay_min:input.payMin??null,pay_max:input.payMax??null,description:input.description.trim(),requirements:input.requirements,requires_cbt:input.requiresCbt,cbt_time_limit_seconds:input.cbtTimeLimitSeconds??900,application_document_label:input.applicationDocumentLabel??"CV / résumé",application_document_required:input.applicationDocumentRequired??true,application_document_accept:input.applicationDocumentAccept??["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","image/jpeg","image/png","image/webp"],passport_photo_required:input.passportPhotoRequired??false,cover_letter_required:input.coverLetterRequired??false,status:input.publish?"open":"draft",posted_by:userId,closes_at:input.closesAt||null}).select("*").single();if(error)throw error;if(input.screening.length){const {error:qError}=await supabase.from("screening_questions").insert(input.screening.filter(q=>q.questionText.trim()).map((q,i)=>({job_posting_id:data.id,question_text:q.questionText.trim(),answer_type:q.answerType,choices:q.answerType==="single_choice"?(q.choices??[]).filter(Boolean):null,required:q.required,sort_order:i})));if(qError)throw qError;}return {...data,published:input.publish===true};},onSuccess:(_,v)=>qc.invalidateQueries({queryKey:["organization-jobs",v.organizationId]})});
}
export function useApplyToJob(jobId:string){
 const {userId}=useAuth();const qc=useQueryClient();
 return useMutation({mutationFn:async(input:{cvUrl:string;photoUrl?:string;coverLetter:string;answers:{questionId:string;value:string}[]})=>{if(!userId)throw new Error("Sign in first.");const {data,error}=await supabase.rpc("submit_job_application",{p_job_id:jobId,p_cv_url:input.cvUrl,p_cover_letter:input.coverLetter,p_answers:input.answers,p_photo_url:input.photoUrl??null});if(error)throw error;return {id:String(data)};},onSuccess:()=>qc.invalidateQueries({queryKey:["my-job-applications"]})});
}
export function useMyJobApplications(){
 const {userId}=useAuth();
 return useQuery({queryKey:["my-job-applications",userId],enabled:!!userId,queryFn:async()=>{const {data,error}=await supabase.from("job_applications").select("*, job_postings(title,organization_id,requires_cbt,organizations(name,slug))").eq("applicant_id",userId as string).order("applied_at",{ascending:false});if(error)throw error;return data??[];}});
}

export function useJobApplicants(jobId:string|undefined){
 return useQuery({queryKey:["job-applicants",jobId],enabled:!!jobId,queryFn:async()=>{const {data,error}=await supabase.from("job_applications").select("*, profiles:profiles!job_applications_applicant_id_fkey(id,full_name,username,avatar_url,headline,skills,location)").eq("job_posting_id",jobId as string).order("applied_at",{ascending:false});if(error)throw error;return data??[];}});
}
export function useUpdateJobApplication(jobId:string){
 const qc=useQueryClient();
 return useMutation({mutationFn:async(input:{id:string;status:"shortlisted"|"rejected"|"hired"})=>{const {error}=await supabase.from("job_applications").update({status:input.status}).eq("id",input.id);if(error)throw error;},onSuccess:()=>qc.invalidateQueries({queryKey:["job-applicants",jobId]})});
}

export type CbtQuestion={id:string;job_posting_id:string;question_text:string;choices:string[];sort_order:number};
export function useCbtQuestions(jobId:string|undefined){
 return useQuery({queryKey:["job-cbt-questions",jobId],enabled:!!jobId,queryFn:async()=>{const {data,error}=await supabase.rpc("get_job_cbt_questions",{p_job_id:jobId as string});if(error)throw error;return (data??[]) as CbtQuestion[];}});
}
export function useRecruiterCbtQuestions(jobId:string|undefined){
 return useQuery({queryKey:["recruiter-job-cbt-questions",jobId],enabled:!!jobId,queryFn:async()=>{const {data,error}=await supabase.rpc("get_recruiter_job_cbt_questions",{p_job_id:jobId as string});if(error)throw error;return data??[];}});
}
export function useSaveCbtQuestions(jobId:string){
 const qc=useQueryClient();
 return useMutation({mutationFn:async(input:{rows:{questionText:string;choices:string[];correctChoice:string}[];timeLimitSeconds:number})=>{const {data,error}=await supabase.rpc("save_job_cbt_questions",{p_job_id:jobId,p_questions:input.rows,p_time_limit_seconds:input.timeLimitSeconds});if(error)throw error;return Number(data);},onSuccess:()=>{qc.invalidateQueries({queryKey:["job-cbt-questions",jobId]});qc.invalidateQueries({queryKey:["recruiter-job-cbt-questions",jobId]});}});
}
export function useCbtAttempt(applicationId:string|undefined){
 return useQuery({queryKey:["job-cbt-attempt",applicationId],enabled:!!applicationId,queryFn:async()=>{const {data,error}=await supabase.from("job_cbt_attempts").select("*").eq("application_id",applicationId as string).maybeSingle();if(error)throw error;return data;}});
}
export function useStartCbt(applicationId:string){return useMutation({mutationFn:async()=>{const {data,error}=await supabase.rpc("start_job_cbt",{p_application_id:applicationId});if(error)throw error;return (data?.[0]??null) as {started_at:string;time_limit_seconds:number}|null;}});}
export function useSubmitCbt(_jobId:string,applicationId:string){
 const qc=useQueryClient();
 return useMutation({mutationFn:async(input:{answers:Record<string,string>})=>{const {data,error}=await supabase.rpc("submit_job_cbt",{p_application_id:applicationId,p_answers:input.answers});if(error)throw error;return Number(data);},onSuccess:()=>qc.invalidateQueries({queryKey:["job-cbt-attempt",applicationId]})});
}
export function useMyJobApplication(jobId:string|undefined){
 const {userId}=useAuth();
 return useQuery({queryKey:["my-job-application",jobId,userId],enabled:!!jobId&&!!userId,queryFn:async()=>{const {data,error}=await supabase.from("job_applications").select("*").eq("job_posting_id",jobId as string).eq("applicant_id",userId as string).maybeSingle();if(error)throw error;return data;}});
}

export function useUpdateJob(jobId:string,organizationId:string){
 const qc=useQueryClient();
 return useMutation({mutationFn:async(input:Partial<{title:string;role_type:string;rank:string;employment_type:string;work_style:string;location:string;pay_min:number|null;pay_max:number|null;description:string;requirements:string[];requires_cbt:boolean;cbt_time_limit_seconds:number;application_document_label:string;application_document_required:boolean;application_document_accept:string[];passport_photo_required:boolean;cover_letter_required:boolean;closes_at:string|null;status:"draft"|"open"|"closed"|"filled"}>)=>{const {error}=await supabase.from("job_postings").update(input).eq("id",jobId);if(error)throw error;},onSuccess:()=>{qc.invalidateQueries({queryKey:["organization-jobs",organizationId]});qc.invalidateQueries({queryKey:["hiring-job",jobId]});qc.invalidateQueries({queryKey:["hiring-jobs"]});}});
}
export function useApplicationReview(applicationId:string|undefined){
 return useQuery({queryKey:["application-review",applicationId],enabled:!!applicationId,queryFn:async()=>{const {data:app,error}=await supabase.from("job_applications").select("*, profiles:profiles!job_applications_applicant_id_fkey(id,full_name,username,avatar_url,headline,skills,location), job_postings(id,title,organization_id,requires_cbt)").eq("id",applicationId as string).single();if(error)throw error;const {data:answers,error:aError}=await supabase.from("job_question_answers").select("answer_value,question_kind,question_id").eq("application_id",applicationId as string);if(aError)throw aError;const ids=(answers??[]).filter(a=>a.question_kind==="screening").map(a=>a.question_id);let questions:any[]=[];if(ids.length){const {data,error:qError}=await supabase.from("screening_questions").select("id,question_text").in("id",ids);if(qError)throw qError;questions=data??[];}const {data:attempt,error:tError}=await supabase.from("job_cbt_attempts").select("score,submitted_at").eq("application_id",applicationId as string).maybeSingle();if(tError)throw tError;return {app,answers:answers??[],questions,attempt};}});
}
export function useInterviewQuestions(jobId:string|undefined){
 return useQuery({queryKey:["interview-questions",jobId],enabled:!!jobId,queryFn:async()=>{const {data,error}=await supabase.rpc("get_recruiter_interview_questions",{p_job_id:jobId as string});if(error)throw error;return data??[];}});
}
export function useSaveInterviewQuestions(jobId:string){
 const qc=useQueryClient();
 return useMutation({mutationFn:async(rows:string[])=>{const {data,error}=await supabase.rpc("save_recruiter_interview_questions",{p_job_id:jobId,p_questions:rows.map(question_text=>({question_text}))});if(error)throw error;return Number(data);},onSuccess:()=>qc.invalidateQueries({queryKey:["interview-questions",jobId]})});
}

export function useMessageJobApplicants(jobId:string){
 const {userId}=useAuth();const qc=useQueryClient();
 return useMutation({mutationFn:async(input:{recipientIds:string[];content:string})=>{if(!userId)throw new Error("Sign in first.");const content=input.content.trim();if(!content)throw new Error("Write a message first.");if(content.length>4000)throw new Error("Message is too long.");const recipients=[...new Set(input.recipientIds)].filter(id=>id&&id!==userId);if(!recipients.length)throw new Error("There are no applicants to message.");const {error}=await supabase.from("messages").insert(recipients.map(recipient_id=>({sender_id:userId,recipient_id,content})));if(error)throw error;return recipients.length;},onSuccess:()=>{qc.invalidateQueries({queryKey:["conversations"]});qc.invalidateQueries({queryKey:["job-applicants",jobId]});}});
}

export function useOrganizationMembers(organizationId:string|undefined){
 return useQuery({queryKey:["organization-members",organizationId],enabled:!!organizationId,queryFn:async()=>{const {data,error}=await supabase.from("organization_members").select("id,user_id,role,invited_at,joined_at").eq("organization_id",organizationId as string).order("joined_at");if(error)throw error;const ids=(data??[]).map(m=>m.user_id);if(!ids.length)return [];const {data:profiles,error:pError}=await supabase.from("profiles").select("id,full_name,username,avatar_url").in("id",ids);if(pError)throw pError;const byId=new Map((profiles??[]).map(p=>[p.id,p]));return (data??[]).map(m=>({...m,profile:byId.get(m.user_id)??null}));}});
}
export function useManageOrganizationMember(organizationId:string){
 const qc=useQueryClient();
 return useMutation({mutationFn:async(input:{memberId:string;role:"owner"|"recruiter"|"viewer"}|{memberId:string;remove:true})=>{if("remove" in input){const {error}=await supabase.from("organization_members").delete().eq("id",input.memberId);if(error)throw error;}else{const {error}=await supabase.from("organization_members").update({role:input.role}).eq("id",input.memberId);if(error)throw error;}},onSuccess:()=>qc.invalidateQueries({queryKey:["organization-members",organizationId]})});
}

export function useInviteOrganizationMember(organizationId:string){
 const qc=useQueryClient();
 return useMutation({mutationFn:async(input:{username:string;userId?:string;role:"recruiter"|"viewer"})=>{const username=input.username.trim().replace(/^@/,"");const query=input.userId?supabase.from("profiles").select("id,username,full_name").eq("id",input.userId).maybeSingle():supabase.from("profiles").select("id,username,full_name").ilike("username",username).maybeSingle();const {data:profile,error:pError}=await query;if(pError)throw pError;if(!profile)throw new Error("Choose a matching POSSARA member first.");const {error}=await supabase.from("organization_members").insert({organization_id:organizationId,user_id:profile.id,role:input.role,invited_at:new Date().toISOString(),joined_at:new Date().toISOString()});if(error?.code==="23505")throw new Error("That person is already on this organization team.");if(error)throw error;return profile;},onSuccess:()=>qc.invalidateQueries({queryKey:["organization-members",organizationId]})});
}

export function useUpdateOrganization(organizationId:string){
 const qc=useQueryClient();
 return useMutation({mutationFn:async(input:{logo_url?:string|null;description?:string;location?:string;website?:string|null})=>{const {data,error}=await supabase.from("organizations").update(input).eq("id",organizationId).select("*").single();if(error)throw error;return data;},onSuccess:()=>{qc.invalidateQueries({queryKey:["my-organizations"]});qc.invalidateQueries({queryKey:["organization"]});}});
}

export function useMemberSearch(query:string,organizationId:string|undefined){
 const {userId}=useAuth();
 return useQuery({queryKey:["member-search",query,organizationId,userId],enabled:!!organizationId&&query.trim().length>0,queryFn:async()=>{const term=query.trim().replace(/^@/,"");const {data,error}=await supabase.from("profiles").select("id,full_name,username,avatar_url,headline,profession,location").neq("id",userId as string).or(`username.ilike.%${term}%,full_name.ilike.%${term}%`).limit(8);if(error)throw error;const {data:members}=await supabase.from("organization_members").select("user_id").eq("organization_id",organizationId as string);const existing=new Set((members??[]).map(m=>m.user_id));return (data??[]).filter(p=>!existing.has(p.id));}});
}
