import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
let counter=0;
async function load(path,deps){
 const key='__audit'+counter++;
 globalThis[key]=deps;
 const source=fs.readFileSync(path,'utf8').replace(/import\s+type\s+[\s\S]*?from\s+["'][^"']+["'];?/g,'').replace(/import\s+\{([\s\S]*?)\}\s+from\s+["'][^"']+["'];?/g,(_,names)=>`const {${names.replace(/\bas\b/g,':')}}=globalThis.${key};`);
 const js=ts.transpileModule(`const React=globalThis.${key}.React;\n`+source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.React}}).outputText;
 return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
}
const React={createElement:(type,props,...children)=>({type,props:props||{},children})};
const walk=node=>!node||typeof node!=='object'?[]:[node,...(node.children||[]).flat(Infinity).flatMap(walk)];
const text=node=>node===null||node===undefined||node===false?'':typeof node==='object'?(node.children||[]).flat(Infinity).map(text).join(''):String(node);
let term='',style='all',stateIndex=0;
const jobs=await load('src/pages/Jobs.tsx',{React,useMemo:fn=>fn(),useState:()=>[stateIndex++===0?term:style,()=>{}],useHiringJobs:()=>({data:[{id:'native',title:'Nurse',location:'Lagos',work_style:'Remote',description:'Care',organizations:{name:'Clinic'}}]}),useOpportunities:()=>({data:[]}),useFeedPosts:()=>({data:[]}),Link:'a'});
function renderJobs(q,w){term=q;style=w;stateIndex=0;return jobs.Jobs();}
let tree=renderJobs('nurse','remote');assert.match(text(tree),/1 live role/);assert.ok(walk(tree).some(n=>n.props.to==='/jobs/native'));assert.doesNotMatch(text(tree),/No matching live jobs/);
tree=renderJobs('Abuja','all');assert.match(text(tree),/No matching live jobs/);assert.ok(!walk(tree).some(n=>n.props.to==='/jobs/native'));
tree=renderJobs('','onsite');assert.match(text(tree),/0 live roles/);
let categoryError=new Error('Category unavailable'),categoryData=[],calls=[];
const supabase={from:table=>{calls.push(table);const chain=new Proxy({}, {get:(_,name)=>name==='then'?(resolve=>resolve({data:categoryData,error:categoryError})):(()=>chain)});return chain;}};
const opp=await load('src/hooks/useOpportunities.ts',{supabase,useQuery:x=>x});
await assert.rejects(opp.useOpportunities({categorySlug:'scholarships'}).queryFn(),/Category unavailable/);
categoryError=null;assert.deepEqual(await opp.useOpportunities({categorySlug:'missing'}).queryFn(),[]);assert.ok(!calls.includes('opportunities'));
categoryData=[{id:'scholarship'}];await opp.useOpportunities({categorySlug:'scholarships'}).queryFn();assert.ok(calls.includes('opportunities'));assert.equal(opp.useOpportunities().refetchInterval,15000);
let invalidated=[];
const hiring=await load('src/hooks/useHiring.ts',{useAuth:()=>({userId:'member'}),useQuery:x=>x,useMutation:x=>x,useQueryClient:()=>({invalidateQueries:({queryKey})=>{invalidated.push(queryKey);return Promise.resolve();}})});
hiring.useApplyToJob('job').onSuccess();assert.ok(invalidated.some(k=>k[0]==='my-job-application'&&k[1]==='job'));
invalidated=[];hiring.useSaveCbtQuestions('job').onSuccess();assert.ok(invalidated.some(k=>k[0]==='hiring-job'));
invalidated=[];hiring.useSubmitCbt('job','application').onSuccess();assert.ok(invalidated.some(k=>k[0]==='application-review'&&k[1]==='application'));
let route='first';const cbt=await load('src/pages/JobCbt.tsx',{React,useParams:()=>({id:route}),useAuth:()=>({userId:'member'})});const first=cbt.JobCbt();route='second';assert.notEqual(first.props.key,cbt.JobCbt().props.key);
let loading=true,loadError=null;
const builder=await load('src/pages/JobCbtBuilder.tsx',{React,useParams:()=>({id:'job'}),useAuth:()=>({userId:'member'}),useState:initial=>[initial,()=>{}],useHiringJob:()=>({data:{},isLoading:loading,error:loadError}),useRecruiterCbtQuestions:()=>({data:[],isLoading:loading}),useSaveCbtQuestions:()=>({}),useUpdateJob:()=>({}),usePersistentDraft:(_key,initial)=>[initial,()=>{},()=>{},'']});
assert.match(text(builder.JobCbtBuilder()),/Loading assessment setup/);loading=false;loadError=new Error('Denied');assert.match(text(builder.JobCbtBuilder()),/Assessment setup could not load/);assert.ok(!walk(builder.JobCbtBuilder()).some(n=>n.type==='form'));
console.log('PASS: job filters/counts, scholarship category failures, cache invalidation, CBT route isolation and builder loading/error gates');
