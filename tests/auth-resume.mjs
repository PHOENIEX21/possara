import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {create} from 'zustand';
let listener,insideCallback=false,reply={data:{email_verified_at:'2026-09-01',role:'user'},error:null},calls=0;
const supabase={rpc:async()=>{assert.equal(insideCallback,false,'API calls must run outside the auth callback');calls++;return typeof reply==='function'?reply():reply;},auth:{
 onAuthStateChange:callback=>{listener=callback;return {data:{subscription:{unsubscribe(){}}}};},
 getSession:async()=>({data:{session:null}}),signOut:async()=>{}
}};
globalThis.__authResume={create,supabase};
const source=fs.readFileSync('src/store/auth.ts','utf8').replace(/^import .*;\r?\n/gm,'');
const js=ts.transpileModule('const {create,supabase}=globalThis.__authResume;\n'+source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {useAuth:store}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const stop=store.getState().init();
function emit(event,user={id:'member',email:'member@example.test'}) {insideCallback=true;try{listener(event,user?{user}:null);}finally{insideCallback=false;}}
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
emit('SIGNED_IN');await tick();
assert.equal(store.getState().emailVerified,true);
const changes=[];const unsubscribe=store.subscribe(state=>changes.push({...state}));
emit('SIGNED_IN');await tick();emit('TOKEN_REFRESHED');await tick();
assert.ok(changes.every(state=>!state.loading&&state.emailVerified),'Returning from a picker must never clear the composer or verification');
reply={data:null,error:{message:'Temporary network failure'}};
emit('SIGNED_IN');await tick();assert.equal(store.getState().emailVerified,true);assert.equal(store.getState().loading,false);
reply=()=>{throw Error('Offline');};emit('TOKEN_REFRESHED');await tick();assert.equal(store.getState().emailVerified,true);
let complete;reply=()=>new Promise(resolve=>{complete=resolve;});emit('TOKEN_REFRESHED');await tick();
emit('SIGNED_OUT',null);assert.equal(store.getState().userId,null);
complete({data:{email_verified_at:'2026-09-01',role:'admin'},error:null});await tick();
assert.equal(store.getState().userId,null);assert.equal(store.getState().role,null,'Stale refresh cannot restore signed-out privileges');
reply={data:{email_verified_at:'2026-09-01',role:'user'},error:null};
emit('SIGNED_IN',{id:'other',email:'other@example.test'});await tick();assert.equal(store.getState().userId,'other');
const before=calls;emit('SIGNED_IN');stop();await tick();assert.equal(calls,before,'Unmount cancels pending refresh');
unsubscribe();console.log('Auth resume, callback isolation, network failures, sign-out races and account switch passed');
