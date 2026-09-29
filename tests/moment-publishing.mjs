import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
let source=fs.readFileSync('src/hooks/useStories.ts','utf8').replace(/^import .*;\r?\n/gm,'');
source='const {useMutation,useQueryClient,useAuth,supabase,resolveMusicTrack}=globalThis.__momentTest;\n'+source;
let saved=[],removed=[],scenario='success',invalidated=[];
const supabase={auth:{getSession:async()=>({data:{session:{}}})},storage:{from:()=>({upload:async(path)=>({data:{path}}),remove:async(paths)=>{removed.push(...paths);return {};}})},from:()=>({
 insert:rows=>({select:async()=>{saved=rows;return scenario==='success'?{data:rows,error:null}:{data:null,error:{message:'Network interrupted',code:''}};}}),
 select:()=>({in:async()=>scenario==='lost-response'?{data:saved,error:null}:{data:null,error:{message:'Offline'}}}),
 delete:()=>({in:()=>({eq:async()=>({})})})
})};
globalThis.__momentTest={useMutation:x=>x,useAuth:()=>({userId:'test-user'}),supabase,resolveMusicTrack:async()=>({}),useQueryClient:()=>({invalidateQueries:({queryKey})=>{invalidated.push(queryKey[0]);return new Promise(()=>{});}})};
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {usePostStory: createMutation}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const mutation=createMutation();
assert.equal((await mutation.mutationFn({textBody:'Test Moment'})).length,1);
assert.equal(saved[0].story_type,'text');
const image=new File(['image'],'photo.png',{type:'image/png'});
assert.equal((await mutation.mutationFn({imageFiles:[image,image],musicTrackKey:'library-track'})).length,2);
assert.notEqual(saved[0].id,saved[1].id);
assert.ok(saved.every(row=>row.music_track_key==='library-track'));
assert.equal(mutation.onSuccess(),undefined,'Completion must not await a stalled feed refresh');
assert.deepEqual(invalidated,['active-stories','my-stories']);
scenario='lost-response';
assert.equal((await mutation.mutationFn({imageFiles:[image]})).length,1,'Recover an insert whose response was lost');
scenario='offline';
await assert.rejects(mutation.mutationFn({imageFiles:[image]}),/could not confirm/);
assert.equal(removed.length,0,'Never remove files belonging to a possibly committed Moment');
console.log('Moment text/photo/music, stalled refresh and uncertain-response checks passed');
