// Run through agent-browser eval --stdin after each reload. All API calls are
// intercepted, so these UI checks cannot publish or contact real applicants.
(async()=>{
 const {useAuth}=await import('/src/store/auth.ts');
 const {supabase}=await import('/src/lib/supabase.ts');
 const uid='00000000-0000-4000-8000-000000000111',orgId='00000000-0000-4000-8000-000000000222',jobId='00000000-0000-4000-8000-000000000333',applicationId='00000000-0000-4000-8000-000000000444',other='00000000-0000-4000-8000-000000000555';
 const org={id:orgId,owner_id:uid,name:'Verification Organization',slug:'verification-organization',verified:true,application_defaults:{labels:['CV','Portfolio'],accept:['application/pdf','image/png'],required:true}};
 const job={id:jobId,organization_id:orgId,title:'Verification role',role_type:'Design',rank:'Entry',employment_type:'Full-time',work_style:'Remote',location:'Lagos',description:'Verification role description',organizations:org,status:'open',requires_cbt:true,cbt_time_limit_seconds:600,application_document_labels:['CV','Portfolio'],application_document_accept:['application/pdf','image/png'],application_document_required:true};
 const questions=[{id:'q1',job_posting_id:jobId,question_text:'First question',choices:['A','B'],sort_order:0},{id:'q2',job_posting_id:jobId,question_text:'Second question',choices:['A','B'],sort_order:1}];
 const started=sessionStorage.getItem('verification-exam-started')||new Date(Date.now()-10000).toISOString();sessionStorage.setItem('verification-exam-started',started);
 const attempt={id:'attempt-fixture',application_id:applicationId,started_at:started,time_limit_seconds:600,draft_answers:JSON.parse(sessionStorage.getItem('verification-exam-answers')||'{}')};
 let reaction=JSON.parse(sessionStorage.getItem('verification-reaction')||'null');
 window.__fixture={uid,orgId,jobId,applicationId,other,org,job,requests:[],questions};
 window.__go=route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));};
 window.fetch=async(input,options={})=>{
  const url=String(input),method=options.method||'GET';let data=[];
  window.__fixture.requests.push({path:url.split('/rest/v1/')[1],method});
  if(url.includes('/rpc/get_my_profile'))data={id:uid,full_name:'Verification Member'};
  else if(url.includes('/rpc/get_recruiter_job_cbt_questions'))data=questions.map((q,i)=>({...q,correct_choice:i?'B':'A'}));
  else if(url.includes('/rpc/get_job_cbt_questions'))data=questions;
  else if(url.includes('/rpc/get_recruiter_interview_questions'))data=[{question_text:'Existing interview question'}];
  else if(url.includes('/rpc/save_job_cbt_draft')){attempt.draft_answers=JSON.parse(options.body).p_answers;sessionStorage.setItem('verification-exam-answers',JSON.stringify(attempt.draft_answers));data=null;}
  else if(url.includes('/rpc/start_job_cbt'))data=[attempt];
  else if(url.includes('/rpc/submit_job_cbt'))data=50;
  else if(url.includes('/rpc/is_organization_manager'))data=true;
  else if(url.includes('/job_cbt_attempts'))data=attempt;
  else if(url.includes('/job_applications'))data={id:applicationId,applicant_id:uid,job_posting_id:jobId,needs_reapply:false};
  else if(url.includes('/job_postings'))data=url.includes('organization_id=')?[job]:job;
  else if(url.includes('/organization_members'))data=[{role:'owner',organizations:org}];
  else if(url.includes('/organizations?'))data=url.includes('id=in')?[org]:org;
  else if(url.includes('/screening_questions'))data=[{id:'screening1',question_text:'Describe your experience',answer_type:'short_text',required:true}];
  else if(url.includes('/story_interactions')){
   if(method==='POST'){reaction={...JSON.parse(options.body),id:'reaction-fixture'};sessionStorage.setItem('verification-reaction',JSON.stringify(reaction));}
   if(method==='PATCH'){reaction={...reaction,...JSON.parse(options.body)};sessionStorage.setItem('verification-reaction',JSON.stringify(reaction));}
   if(method==='DELETE'){reaction=null;sessionStorage.removeItem('verification-reaction');}
   data=reaction?[reaction]:[];
  }
  else if(url.includes('/stories'))data=[{id:'story-fixture',author_id:other,story_type:'text',text_body:'Reaction test story',background_style:'midnight',audience:'public',created_at:new Date().toISOString(),expires_at:new Date(Date.now()+86400000).toISOString()}];
  else if(url.includes('/profiles'))data=[{id:other,full_name:'Story Author',avatar_url:null}];
  return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
 };
 supabase.auth.getSession=async()=>({data:{session:{user:{id:uid},access_token:'fixture-only'}},error:null});
 useAuth.setState({userId:uid,emailVerified:true,loading:false});
 return 'Isolated browser fixture ready';
})()
