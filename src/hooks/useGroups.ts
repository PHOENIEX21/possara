import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export type Group = { organization_id?:string|null; organization?:{id:string;name:string;slug:string;verified:boolean;verification_status:string|null}|null; id:string; owner_id:string; name:string; description:string; privacy:"public"|"private"; approval_required:boolean; rules:string; last_message_at:string|null };
export type GroupMember = { group_id:string; user_id:string; role:"owner"|"admin"|"member"; status:"active"|"pending"|"banned"; muted:boolean; last_read_at:string; profile?:{full_name:string|null;username:string|null;avatar_url:string|null}|null };
export type GroupMessage = { id:string; group_id:string; author_id:string; body:string; kind:"chat"|"request"|"offer"; resolved:boolean; pinned:boolean; reply_to_id:string|null; file_path:string|null; file_name:string|null; created_at:string };
export type GroupReaction = {message_id:string;user_id:string;reaction:string};
export function useGroups() {
 const {userId}=useAuth();
 return useQuery({queryKey:["groups",userId],enabled:!!userId,refetchInterval:15000,queryFn:async()=>{
  const members=await supabase.from("community_members").select("*").eq("user_id",userId!);
  if(members.error)throw members.error;
  const ids=members.data.filter(m=>m.status!=="banned").map(m=>m.group_id);
  const [publicGroups,myGroups]=await Promise.all([
   supabase.from("community_groups").select("*, organization:organizations(id,name,slug,verified,verification_status)").eq("privacy","public").order("created_at",{ascending:false}).limit(100),
   ids.length?supabase.from("community_groups").select("*, organization:organizations(id,name,slug,verified,verification_status)").in("id",ids):Promise.resolve({data:[],error:null}),
  ]);
  if(publicGroups.error)throw publicGroups.error;if(myGroups.error)throw myGroups.error;
  return {groups:[...new Map([...publicGroups.data,...myGroups.data].map(g=>[g.id,g])).values()] as Group[],members:members.data as GroupMember[]};
 }});
}
export function useGroup(id:string|undefined, targetId?:string|null) {
 const {userId}=useAuth();
 return useQuery({queryKey:["groups",userId,id,targetId],enabled:!!userId&&!!id,refetchInterval:5000,queryFn:async()=>{
  const group=await supabase.from("community_groups").select("*, organization:organizations(id,name,slug,verified,verification_status)").eq("id",id!).maybeSingle();
  if(group.error)throw group.error;
  if(!group.data)return null;
  const members=await supabase.from("community_members").select("*, profile:profiles!community_members_user_id_fkey(full_name,username,avatar_url)").eq("group_id",id!);
  if(members.error)throw members.error;
  const active=members.data.some(m=>m.user_id===userId&&m.status==="active");
  const messages=active?await supabase.from("community_messages").select("*").eq("group_id",id!).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(100):{data:[],error:null};
  if(messages.error)throw messages.error;
  const extras=active?await supabase.from("community_messages").select("*").eq("group_id",id!).or(`pinned.eq.true${targetId&&/^[a-f0-9-]{36}$/i.test(targetId)?`,id.eq.${targetId}`:''}`).limit(100):{data:[],error:null};
  if(extras.error)throw extras.error;
  const combined=[...new Map([...messages.data,...extras.data].map(m=>[m.id,m])).values()];
  const ids=combined.map(m=>m.id);
  const reactions=ids.length?await supabase.from("community_reactions").select("*").in("message_id",ids):{data:[],error:null};
  if(reactions.error)throw reactions.error;
  return {group:group.data as Group,members:members.data as GroupMember[],messages:(combined as GroupMessage[]).sort((a,b)=>a.created_at.localeCompare(b.created_at)),reactions:reactions.data as GroupReaction[],oldest:messages.data.at(-1) as GroupMessage|undefined,hasOlder:messages.data.length===100};
 }});
}
export function useGroupAction() {
 const client=useQueryClient();
 return useMutation({mutationFn:async({action,gid,payload={}}:{action:string;gid?:string;payload?:Record<string,unknown>})=>{
  const {data,error}=await supabase.rpc("community_action",{action,gid:gid??null,payload});
  if(error)throw error;return data as {id?:string;token?:string;file_path?:string|null};
 },onSuccess:()=>client.invalidateQueries({queryKey:["groups"]})});
}
export const GROUP_FILE_ACCEPT="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,audio/webm,audio/ogg,audio/mpeg,audio/mp4";
export async function uploadGroupFile(groupId:string,userId:string,file:File) {
 if(file.size>10*1024*1024)throw new Error("Choose a file under 10 MB.");
 if(!GROUP_FILE_ACCEPT.split(",").includes(file.type))throw new Error("Choose a JPG, PNG, WebP, PDF, Word document or audio file.");
 const path=`${groupId}/${userId}/${crypto.randomUUID()}`;
 const {error}=await supabase.storage.from("community-files").upload(path,file,{contentType:file.type});
 if(error)throw error;return path;
}
export async function downloadGroupFile(path:string,name:string) {
 const {data,error}=await supabase.storage.from("community-files").download(path);
 if(error)throw error;
 const url=URL.createObjectURL(data);const link=document.createElement("a");link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
