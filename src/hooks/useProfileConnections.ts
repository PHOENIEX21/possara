import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export type ConnectionPerson={id:string;full_name:string|null;username:string|null;avatar_url:string|null;headline:string|null;mutual_count?:number};

async function profiles(ids:string[]):Promise<ConnectionPerson[]>{
 if(!ids.length)return[];
 const {data,error}=await supabase.from("profiles").select("id,full_name,username,avatar_url,headline").in("id",ids);
 if(error)throw error;
 const map=new Map((data??[]).map(p=>[p.id,p]));
 return ids.map(id=>map.get(id)).filter(Boolean) as ConnectionPerson[];
}

export function useProfileConnections(profileId:string|undefined){
 const {userId}=useAuth();
 return useQuery({queryKey:["profile-connections",profileId,userId],enabled:!!profileId,queryFn:async()=>{
  const target=profileId as string;
  const [{data:followers,error:e1},{data:following,error:e2}]=await Promise.all([
   supabase.from("follows").select("follower_id").eq("following_id",target),
   supabase.from("follows").select("following_id").eq("follower_id",target)
  ]);
  if(e1)throw e1;if(e2)throw e2;
  const followerIds=(followers??[]).map(x=>x.follower_id);
  const followingIds=(following??[]).map(x=>x.following_id);
  let mutualIds:string[]=[];
  if(userId&&userId!==target){
   const {data:mine,error}=await supabase.from("follows").select("following_id").eq("follower_id",userId);
   if(error)throw error;
   const mineSet=new Set((mine??[]).map(x=>x.following_id));
   mutualIds=[...new Set([...followerIds,...followingIds].filter(id=>id!==userId&&mineSet.has(id)))];
  }
  const [followerProfiles,followingProfiles,mutualProfiles]=await Promise.all([profiles(followerIds),profiles(followingIds),profiles(mutualIds)]);
  return {followers:followerProfiles,following:followingProfiles,mutuals:mutualProfiles};
 }});
}
