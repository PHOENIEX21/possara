import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
export function useProfileOrganizations(profileId:string|undefined){
 return useQuery({queryKey:["profile-organizations",profileId],enabled:!!profileId,queryFn:async()=>{
  const {data:members,error}=await supabase.from("organization_members").select("organization_id,role").eq("user_id",profileId as string).eq("role","owner");
  if(error)throw error;if(!members?.length)return[];
  const {data:orgs,error:orgError}=await supabase.from("organizations").select("id,name,slug,logo_url,verified,industry,owner_id").in("id",members.map(m=>m.organization_id));
  if(orgError)throw orgError;
  const roleById=new Map(members.map(m=>[m.organization_id,m.role]));
  return (orgs??[]).filter(org=>org.owner_id===profileId).map(org=>({...org,member_role:roleById.get(org.id)??"owner"})).sort((a,b)=>{const ar=a.member_role==="owner"?0:a.member_role==="recruiter"?1:2;const br=b.member_role==="owner"?0:b.member_role==="recruiter"?1:2;return ar-br||a.name.localeCompare(b.name);});
 }});
}