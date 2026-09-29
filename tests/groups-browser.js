// Load browser-fixture.js first. All changes below remain inside this browser.
(()=>{
 const {uid,other}=window.__fixture;
 const gid='00000000-0000-4000-8000-000000000777';
 const now=new Date().toISOString();
 const groups=[{id:gid,owner_id:uid,name:'Grow Together: Skills & Possibilities',description:'A welcoming place to find a study partner, get feedback and share what you know.',privacy:'public',approval_required:true,rules:'Be kind. Respect privacy. No spam.',last_message_at:now}];
 const members=[{group_id:gid,user_id:uid,role:'owner',status:'active',muted:false,last_read_at:'2025-01-01',profile:{full_name:'Verification Member'}},{group_id:gid,user_id:other,role:'member',status:'active',muted:false,last_read_at:now,profile:{full_name:'Alexandra With A Very Long Name That Must Stay Organized'}}];
 let messages=[{id:'00000000-0000-4000-8000-000000000778',group_id:gid,author_id:other,body:'Could someone review my portfolio? I am applying for my first design role and would appreciate some advice.',kind:'request',resolved:false,pinned:true,reply_to_id:null,file_path:null,file_name:null,created_at:now},{id:'00000000-0000-4000-8000-000000000779',group_id:gid,author_id:uid,body:'I can help with interview practice this weekend. Everyone is welcome.',kind:'offer',resolved:false,pinned:false,reply_to_id:null,file_path:null,file_name:null,created_at:now}];
 let reactions=[];const original=window.fetch;
 window.fetch=async(input,options={})=>{
  const url=String(input);let data;
  if(url.includes('/rpc/community_action')){
   const {action,gid:groupId,payload}=JSON.parse(options.body);window.__groups.actions.push({action,groupId,payload});data={id:groupId||gid};
   if(action==='create'){groups.push({...payload,id:gid,owner_id:uid});}
   if(action==='send'){messages.push({id:crypto.randomUUID(),group_id:gid,author_id:uid,...payload,resolved:false,pinned:false,created_at:new Date().toISOString()});}
   if(action==='resolve'){const msg=messages.find(m=>m.id===payload.message_id);msg.resolved=!msg.resolved;}
   if(action==='react'){reactions=[{message_id:payload.message_id,user_id:uid,reaction:payload.reaction}];}
   if(action==='preferences'&&'muted' in payload)members[0].muted=payload.muted;
   if(action==='invite')data.token='00000000-0000-4000-8000-000000000780';
  }else if(url.includes('/community_groups?'))data=url.includes('id=eq.')?groups[0]:groups;
  else if(url.includes('/community_members?'))data=url.includes('user_id=eq.')?[members[0]]:members;
  else if(url.includes('/community_messages?'))data=messages.slice().reverse();
  else if(url.includes('/community_reactions?'))data=reactions;
  else return original(input,options);
  return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
 };
 window.__groups={gid,actions:[],messages};window.__go('/groups');
 return 'Groups fixture installed';
})()
