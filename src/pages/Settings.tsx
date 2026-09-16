import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import { useOwnProfile } from "../hooks/useProfile";
import { useAvatarUpload } from "../hooks/useAvatarUpload";

export function Settings(){
  const {email}=useAuth();
  const {data:profile}=useOwnProfile();
  const avatarUpload=useAvatarUpload();
  const avatarInput=useRef<HTMLInputElement>(null);
  const [photoSuccess,setPhotoSuccess]=useState(false);
  const [currentPassword,setCurrentPassword]=useState("");
  const [newPassword,setNewPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
  const [error,setError]=useState<string|null>(null);
  const [success,setSuccess]=useState(false);
  const [loading,setLoading]=useState(false);

  async function handlePhoto(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];
    if(!file)return;
    setPhotoSuccess(false);
    try{await avatarUpload.mutateAsync(file);setPhotoSuccess(true);}finally{e.target.value="";}
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

  return <div className="max-w-prose pb-10">
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

    <section className="mt-8 border-t border-paper-dim pt-6"><h2 className="text-lg">Account</h2><p className="mt-1 text-sm text-ink-light">Signed in as {email}</p></section>

    <section className="mt-8 border-t border-paper-dim pt-6">
      <h2 className="text-lg">Security</h2><p className="mt-1 text-sm text-ink-light">Changing your password requires your current password.</p>
      <form onSubmit={handleChangePassword} className="mt-4 max-w-sm space-y-4">{[["Current password",currentPassword,setCurrentPassword],["New password",newPassword,setNewPassword],["Confirm new password",confirmPassword,setConfirmPassword]].map(([label,value,setter],i)=><label key={label as string} className="block text-sm text-ink-light">{label as string}<input type="password" required minLength={i===0?1:8} value={value as string} onChange={e=>(setter as (v:string)=>void)(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>)}{error&&<p className="text-sm text-flag">{error}</p>}{success&&<p className="text-sm text-trust-dark">Password updated.</p>}<button type="submit" disabled={loading} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white disabled:opacity-50">{loading?"Updating…":"Update password"}</button></form>
    </section>
  </div>;
}
