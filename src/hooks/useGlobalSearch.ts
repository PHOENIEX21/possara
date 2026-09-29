import {useQuery} from "@tanstack/react-query";
import {supabase} from "../lib/supabase";
import {searchFilter,searchPattern,searchTerm} from "../lib/search";
import {useAuth} from "../store/auth";
export type SearchKind='people'|'posts'|'jobs'|'opportunities'|'organizations'|'groups';
export type SearchItem={id:string;kind:SearchKind;title:string;description:string;path:string;avatar?:string|null;verified?:boolean};
export function useGlobalSearch(value:string){
 const {userId}=useAuth();const term=searchTerm(value);
 return useQuery({queryKey:['global-search',userId,term],enabled:term.length>=2,staleTime:30000,queryFn:async()=>{
  const now=new Date().toISOString();
  const tasks:PromiseLike<{items:SearchItem[];kind:SearchKind}>[]=[
   (async()=>{const {data,error}=await supabase.from('profiles').select('id,full_name,username,avatar_url,headline,profession').or(searchFilter(['full_name','username','headline','profession'],term.replace(/^@/,''))).limit(20);if(error)throw error;return {kind:'people' as const,items:data.map(p=>({id:p.id,kind:'people' as const,title:p.full_name||p.username||'Member',description:[p.username?`@${p.username}`:'',p.headline||p.profession].filter(Boolean).join(' · '),path:`/profile/id/${p.id}`,avatar:p.avatar_url}))};})(),
   (async()=>{const {data,error}=await supabase.from('posts').select('id,content,created_at').eq('status','published').eq('visibility','public').is('deleted_at',null).or('classification_status.is.null,classification_status.eq.accepted').ilike('content',searchPattern(term)).order('created_at',{ascending:false}).limit(20);if(error)throw error;return {kind:'posts' as const,items:data.map(p=>({id:p.id,kind:'posts' as const,title:p.content.slice(0,110)||'Post',description:p.content.slice(110,300),path:`/post/${p.id}`}))};})(),
   (async()=>{const {data,error}=await supabase.from('job_postings').select('id,title,location,description').eq('status','open').or(`closes_at.is.null,closes_at.gt.${now}`).or(searchFilter(['title','description','location'],term)).order('created_at',{ascending:false}).limit(20);if(error)throw error;return {kind:'jobs' as const,items:data.map(j=>({id:j.id,kind:'jobs' as const,title:j.title,description:j.location||j.description?.slice(0,160)||'',path:`/jobs/${j.id}`}))};})(),
   (async()=>{const {data,error}=await supabase.from('opportunities').select('id,title,description,location').eq('status','active').or(`deadline.is.null,deadline.gt.${now}`).or(searchFilter(['title','description','eligibility'],term)).order('created_at',{ascending:false}).limit(20);if(error)throw error;return {kind:'opportunities' as const,items:data.map(o=>({id:o.id,kind:'opportunities' as const,title:o.title,description:o.location||o.description?.slice(0,160)||'',path:`/opportunities/${o.id}`}))};})(),
   (async()=>{const {data,error}=await supabase.from('organizations').select('id,name,slug,description,logo_url,verified').or(searchFilter(['name','description'],term)).limit(20);if(error)throw error;return {kind:'organizations' as const,items:data.map(o=>({id:o.id,kind:'organizations' as const,title:o.name,description:o.description||'',path:`/organizations/${o.slug}`,avatar:o.logo_url,verified:o.verified}))};})(),
   (async()=>{if(!userId)return {kind:'groups' as const,items:[]};const {data,error}=await supabase.from('community_groups').select('id,name,description').or(searchFilter(['name','description'],term)).limit(20);if(error)throw error;return {kind:'groups' as const,items:data.map(g=>({id:g.id,kind:'groups' as const,title:g.name,description:g.description,path:`/groups/${g.id}`}))};})(),
  ];
  const results=await Promise.allSettled(tasks);const kinds:SearchKind[]=['people','posts','jobs','opportunities','organizations','groups'];
  return {items:results.flatMap(result=>result.status==='fulfilled'?result.value.items:[]),failed:results.flatMap((result,index)=>result.status==='rejected'?[kinds[index]]:[])};
 }});
}
