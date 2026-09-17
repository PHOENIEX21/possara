import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import { useFollowCounts } from "../hooks/useFollow";

type ConnectionTab = "followers" | "following" | "mutual";
type ConnectionProfile = { id:string; full_name:string|null; username:string|null; avatar_url:string|null; headline:string|null; profession:string|null; location:string|null };

async function profilesForIds(ids:string[]):Promise<ConnectionProfile[]> {
  if(!ids.length)return [];
  const {data,error}=await supabase.from("profiles").select("id,full_name,username,avatar_url,headline,profession,location").in("id",ids);
  if(error)throw error;
  const byId=new Map((data??[]).map(profile=>[profile.id,profile as ConnectionProfile]));
  return ids.map(id=>byId.get(id)).filter((profile):profile is ConnectionProfile=>!!profile);
}

function useConnectionList(profileId:string,tab:ConnectionTab,open:boolean){
  const {userId}=useAuth();
  return useQuery({
    queryKey:["profile-connections",profileId,tab,userId],
    enabled:open,
    queryFn:async():Promise<ConnectionProfile[]>=>{
      if(tab==="followers"){
        const {data,error}=await supabase.from("follows").select("follower_id").eq("following_id",profileId).order("created_at",{ascending:false});
        if(error)throw error;
        return profilesForIds((data??[]).map(row=>row.follower_id));
      }
      if(tab==="following"){
        const {data,error}=await supabase.from("follows").select("following_id").eq("follower_id",profileId).order("created_at",{ascending:false});
        if(error)throw error;
        return profilesForIds((data??[]).map(row=>row.following_id));
      }
      if(!userId||userId===profileId)return [];
      const [{data:mine,error:mineError},{data:theirs,error:theirError}]=await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id",userId),
        supabase.from("follows").select("following_id").eq("follower_id",profileId),
      ]);
      if(mineError)throw mineError;
      if(theirError)throw theirError;
      const mineSet=new Set((mine??[]).map(row=>row.following_id));
      const mutualIds=(theirs??[]).map(row=>row.following_id).filter(id=>mineSet.has(id)&&id!==userId&&id!==profileId);
      return profilesForIds(mutualIds);
    },
  });
}

function useMutualCount(profileId:string){
  const {userId}=useAuth();
  return useQuery({
    queryKey:["profile-mutual-count",userId,profileId],
    enabled:!!userId&&userId!==profileId,
    queryFn:async()=>{
      const [{data:mine,error:mineError},{data:theirs,error:theirError}]=await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id",userId as string),
        supabase.from("follows").select("following_id").eq("follower_id",profileId),
      ]);
      if(mineError)throw mineError;
      if(theirError)throw theirError;
      const mineSet=new Set((mine??[]).map(row=>row.following_id));
      return (theirs??[]).filter(row=>mineSet.has(row.following_id)&&row.following_id!==userId&&row.following_id!==profileId).length;
    },
  });
}

function connectionPath(profile:ConnectionProfile){return profile.username?`/profile/${profile.username}`:`/profile/id/${profile.id}`;}

export function ProfileConnections({profileId}:{profileId:string}){
  const {userId}=useAuth();
  const {data:counts}=useFollowCounts(profileId);
  const {data:mutualCount}=useMutualCount(profileId);
  const [tab,setTab]=useState<ConnectionTab|null>(null);
  const {data:people,isLoading,error}=useConnectionList(profileId,tab??"followers",!!tab);

  function open(next:ConnectionTab){setTab(next);}
  function close(){setTab(null);}

  return <>
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      <button type="button" onClick={()=>open("followers")} className="text-ink hover:underline"><strong className="font-semibold">{counts?.followers??0}</strong> <span className="text-ink-faint">{counts?.followers===1?"Follower":"Followers"}</span></button>
      <button type="button" onClick={()=>open("following")} className="text-ink hover:underline"><strong className="font-semibold">{counts?.following??0}</strong> <span className="text-ink-faint">Following</span></button>
      {!!userId&&userId!==profileId&&!!mutualCount&&mutualCount>0&&<button type="button" onClick={()=>open("mutual")} className="inline-flex items-center gap-1 text-xs font-medium text-brand-dark hover:underline"><Users size={13}/>{mutualCount} mutual {mutualCount===1?"connection":"connections"}</button>}
    </div>

    {tab&&<div className="fixed inset-0 z-[80] flex items-end bg-ink/45 sm:items-center sm:justify-center sm:p-4" onClick={close}>
      <div className="max-h-[78vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl" onClick={event=>event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${tab} connections`}>
        <div className="flex items-center justify-between border-b border-paper-dim px-4 py-3"><div><p className="text-xs font-semibold uppercase tracking-[.12em] text-brand-dark">Connections</p><h2 className="font-semibold">{tab==="followers"?"Followers":tab==="following"?"Following":"Mutual connections"}</h2></div><button type="button" onClick={close} className="rounded-full p-2 text-ink-light hover:bg-paper" aria-label="Close"><X size={18}/></button></div>
        <div className="max-h-[65vh] overflow-y-auto p-2">
          {isLoading&&<p className="p-4 text-sm text-ink-light">Loading people…</p>}
          {error&&<p className="p-4 text-sm text-flag">Couldn&apos;t load these connections.</p>}
          {!isLoading&&!error&&people?.length===0&&<div className="p-8 text-center text-sm text-ink-faint"><Users size={25} className="mx-auto mb-2"/>No people to show yet.</div>}
          {people?.map(person=>{const name=person.full_name??person.username??"POSSARA member";return <Link key={person.id} to={connectionPath(person)} onClick={close} className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-paper">{person.avatar_url?<img src={person.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover"/>:<div className="flex h-11 w-11 items-center justify-center rounded-full bg-trust-light text-sm font-semibold text-trust-dark">{name.charAt(0).toUpperCase()}</div>}<div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{name}</p>{person.username&&<p className="truncate text-xs text-ink-faint">@{person.username}</p>}<p className="truncate text-xs text-ink-light">{person.headline||person.profession||person.location||"POSSARA member"}</p></div></Link>})}
        </div>
      </div>
    </div>}
  </>;
}
