import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export type JobPosting={id:string;organization_id:string;title:string;role_type:string;rank:string;employment_type:string;work_style:string;location:string;pay_min:number|null;pay_max:number|null;description:string;requirements:string[];requires_cbt:boolean;status:"draft"|"open"|"closed"|"filled";posted_by:string;created_at:string;closes_at:string|null;organizations?:{id:string;name:string;slug:string;logo_url:string|null;verified:boolean|null;verification_status:string}|null};
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
 return useMutation({mutationFn:async(input:{name:string;category:string;location:string;description:string;logoUrl?:string})=>{if(!userId)throw new Error("Sign in first.");const slugBase=input.name.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48)||"organization";const slug=`${slugBase}-${crypto.randomUUID().slice(0,6)}`;const handle=slugBase.replace(/-/g,"").slice(0,30);const {data,error}=await supabase.from("organizations").insert({owner_id:userId,name:input.name.trim(),slug,handle,category:input.category,industry:input.category,location:input.location,headquarters:input.location,description:input.description.trim(),logo_url:input.logoUrl||null,verification_status:"pending",verified:false}).select("*").single();if(error)throw error;const {error:memberError}=await supabase.from("organization_members").insert({organization_id:data.id,user_id:userId,role:"owner",joined_at:new Date().toISOString()});if(memberError)throw memberError;return data;},onSuccess:()=>qc.invalidateQueries({queryKey:["my-organizations"]})});
}
export function useCreateJob(){
 const {userId}=useAuth();const qc=useQueryClient();
 return useMutation({mutationFn:async(input:{organizationId:string;title:string;roleType:string;rank:string;employmentType:string;workStyle:string;location:string;payMin?:number;payMax?:number;description:string;requirements:string[];requiresCbt:boolean;closesAt?:string;screening:{questionText:string;answerType:"short_text"|"number"|"date"|"yes_no"|"single_choice";choices?:string[];required:boolean}[]})=>{if(!userId)throw new Error("Sign in first.");const {data:org,error:orgError}=await supabase.from("organizations").select("verification_status,verified").eq("id",input.organizationId).single();if(orgError)throw orgError;const canPublish=org.verified===true||org.verification_status==="verified";const {data,error}=await supabase.from("job_postings").insert({organization_id:input.organizationId,title:input.title.trim(),role_type:input.roleType.trim(),rank:input.rank,employment_type:input.employmentType,work_style:input.workStyle,location:input.location.trim(),pay_min:input.payMin??null,pay_max:input.payMax??null,description:input.description.trim(),requirements:input.requirements,requires_cbt:input.requiresCbt,status:canPublish?"open":"draft",posted_by:userId,closes_at:input.closesAt||null}).select("*").single();if(error)throw error;if(input.screening.length){const {error:qError}=await supabase.from("screening_questions").insert(input.screening.filter(q=>q.questionText.trim()).map((q,i)=>({job_posting_id:data.id,question_text:q.questionText.trim(),answer_type:q.answerType,choices:q.answerType==="single_choice"?(q.choices??[]).filter(Boolean):null,required:q.required,sort_order:i})));if(qError)throw qError;}return {...data,published:canPublish};},onSuccess:(_,v)=>qc.invalidateQueries({queryKey:["organization-jobs",v.organizationId]})});
}
export function useApplyToJob(jobId:string){
 const {userId}=useAuth();const qc=useQueryClient();
 return useMutation({mutationFn:async(input:{cvUrl:string;coverLetter:string;answers:{questionId:string;value:string}[]})=>{if(!userId)throw new Error("Sign in first.");const {data,error}=await supabase.from("job_applications").insert({job_posting_id:jobId,applicant_id:userId,cv_url:input.cvUrl,cover_letter_text:input.coverLetter||null}).select("id").single();if(error)throw error;if(input.answers.length){const {error:aError}=await supabase.from("job_question_answers").insert(input.answers.map(a=>({application_id:data.id,question_id:a.questionId,question_kind:"screening",answer_value:a.value})));if(aError)throw aError;}return data;},onSuccess:()=>qc.invalidateQueries({queryKey:["my-job-applications"]})});
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
export function useSaveCbtQuestions(jobId:string){
 const qc=useQueryClient();
 return useMutation({mutationFn:async(rows:{questionText:string;choices:string[];correctChoice:string}[])=>{const {error:del}=await supabase.from("job_cbt_questions").delete().eq("job_posting_id",jobId);if(del)throw del;if(!rows.length)return;const {error}=await supabase.from("job_cbt_questions").insert(rows.map((q,i)=>({job_posting_id:jobId,question_text:q.questionText,choices:q.choices,correct_choice:q.correctChoice,sort_order:i})));if(error)throw error;},onSuccess:()=>qc.invalidateQueries({queryKey:["job-cbt-questions",jobId]})});
}
export function useCbtAttempt(applicationId:string|undefined){
 return useQuery({queryKey:["job-cbt-attempt",applicationId],enabled:!!applicationId,queryFn:async()=>{const {data,error}=await supabase.from("job_cbt_attempts").select("*").eq("application_id",applicationId as string).maybeSingle();if(error)throw error;return data;}});
}
export function useSubmitCbt(_jobId:string,applicationId:string){
 const qc=useQueryClient();
 return useMutation({mutationFn:async(input:{answers:Record<string,string>;startedAt:string})=>{const {data,error}=await supabase.rpc("submit_job_cbt",{p_application_id:applicationId,p_answers:input.answers,p_started_at:input.startedAt});if(error)throw error;return Number(data);},onSuccess:()=>qc.invalidateQueries({queryKey:["job-cbt-attempt",applicationId]})});
}
export function useMyJobApplication(jobId:string|undefined){
 const {userId}=useAuth();
 return useQuery({queryKey:["my-job-application",jobId,userId],enabled:!!jobId&&!!userId,queryFn:async()=>{const {data,error}=await supabase.from("job_applications").select("*").eq("job_posting_id",jobId as string).eq("applicant_id",userId as string).maybeSingle();if(error)throw error;return data;}});
}

export function useUpdateJob(jobId:string,organizationId:string){
 const qc=useQueryClient();
 return useMutation({mutationFn:async(input:Partial<{title:string;role_type:string;rank:string;employment_type:string;work_style:string;location:string;pay_min:number|null;pay_max:number|null;description:string;requirements:string[];requires_cbt:boolean;closes_at:string|null;status:"draft"|"open"|"closed"|"filled"}>)=>{const {error}=await supabase.from("job_postings").update(input).eq("id",jobId);if(error)throw error;},onSuccess:()=>{qc.invalidateQueries({queryKey:["organization-jobs",organizationId]});qc.invalidateQueries({queryKey:["hiring-job",jobId]});qc.invalidateQueries({queryKey:["hiring-jobs"]});}});
}
export function useApplicationReview(applicationId:string|undefined){
 return useQuery({queryKey:["application-review",applicationId],enabled:!!applicationId,queryFn:async()=>{const {data:app,error}=await supabase.from("job_applications").select("*, profiles:profiles!job_applications_applicant_id_fkey(id,full_name,username,avatar_url,headline,skills,location), job_postings(id,title,organization_id,requires_cbt)").eq("id",applicationId as string).single();if(error)throw error;const {data:answers,error:aError}=await supabase.from("job_question_answers").select("answer_value,question_kind,question_id").eq("application_id",applicationId as string);if(aError)throw aError;const ids=(answers??[]).filter(a=>a.question_kind==="screening").map(a=>a.question_id);let questions:any[]=[];if(ids.length){const {data,error:qError}=await supabase.from("screening_questions").select("id,question_text").in("id",ids);if(qError)throw qError;questions=data??[];}const {data:attempt,error:tError}=await supabase.from("job_cbt_attempts").select("score,submitted_at").eq("application_id",applicationId as string).maybeSingle();if(tError)throw tError;return {app,answers:answers??[],questions,attempt};}});
}
export function useInterviewQuestions(jobId:string|undefined){
 return useQuery({queryKey:["interview-questions",jobId],enabled:!!jobId,queryFn:async()=>{const {data,error}=await supabase.from("interview_questions").select("*").eq("job_posting_id",jobId as string).order("sort_order");if(error)throw error;return data??[];}});
}
export function useSaveInterviewQuestions(jobId:string){
 const qc=useQueryClient();
 return useMutation({mutationFn:async(rows:string[])=>{const {error:del}=await supabase.from("interview_questions").delete().eq("job_posting_id",jobId);if(del)throw del;if(rows.length){const {error}=await supabase.from("interview_questions").insert(rows.map((question_text,i)=>({job_posting_id:jobId,question_text,answer_type:"short_text",required:true,sort_order:i})));if(error)throw error;}},onSuccess:()=>qc.invalidateQueries({queryKey:["interview-questions",jobId]})});
}

export function useOrganizationMembers(organizationId:string|undefined){
 return useQuery({queryKey:["organization-members",organizationId],enabled:!!organizationId,queryFn:async()=>{const {data,error}=await supabase.from("organization_members").select("id,user_id,role,invited_at,joined_at,profiles:profiles!organization_members_user_id_fkey(full_name,username,avatar_url)").eq("organization_id",organizationId as string).order("joined_at");if(error)throw error;return data??[];}});
}
export function useManageOrganizationMember(organizationId:string){
 const qc=useQueryClient();
 return useMutation({mutationFn:async(input:{memberId:string;role:"owner"|"recruiter"|"viewer"}|{memberId:string;remove:true})=>{if("remove" in input){const {error}=await supabase.from("organization_members").delete().eq("id",input.memberId);if(error)throw error;}else{const {error}=await supabase.from("organization_members").update({role:input.role}).eq("id",input.memberId);if(error)throw error;}},onSuccess:()=>qc.invalidateQueries({queryKey:["organization-members",organizationId]})});
}
