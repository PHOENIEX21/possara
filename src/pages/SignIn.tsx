import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import { BrandMark } from "../components/BrandMark";

function friendlyAuthError(message:string){
  const value=message.toLowerCase();
  if(value.includes("error sending confirmation email")||value.includes("smtp")||value.includes("email rate limit"))return `POSSARA couldn't send the confirmation email right now. Technical detail: ${message}`;
  if(value.includes("user already registered"))return "An account already exists with this email. Sign in instead.";
  return message;
}

export function SignIn(){
  const {isBanned,banReason}=useAuth();
  const queryClient=useQueryClient();
  const [searchParams]=useSearchParams();
  const [mode,setMode]=useState<"signin"|"signup"|"forgot">(searchParams.get("mode")==="signup"?"signup":"signin");
  const [fullName,setFullName]=useState("");
  const [username,setUsername]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState<string|null>(null);
  const [message,setMessage]=useState<string|null>(searchParams.get("confirmed")==="1"?"Email confirmed. You can sign in now.":null);
  const [loading,setLoading]=useState(false);
  const [resending,setResending]=useState(false);
  const [pendingConfirmationEmail,setPendingConfirmationEmail]=useState<string|null>(null);

  const confirmationRedirect=`${window.location.origin}/signin?confirmed=1`;

  async function clearCurrentBrowserSession(){
    await supabase.auth.signOut({scope:"local"});
    queryClient.clear();
  }

  async function resendConfirmation(){
    const target=pendingConfirmationEmail??email.trim().toLowerCase();
    if(!target)return;
    setResending(true);setError(null);setMessage(null);
    const {error:resendError}=await supabase.auth.resend({type:"signup",email:target,options:{emailRedirectTo:confirmationRedirect}});
    setResending(false);
    if(resendError){setError(friendlyAuthError(resendError.message));return;}
    setMessage("Confirmation email sent. Check your inbox and spam folder.");
  }

  async function handleSubmit(e:React.FormEvent){
    e.preventDefault();
    setError(null);
    setMessage(null);
    setPendingConfirmationEmail(null);
    setLoading(true);

    if(mode==="forgot"){
      const {error:resetError}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:`${window.location.origin}/reset-password`});
      setLoading(false);
      if(resetError){setError(friendlyAuthError(resetError.message));return;}
      setMessage("Check your email for a secure reset link.");
      return;
    }

    if(mode==="signup"){
      const clean=username.trim().toLowerCase();
      const cleanEmail=email.trim().toLowerCase();
      if(password.length<8){setLoading(false);setError("Password must be at least 8 characters.");return;}
      if(!/^[a-z0-9_]{3,24}$/.test(clean)){setLoading(false);setError("Username must be 3–24 lowercase letters, numbers or underscores.");return;}
      await clearCurrentBrowserSession();
      const {data,error:authError}=await supabase.auth.signUp({email:cleanEmail,password,options:{data:{full_name:fullName.trim(),username:clean},emailRedirectTo:confirmationRedirect}});
      if(authError){
        setLoading(false);
        const friendly=friendlyAuthError(authError.message);
        setError(friendly);
        if(authError.message.toLowerCase().includes("email")||authError.message.toLowerCase().includes("smtp"))setPendingConfirmationEmail(cleanEmail);
        return;
      }
      if(data.user){
        const {error:profileError}=await supabase.from("profiles").update({username:clean,full_name:fullName.trim()}).eq("id",data.user.id);
        if(profileError&&data.session){setLoading(false);setError(profileError.message);return;}
      }
      setLoading(false);
      if(data.session){
        setMessage("Account created.");
        queryClient.clear();
        sessionStorage.removeItem("possara-signed-in-entry-seen");
        window.location.replace("/profile/me");
      }else{
        setPendingConfirmationEmail(cleanEmail);
        setMessage("Account created. Check your email to confirm your account.");
      }
      return;
    }

    const cleanEmail=email.trim().toLowerCase();
    await clearCurrentBrowserSession();
    const {data,error:authError}=await supabase.auth.signInWithPassword({email:cleanEmail,password});
    if(authError){setLoading(false);setError(friendlyAuthError(authError.message));return;}
    if(!data.session?.user||!data.user){setLoading(false);setError("Sign in did not return a valid session. Please try again.");return;}

    const {data:verified,error:verifyError}=await supabase.auth.getUser();
    const verifiedEmail=verified.user?.email?.trim().toLowerCase()??"";
    if(verifyError||!verified.user||verified.user.id!==data.user.id||verifiedEmail!==cleanEmail){
      await supabase.auth.signOut({scope:"local"});
      queryClient.clear();
      setLoading(false);
      setError("POSSARA could not verify the account switch. Please enter the account email and password again.");
      return;
    }

    queryClient.clear();
    sessionStorage.removeItem("possara-signed-in-entry-seen");
    setLoading(false);
    window.location.replace("/profile/me");
  }

  async function handleGoogle(){
    setError(null);
    await clearCurrentBrowserSession();
    sessionStorage.removeItem("possara-signed-in-entry-seen");
    const {error:oAuthError}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin}});
    if(oAuthError)setError(friendlyAuthError(oAuthError.message));
  }

  return <div className="mx-auto max-w-sm rounded-3xl border border-black/[.06] bg-white p-6 shadow-card"><div className="mb-5 flex items-center gap-2"><BrandMark className="h-9 w-9"/><span className="font-bold">POSSARA</span></div>{isBanned&&<div className="mb-4 rounded-lg bg-flag-light px-4 py-3 text-sm text-flag-dark">Your account has been suspended{banReason?`: ${banReason}`:"."}</div>}<h1 className="text-2xl">{mode==="signin"?"Welcome back":mode==="signup"?"Create your account":"Reset your password"}</h1><p className="mt-1 text-sm text-ink-light">{mode==="signin"?"Sign in to continue your POSSARA journey.":mode==="signup"?"Build a profile, save opportunities and connect.":"Enter your email and we'll send a reset link."}</p><form onSubmit={handleSubmit} className="mt-6 space-y-4">{mode==="signup"&&<><label className="block text-sm text-ink-light">Full name<input required value={fullName} onChange={e=>setFullName(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label><label className="block text-sm text-ink-light">Username<input required value={username} onChange={e=>setUsername(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label></>}<label className="block text-sm text-ink-light">Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>{mode!=="forgot"&&<label className="block text-sm text-ink-light">Password{mode==="signin"&&<button type="button" onClick={()=>{setMode("forgot");setError(null)}} className="float-right text-xs text-brand-dark underline">Forgot password?</button>}<input type="password" required minLength={mode==="signup"?8:1} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==="signup"?"new-password":"current-password"} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>}{error&&<p className="text-sm text-flag">{error}</p>}{message&&<p className="text-sm text-trust-dark">{message}</p>}{pendingConfirmationEmail&&<button type="button" onClick={resendConfirmation} disabled={resending} className="w-full rounded-full border border-ink-faint/30 py-2 text-sm font-medium disabled:opacity-50">{resending?"Sending…":"Resend confirmation email"}</button>}<button type="submit" disabled={loading} className="w-full rounded-full bg-ink py-2.5 font-medium text-white disabled:opacity-50">{loading?"Please wait…":mode==="signin"?"Sign in":mode==="signup"?"Create account":"Send reset link"}</button></form>{mode!=="forgot"&&<><div className="my-4 flex items-center gap-3 text-xs text-ink-faint"><div className="h-px flex-1 bg-paper-dim"/>or<div className="h-px flex-1 bg-paper-dim"/></div><button onClick={handleGoogle} className="w-full rounded-full border border-ink-faint/30 py-2.5 font-medium">Continue with Google</button></>}<p className="mt-6 text-center text-sm text-ink-light">{mode==="forgot"?<button onClick={()=>setMode("signin")} className="font-medium text-brand-dark underline">Back to sign in</button>:<>{mode==="signin"?"New here?":"Already have an account?"} <button onClick={()=>{setMode(mode==="signin"?"signup":"signin");setError(null);setMessage(null);setPendingConfirmationEmail(null)}} className="font-medium text-brand-dark underline">{mode==="signin"?"Create an account":"Sign in"}</button></>}</p></div>;
}
