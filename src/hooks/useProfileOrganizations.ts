import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
export function useProfileOrganizations(profileId:string|undefined){
 return useQuery({queryKey:["profile-organizations",profileId],enabled:!!profileId,queryFn:async()=>{
  const {data:members,error}=await supabase.from("organization_members").select("organization_id,role").eq("user_id",profileId as string);
  if(error)throw error;if(!members?.length)return[];
  const {data:orgs,error:orgError}=await supabase.from("organizations").select("id,name,slug,logo_url,verified,industry").in("id",members.map(m=>m.organization_id));
  if(orgError)throw orgError;
  const roleById=new Map(members.map(m=>[m.organization_id,m.role]));
  return (orgs??[]).map(org=>({...org,member_role:roleById.get(org.id)??"member"}));
 }});
}