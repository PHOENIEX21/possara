import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export function useOrganizationFollow(organizationId:string|undefined){
 const {userId}=useAuth();
 return useQuery({queryKey:["organization-follow",organizationId,userId],enabled:!!organizationId,queryFn:async()=>{
  const {count,error:countError}=await supabase.from("organization_follows").select("*",{count:"exact",head:true}).eq("organization_id",organizationId as string);
  if(countError)throw countError;
  if(!userId)return {followers:count??0,following:false};
  const {data,error:mineError}=await supabase.from("organization_follows").select("organization_id").eq("organization_id",organizationId as string).eq("user_id",userId).maybeSingle();
  if(mineError)throw mineError;
  return {followers:count??0,following:!!data};
 }});
}
export function useToggleOrganizationFollow(organizationId:string){
 const {userId}=useAuth();const qc=useQueryClient();
 return useMutation({mutationFn:async(following:boolean)=>{
  if(!userId)throw new Error("Sign in to follow organizations.");
  if(following){const {error}=await supabase.from("organization_follows").delete().eq("organization_id",organizationId).eq("user_id",userId);if(error)throw error;}
  else{const {error}=await supabase.from("organization_follows").insert({organization_id:organizationId,user_id:userId});if(error)throw error;}
 },onSuccess:()=>qc.invalidateQueries({queryKey:["organization-follow",organizationId]})});
}