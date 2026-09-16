import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Camera, MessageCircle, Pencil, UserCheck, UserPlus } from "lucide-react";
import { useAuth } from "../store/auth";
import { useProfileByUsername, useOwnProfile, useUpdateOwnProfile } from "../hooks/useProfile";
import { useFollowStatus, useToggleFollow, useFollowCounts } from "../hooks/useFollow";
import { useOpportunityCategories } from "../components/CategoryChips";
import { useAvatarUpload } from "../hooks/useAvatarUpload";
import type { Profile as ProfileType } from "../types/database";

function FollowButton({targetUserId}:{targetUserId:string}){
  const {userId}=useAuth();
  const {data:isFollowing}=useFollowStatus(targetUserId);
  const toggle=useToggleFollow(targetUserId);
  if(!userId||userId===targetUserId)return null;
  return <button onClick={()=>toggle.mutate(!!isFollowing)} disabled={toggle.isPending} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium ${isFollowing?"border border-ink-faint/30 text-ink-light":"bg-ink text-white"}`}>{isFollowing?<UserCheck size={15}/>:<UserPlus size={15}/>} {isFollowing?"Following":"Follow"}</button>;
}

function MessageButton({targetUserId}:{targetUserId:string}){
  const {userId}=useAuth();
  const navigate=useNavigate();
  if(!userId||userId===targetUserId)return null;
  return <button onClick={()=>navigate(`/messages/${targetUserId}`)} className="inline-flex items-center gap-1.5 rounded-full border border-ink-faint/30 px-4 py-1.5 text-sm font-medium"><MessageCircle size={15}/>Message</button>;
}

function ProfileView({profile,own,onEdit}:{profile:ProfileType;own?:boolean;onEdit?:()=>void}){
  const {data:counts}=useFollowCounts(profile.id);
  return <div className="max-w-2xl overflow-hidden rounded-3xl border border-black/[.06] bg-white shadow-card">
    <div className="h-28 bg-paper-dim">{profile.cover_url&&<img src={profile.cover_url} alt="" className="h-full w-full object-cover"/>}</div>
    <div className="px-5 pb-6">
      <div className="-mt-10 flex items-end justify-between gap-3">
        <div>{profile.avatar_url?<img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-full border-4 border-white object-cover"/>:<div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-trust-light text-2xl text-trust-dark">{(profile.full_name??"?").charAt(0).toUpperCase()}</div>}</div>
        <div className="flex gap-2">{own&&onEdit?<button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-full border border-ink-faint/30 px-4 py-2 text-sm font-medium"><Pencil size={14}/>Edit profile</button>:<><MessageButton targetUserId={profile.id}/><FollowButton targetUserId={profile.id}/></>}</div>
      </div>
      <h1 className="mt-3 text-2xl">{profile.full_name??"Member"}</h1>
      {profile.username&&<p className="text-sm text-ink-faint">@{profile.username}</p>}
      {(profile.headline||profile.profession)&&<p className="mt-2 font-medium text-ink-light">{profile.headline||profile.profession}</p>}
      <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-ink-faint">{profile.workplace&&<span>{profile.workplace}</span>}{profile.school&&<span>{profile.school}</span>}{profile.location&&<span>{profile.location}</span>}{profile.country&&<span>{profile.country}</span>}</div>
      {counts&&<p className="mt-2 text-sm text-ink-faint">{counts.followers} followers · {counts.following} following</p>}
      {profile.bio&&<p className="mt-4 whitespace-pre-line text-[15px] leading-6 text-ink-light">{profile.bio}</p>}
      {profile.skills?.length>0&&<div className="mt-5"><h2 className="text-sm font-medium">Skills</h2><div className="mt-2 flex flex-wrap gap-1.5">{profile.skills.map(s=><span key={s} className="rounded-full bg-paper-dim px-2.5 py-1 text-xs text-ink-light">{s}</span>)}</div></div>}
    </div>
  </div>;
}

function EditOwnProfile({onDone}:{onDone:()=>void}){
  const {data:profile}=useOwnProfile();
  const update=useUpdateOwnProfile();
  const avatarUpload=useAvatarUpload();
  const fileRef=useRef<HTMLInputElement>(null);
  const {data:categories}=useOpportunityCategories();
  const [fullName,setFullName]=useState("");
  const [username,setUsername]=useState("");
  const [headline,setHeadline]=useState("");
  const [profession,setProfession]=useState("");
  const [workplace,setWorkplace]=useState("");
  const [school,setSchool]=useState("");
  const [bio,setBio]=useState("");
  const [location,setLocation]=useState("");
  const [country,setCountry]=useState("");
  const [skillsInput,setSkillsInput]=useState("");
  const [goals,setGoals]=useState<string[]>([]);
  const [error,setError]=useState<string|null>(null);
  const [photoSuccess,setPhotoSuccess]=useState(false);

  useEffect(()=>{
    if(!profile)return;
    setFullName(profile.full_name??"");setUsername(profile.username??"");setHeadline(profile.headline??"");setProfession(profile.profession??"");setWorkplace(profile.workplace??"");setSchool(profile.school??"");setBio(profile.bio??"");setLocation(profile.location??"");setCountry(profile.country??"");setSkillsInput((profile.skills??[]).join(", "));setGoals(profile.goal_categories??[]);
  },[profile]);

  async function uploadAvatar(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];
    if(!file)return;
    setError(null);setPhotoSuccess(false);
    try{await avatarUpload.mutateAsync(file);setPhotoSuccess(true);}catch(err){setError((err as Error).message);}finally{e.target.value="";}
  }

  async function submit(e:React.FormEvent){
    e.preventDefault();setError(null);
    const clean=username.trim().toLowerCase();
    if(clean&&!/^[a-z0-9_]{3,24}$/.test(clean)){setError("Username must be 3–24 lowercase letters, numbers or underscores.");return;}
    try{
      await update.mutateAsync({full_name:fullName||null,username:clean||null,headline:headline||null,profession:profession||null,workplace:workplace||null,school:school||null,bio:bio||null,location:location||null,country:country||null,skills:skillsInput.split(",").map(s=>s.trim()).filter(Boolean),goal_categories:goals});
      onDone();
    }catch(err){setError((err as Error).message);}
  }

  return <form onSubmit={submit} className="max-w-2xl space-y-4 rounded-3xl bg-white p-5 shadow-card">
    <div className="flex items-center justify-between"><h1 className="text-xl">Edit profile</h1><button type="button" onClick={onDone} className="text-sm text-ink-light">Cancel</button></div>
    <div className="flex items-center gap-4 rounded-2xl bg-paper-dim p-3">
      {profile?.avatar_url?<img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover"/>:<div className="flex h-16 w-16 items-center justify-center rounded-full bg-trust-light text-xl text-trust-dark">{(profile?.full_name??"?").charAt(0).toUpperCase()}</div>}
      <div><button type="button" onClick={()=>fileRef.current?.click()} disabled={avatarUpload.isPending} className="inline-flex items-center gap-2 rounded-full border border-ink-faint/30 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"><Camera size={15}/>{avatarUpload.isPending?"Uploading…":"Change profile photo"}</button><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} className="hidden"/><p className="mt-1 text-xs text-ink-faint">JPG, PNG or WebP · max 8 MB</p></div>
    </div>
    {photoSuccess&&<p className="text-sm text-trust-dark">Profile photo updated.</p>}
    <div className="grid gap-3 sm:grid-cols-2">{[["Full name",fullName,setFullName],["Username",username,setUsername],["Headline",headline,setHeadline],["Profession / field",profession,setProfession],["Workplace",workplace,setWorkplace],["School",school,setSchool],["Location",location,setLocation],["Country",country,setCountry]].map(([label,value,setter])=><label key={label as string} className="text-sm text-ink-light">{label as string}<input value={value as string} onChange={e=>(setter as (v:string)=>void)(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>)}</div>
    <label className="block text-sm text-ink-light">About<textarea rows={4} value={bio} onChange={e=>setBio(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>
    <label className="block text-sm text-ink-light">Skills, comma-separated<input value={skillsInput} onChange={e=>setSkillsInput(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>
    <div><p className="text-sm text-ink-light">Opportunity interests</p><div className="mt-2 flex flex-wrap gap-2">{categories?.map(c=><button key={c.id} type="button" onClick={()=>setGoals(g=>g.includes(c.slug)?g.filter(x=>x!==c.slug):[...g,c.slug])} className={`rounded-full border px-3 py-1.5 text-sm ${goals.includes(c.slug)?"border-brand bg-brand-light text-brand-dark":"border-ink-faint/30 text-ink-light"}`}>{c.name}</button>)}</div></div>
    {error&&<p className="text-sm text-flag">{error}</p>}
    <button disabled={update.isPending||avatarUpload.isPending} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white disabled:opacity-50">{update.isPending?"Saving…":"Save profile"}</button>
  </form>;
}

export function Profile(){
  const {username}=useParams<{username:string}>();
  const {userId}=useAuth();
  const {data:ownProfile,isLoading}=useOwnProfile();
  const [editing,setEditing]=useState(false);
  const isOwn=username==="me"||!!(ownProfile?.username&&username===ownProfile.username);
  if(isOwn){if(!userId)return <p className="text-ink-light">Sign in to view your profile.</p>;if(isLoading||!ownProfile)return <p className="text-ink-light">Loading…</p>;return editing?<EditOwnProfile onDone={()=>setEditing(false)}/>:<div className="space-y-4"><ProfileView profile={ownProfile} own onEdit={()=>setEditing(true)}/><Link to="/settings" className="inline-block text-sm text-brand-dark underline">Privacy, notifications & account settings</Link></div>;}
  if(username)return <PublicProfile username={username}/>;
  return <p className="text-ink-light">No profile specified.</p>;
}

function PublicProfile({username}:{username:string}){
  const {data:profile,isLoading,error}=useProfileByUsername(username);
  if(isLoading)return <p className="text-ink-light">Loading…</p>;
  if(error||!profile)return <p className="text-flag">This profile couldn't be found.</p>;
  return <ProfileView profile={profile}/>;
}
