// Install browser-fixture.js and groups-browser.js first; no real data is changed.
(()=>{
 const base=window.fetch;const {uid,other,orgId,jobId}=window.__fixture;const gid=window.__groups.gid;
 const organization={id:orgId,name:'Learning Together',slug:'learning-together',verified:true,verification_status:'verified'};
 const job={id:jobId,title:'Design opportunity',status:'open',description:'A helpful design role',location:'Remote',closes_at:new Date(Date.now()+86400000*3).toISOString()};
 let shared=[];window.__searchTools={requests:[],shared};
 window.fetch=async(input,options={})=>{const url=String(input);window.__searchTools.requests.push(url);let data;
  if(url.includes('/rpc/community_action')){const {action,payload}=JSON.parse(options.body);if(action==='share_opportunity'){shared.push({id:crypto.randomUUID(),group_id:gid,shared_by:uid,job_id:jobId,opportunity_id:null,note:payload.note,job,opportunity:null,profile:{full_name:'Verification Member'}});data={id:shared.at(-1).id};}else return base(input,options);}
  else if(url.includes('/community_opportunities?'))data=shared;
  else if(url.includes('/job_postings?')&&url.includes('or='))data=[job];
  else if(url.includes('/opportunities?'))data=[{id:'00000000-0000-4000-8000-000000000888',title:'Design scholarship',description:'Study design',status:'active',deadline:null,location:'Remote'}];
  else if(url.includes('/profiles?')&&url.includes('or='))data=[{id:other,full_name:'Ada Friend',username:'ada_friend',headline:'Design and community',profession:'Designer',avatar_url:null}];
  else if(url.includes('/organizations?')&&url.includes('or='))data=[organization];
  else if(url.includes('/posts?')&&url.includes('content=ilike'))data=[{id:'00000000-0000-4000-8000-000000000889',content:'Design something useful together',created_at:new Date().toISOString()}];
  else if(url.includes('/community_groups?')){const response=await base(input,options);let groups=await response.json();if(url.includes('id=eq.'))data={...groups,organization,organization_id:orgId};else data=(Array.isArray(groups)?groups:[groups]).map(group=>({...group,organization,organization_id:orgId}));}
  else if(url.includes('/community_messages?')&&url.includes('or=')&&!url.includes('pinned'))data=[{id:'00000000-0000-4000-8000-000000000778',body:'An older useful answer about design',file_name:'design-guide.pdf',kind:'chat',created_at:'2026-01-01T10:00:00Z'}];
  else return base(input,options);
  return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
 };
 window.__go('/');return 'Search and group tools fixtures ready';
})()
