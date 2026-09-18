import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import { useOwnProfile, useUpdateOwnProfile } from "../hooks/useProfile";
import { useAvatarUpload } from "../hooks/useAvatarUpload";
import { DEFAULT_SOCIAL_PRIVACY, useSocialPrivacy, useUpdateSocialPrivacy } from "../hooks/useSocialPrivacy";
import type { SocialPrivacy } from "../hooks/useSocialPrivacy";
import { InstallAppCard } from "../components/InstallAppCard";

function PrivacyToggle({label,description,checked,onChange,disabled}:{label:string;description:string;checked:boolean;onChange:(value:boolean)=>void;disabled?:boolean}){
  return <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-paper-dim bg-white p-4">
    <span><span className="block text-sm font-semibold text-ink">{label}</span><span className="mt-1 block text-xs leading-5 text-ink-light">{description}</span></span>
    <span className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${checked?"bg-brand":"bg-ink-faint/30"}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={e=>onChange(e.target.checked)} className="sr-only"/>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${checked?"left-[22px]":"left-0.5"}`}/>
    </span>
  </label>;
}

export function Settings(){
  const {email}=useAuth();
  const {data:profile}=useOwnProfile();
  const updateProfile=useUpdateOwnProfile();
  const avatarUpload=useAvatarUpload();
  const avatarInput=useRef<HTMLInputElement>(null);
  const {data:privacy}=useSocialPrivacy();
  const updatePrivacy=useUpdateSocialPrivacy();
  const [privacyDraft,setPrivacyDraft]=useState<SocialPrivacy>(DEFAULT_SOCIAL_PRIVACY);
  const [privacySuccess,setPrivacySuccess]=useState(false);
  const [privacyError,setPrivacyError]=useState<string|null>(null);
  const [photoSuccess,setPhotoSuccess]=useState(false);
  const [birthdayMonth,setBirthdayMonth]=useState("");
  const [birthdayDay,setBirthdayDay]=useState("");
  const [birthdayVisibility,setBirthdayVisibility]=useState<"everyone"|"followers"|"private">("followers");
  const [birthdaySuccess,setBirthdaySuccess]=useState(false);
  const [birthdayError,setBirthdayError]=useState<string|null>(null);
  const [currentPassword,setCurrentPassword]=useState("");
  const [newPassword,setNewPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
  const [error,setError]=useState<string|null>(null);
  const [success,setSuccess]=useState(false);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    if(!profile)return;
    setBirthdayMonth(profile.birthday_month?String(profile.birthday_month):"");
    setBirthdayDay(profile.birthday_day?String(profile.birthday_day):"");
    setBirthdayVisibility(profile.birthday_visibility??"followers");
  },[profile]);

  useEffect(()=>{if(privacy)setPrivacyDraft(privacy);},[privacy]);

  async function handlePhoto(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];
    if(!file)return;
    setPhotoSuccess(false);
    try{await avatarUpload.mutateAsync(file);setPhotoSuccess(true);}finally{e.target.value="";}
  }

  async function saveBirthday(e:React.FormEvent){
    e.preventDefault();
    setBirthdayError(null);setBirthdaySuccess(false);
    const month=birthdayMonth?Number(birthdayMonth):null;
    const day=birthdayDay?Number(birthdayDay):null;
    if((month===null)!==(day===null)){setBirthdayError("Choose both month and day, or leave both empty.");return;}
    if(month!==null&&(month<1||month>12)){setBirthdayError("Choose a valid month.");return;}
    if(day!==null&&(day<1||day>31)){setBirthdayError("Choose a valid day.");return;}
    try{
      await updateProfile.mutateAsync({birthday_month:month,birthday_day:day,birthday_visibility:birthdayVisibility});
      setBirthdaySuccess(true);
    }catch(err){setBirthdayError((err as Error).message);}
  }

  async function savePrivacy(){
    setPrivacyError(null);setPrivacySuccess(false);
    try{await updatePrivacy.mutateAsync(privacyDraft);setPrivacySuccess(true);}catch(err){setPrivacyError((err as Error).message);}
  }

  async function handleChangePassword(e:React.FormEvent){
    e.preventDefault();setError(null);setSuccess(false);
    if(newPassword!==confirmPassword){setError("New passwords don't match.");return;}
    if(newPassword.length<8){setError("New password must be at least 8 characters.");return;}
    if(!email){setError("Couldn't determine your account email.");return;}
    setLoading(true);
    const {error:verifyError}=await supabase.auth.signInWithPassword({email,password:currentPassword});
    if(verifyError){setLoading(false);setError("Current password is incorrect.");return;}
    const {error:updateError}=await supabase.auth.updateUser({password:newPassword});
    setLoading(false);
    if(updateError){setError(updateError.message);return;}
    setSuccess(true);setCurrentPassword("");setNewPassword("");setConfirmPassword("");
  }

  return <div className="max-w-prose pb-28 md:pb-10">
    <h1 className="text-2xl">Settings</h1>
    <p className="mt-1 text-ink-light">Account, privacy, notifications, preferences and security.</p>

    <section className="mt-8 border-t border-paper-dim pt-6">
      <h2 className="text-lg">Profile photo</h2>
      <div className="mt-4 flex items-center gap-4">
        {profile?.avatar_url?<img src={profile.avatar_url} alt="Your profile" className="h-20 w-20 rounded-full object-cover"/>:<div className="flex h-20 w-20 items-center justify-center rounded-full bg-trust-light text-2xl font-semibold text-trust-dark">{(profile?.full_name??"?").charAt(0).toUpperCase()}</div>}
        <div><button type="button" onClick={()=>avatarInput.current?.click()} disabled={avatarUpload.isPending} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Camera size={16}/>{avatarUpload.isPending?"Uploading…":"Change photo"}</button><input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} className="hidden"/><p className="mt-2 text-xs text-ink-faint">JPG, PNG or WebP · maximum 8 MB</p></div>
      </div>
      {avatarUpload.error&&<p className="mt-3 text-sm text-flag">{(avatarUpload.error as Error).message}</p>}
      {photoSuccess&&<p className="mt-3 text-sm text-trust-dark">Profile photo updated.</p>}
    </section>

    <section className="mt-8 border-t border-paper-dim pt-6">
      <h2 className="text-lg">Birthday</h2>
      <p className="mt-1 text-sm text-ink-light">Add your birthday without exposing your birth year. You control who can see it.</p>
      <form onSubmit={saveBirthday} className="mt-4 max-w-md space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-ink-light">Month<select value={birthdayMonth} onChange={e=>setBirthdayMonth(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"><option value="">Month</option>{["January","February","March","April","May","June","July","August","September","October","November","December"].map((name,index)=><option key={name} value={index+1}>{name}</option>)}</select></label>
          <label className="text-sm text-ink-light">Day<select value={birthdayDay} onChange={e=>setBirthdayDay(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"><option value="">Day</option>{Array.from({length:31},(_,i)=>i+1).map(day=><option key={day} value={day}>{day}</option>)}</select></label>
        </div>
        <label className="block text-sm text-ink-light">Who can see it?<select value={birthdayVisibility} onChange={e=>setBirthdayVisibility(e.target.value as "everyone"|"followers"|"private")} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"><option value="everyone">Everyone</option><option value="followers">Followers</option><option value="private">Only me</option></select></label>
        {birthdayError&&<p className="text-sm text-flag">{birthdayError}</p>}
        {birthdaySuccess&&<p className="text-sm text-trust-dark">Birthday settings saved.</p>}
        <button type="submit" disabled={updateProfile.isPending} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white disabled:opacity-50">{updateProfile.isPending?"Saving…":"Save birthday"}</button>
      </form>
    </section>

    <section className="mt-8 border-t border-paper-dim pt-6">
      <h2 className="text-lg">Social privacy</h2>
      <p className="mt-1 text-sm text-ink-light">Choose what other POSSARA members can see about your activity.</p>
      <div className="mt-4 space-y-2">
        <PrivacyToggle label="Show online status" description="Allow people you message to see when you are online or recently active." checked={privacyDraft.show_online_status} disabled={updatePrivacy.isPending} onChange={value=>{setPrivacySuccess(false);setPrivacyDraft(current=>({...current,show_online_status:value}));}}/>
        <PrivacyToggle label="Share read receipts" description="Allow senders to see Seen when you have opened their messages. Your unread badge will still clear normally." checked={privacyDraft.send_read_receipts} disabled={updatePrivacy.isPending} onChange={value=>{setPrivacySuccess(false);setPrivacyDraft(current=>({...current,send_read_receipts:value}));}}/>
        <PrivacyToggle label="Show my Moment views" description="Let a Moment owner see your name in their viewer list after you watch it." checked={privacyDraft.show_story_views} disabled={updatePrivacy.isPending} onChange={value=>{setPrivacySuccess(false);setPrivacyDraft(current=>({...current,show_story_views:value}));}}/>
      </div>
      {privacyError&&<p className="mt-3 text-sm text-flag">{privacyError}</p>}
      {privacySuccess&&<p className="mt-3 text-sm text-trust-dark">Privacy settings saved.</p>}
      <button type="button" onClick={savePrivacy} disabled={updatePrivacy.isPending} className="mt-4 rounded-full bg-ink px-5 py-2 text-sm font-medium text-white disabled:opacity-50">{updatePrivacy.isPending?"Saving…":"Save privacy"}</button>
    </section>

    <section className="mt-8 border-t border-paper-dim pt-6"><h2 className="text-lg">Account</h2><p className="mt-1 text-sm text-ink-light">Signed in as {email}</p></section>

    <InstallAppCard/>

    <section className="mt-8 border-t border-paper-dim pt-6">
      <h2 className="text-lg">Security</h2><p className="mt-1 text-sm text-ink-light">Changing your password requires your current password.</p>
      <form onSubmit={handleChangePassword} className="mt-4 max-w-sm space-y-4">{[["Current password",currentPassword,setCurrentPassword],["New password",newPassword,setNewPassword],["Confirm new password",confirmPassword,setConfirmPassword]].map(([label,value,setter],i)=><label key={label as string} className="block text-sm text-ink-light">{label as string}<input type="password" required minLength={i===0?1:8} value={value as string} onChange={e=>(setter as (v:string)=>void)(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>)}{error&&<p className="text-sm text-flag">{error}</p>}{success&&<p className="text-sm text-trust-dark">Password updated.</p>}<button type="submit" disabled={loading} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white disabled:opacity-50">{loading?"Updating…":"Update password"}</button></form>
    </section>
  </div>;
}
