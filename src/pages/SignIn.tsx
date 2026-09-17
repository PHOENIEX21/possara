import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import { BrandMark } from "../components/BrandMark";

export function SignIn(){
  const {isBanned,banReason}=useAuth();
  const queryClient=useQueryClient();
  const [mode,setMode]=useState<"signin"|"signup"|"forgot">("signin");
  const [fullName,setFullName]=useState("");
  const [username,setUsername]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState<string|null>(null);
  const [message,setMessage]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const navigate=useNavigate();

  async function handleSubmit(e:React.FormEvent){
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if(mode==="forgot"){
      const {error:resetError}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/reset-password`});
      setLoading(false);
      if(resetError){setError(resetError.message);return;}
      setMessage("Check your email for a secure reset link.");
      return;
    }

    if(mode==="signup"){
      const clean=username.trim().toLowerCase();
      if(password.length<8){setLoading(false);setError("Password must be at least 8 characters.");return;}
      if(!/^[a-z0-9_]{3,24}$/.test(clean)){setLoading(false);setError("Username must be 3–24 lowercase letters, numbers or underscores.");return;}
      const {data,error:authError}=await supabase.auth.signUp({email,password,options:{data:{full_name:fullName.trim()}}});
      if(authError){setLoading(false);setError(authError.message);return;}
      if(data.user){
        const {error:profileError}=await supabase.from("profiles").update({username:clean,full_name:fullName.trim()}).eq("id",data.user.id);
        if(profileError&&data.session){setLoading(false);setError(profileError.message);return;}
      }
      setLoading(false);
      setMessage(data.session?"Account created.":"Account created. Confirm your email when email delivery is enabled.");
      if(data.session){
        queryClient.clear();
        window.location.replace("/profile/me");
      }
      return;
    }

    const {data,error:authError}=await supabase.auth.signInWithPassword({email:email.trim(),password});
    setLoading(false);
    if(authError){setError(authError.message);return;}
    if(!data.session?.user){setError("Sign in did not return a valid session. Please try again.");return;}

    // A different POSSARA account may be signed in on this browser already.
    // Clear all user-scoped cached data, then reload from the newly persisted
    // Supabase session so no profile/feed/messages from the previous account linger.
    queryClient.clear();
    window.location.replace("/");
  }

  async function handleGoogle(){
    setError(null);
    const {error:oAuthError}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin}});
    if(oAuthError)setError(oAuthError.message);
  }

  return <div className="mx-auto max-w-sm rounded-3xl border border-black/[.06] bg-white p-6 shadow-card"><div className="mb-5 flex items-center gap-2"><BrandMark className="h-9 w-9"/><span className="font-bold">POSSARA</span></div>{isBanned&&<div className="mb-4 rounded-lg bg-flag-light px-4 py-3 text-sm text-flag-dark">Your account has been suspended{banReason?`: ${banReason}`:"."}</div>}<h1 className="text-2xl">{mode==="signin"?"Welcome back":mode==="signup"?"Create your account":"Reset your password"}</h1><p className="mt-1 text-sm text-ink-light">{mode==="signin"?"Sign in to continue your POSSARA journey.":mode==="signup"?"Build a profile, save opportunities and connect.":"Enter your email and we'll send a reset link."}</p><form onSubmit={handleSubmit} className="mt-6 space-y-4">{mode==="signup"&&<><label className="block text-sm text-ink-light">Full name<input required value={fullName} onChange={e=>setFullName(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label><label className="block text-sm text-ink-light">Username<input required value={username} onChange={e=>setUsername(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label></>}<label className="block text-sm text-ink-light">Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>{mode!=="forgot"&&<label className="block text-sm text-ink-light">Password{mode==="signin"&&<button type="button" onClick={()=>{setMode("forgot");setError(null)}} className="float-right text-xs text-brand-dark underline">Forgot password?</button>}<input type="password" required minLength={mode==="signup"?8:1} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==="signup"?"new-password":"current-password"} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>}{error&&<p className="text-sm text-flag">{error}</p>}{message&&<p className="text-sm text-trust-dark">{message}</p>}<button type="submit" disabled={loading} className="w-full rounded-full bg-ink py-2.5 font-medium text-white disabled:opacity-50">{loading?"Please wait…":mode==="signin"?"Sign in":mode==="signup"?"Create account":"Send reset link"}</button></form>{mode!=="forgot"&&<><div className="my-4 flex items-center gap-3 text-xs text-ink-faint"><div className="h-px flex-1 bg-paper-dim"/>or<div className="h-px flex-1 bg-paper-dim"/></div><button onClick={handleGoogle} className="w-full rounded-full border border-ink-faint/30 py-2.5 font-medium">Continue with Google</button></>}<p className="mt-6 text-center text-sm text-ink-light">{mode==="forgot"?<button onClick={()=>setMode("signin")} className="font-medium text-brand-dark underline">Back to sign in</button>:<>{mode==="signin"?"New here?":"Already have an account?"} <button onClick={()=>{setMode(mode==="signin"?"signup":"signin");setError(null);setMessage(null)}} className="font-medium text-brand-dark underline">{mode==="signin"?"Create an account":"Sign in"}</button></>}</p></div>;
}
