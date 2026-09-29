// Load after browser-fixture.js. Requests stay isolated from production.
(async()=>{
 const {supabase}=await import('/src/lib/supabase.ts');
 const authModule=performance.getEntriesByType('resource').map(entry=>entry.name).find(url=>url.includes('/src/store/auth.ts?t='))||'/src/store/auth.ts';
 const {useAuth}=await import(authModule);
 const uid=window.__fixture.uid;
 useAuth.setState({userId:uid,emailVerified:true,loading:false});
 supabase.auth.onAuthStateChange=callback=>{window.__resumeAuth=callback;return {data:{subscription:{unsubscribe(){}}}};};
 const stop=useAuth.getState().init();window.__stopResume=stop;
 const previous=window.fetch;
 window.fetch=async(input,options={})=>{
  const url=String(input);
  const response=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
  if(url.includes('/rpc/get_my_account_state'))return response({role:'user',email_verified_at:'2026-09-01',is_verified:false,is_banned:false});
  if(url.includes('/rpc/classify_home_post'))return response({aligned:true});
  if(url.includes('/storage/v1/object/')&&options.method==='POST')return response({Key:'test/selected.png'});
  if(url.includes('/posts')&&options.method==='POST'){window.__postedImagePost=JSON.parse(options.body);return response(null);}
  if(url.includes('/stories')&&options.method==='POST'){window.__postedImageMoments=JSON.parse(options.body);return response(window.__postedImageMoments);}
  return previous(input,options);
 };
 window.__selectPhoto=()=>{
  const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
  const transfer=new DataTransfer();transfer.items.add(new File([bytes],'selected.png',{type:'image/png'}));
  const input=document.querySelector('input[type=file][accept^="image/"]');
  input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 };
 window.__returnFromPicker=event=>window.__resumeAuth(event||'SIGNED_IN',{user:{id:uid,email:'fixture@example.test'}});
 window.__returnFromPicker();
 window.__go('/create/post');
 return 'Picker resume fixture ready';
})()
