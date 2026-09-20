import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

type VerificationResponse = {
  ok?: boolean;
  verified?: boolean;
  email?: string;
  deliveryConfigured?: boolean;
  error?: string;
  resendAvailableAt?: string | null;
  retryAfterSeconds?: number;
};

export function VerifyEmail() {
  const { userId, email, emailVerified, loading: authLoading, refreshEmailVerification, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [code,setCode]=useState("");
  const [busy,setBusy]=useState(false);
  const [statusLoading,setStatusLoading]=useState(true);
  const [deliveryConfigured,setDeliveryConfigured]=useState<boolean|null>(null);
  const [resendAvailableAt,setResendAvailableAt]=useState<string|null>(null);
  const [message,setMessage]=useState<string|null>(
    searchParams.get("sent")==="1"
      ? "We sent a 6-digit verification code to your email."
      : searchParams.get("delivery")==="retry"
        ? "Your account was created safely, but the first verification email could not be delivered. Request a new code below."
        : null,
  );
  const [error,setError]=useState<string|null>(null);

  const resendWait=useMemo(()=>{
    if(!resendAvailableAt)return 0;
    return Math.max(0,Math.ceil((new Date(resendAvailableAt).getTime()-Date.now())/1000));
  },[resendAvailableAt,statusLoading,busy]);

  useEffect(()=>{
    if(!userId)return;
    let active=true;
    void supabase.functions.invoke("email-verification",{body:{action:"status"}}).then(({data,error:invokeError})=>{
      if(!active)return;
      const result=data as VerificationResponse|null;
      if(invokeError){
        setError("POSSARA could not check email verification right now. Please try again.");
      }else{
        setDeliveryConfigured(result?.deliveryConfigured??null);
        setResendAvailableAt(result?.resendAvailableAt??null);
        if(result?.verified){
          void refreshEmailVerification().then(()=>navigate("/profile/me",{replace:true}));
        }
      }
      setStatusLoading(false);
    });
    return()=>{active=false;};
  },[userId,navigate,refreshEmailVerification]);

  if(authLoading)return <div className="text-ink-light">Loading…</div>;
  if(!userId)return <Navigate to="/signin" replace/>;
  if(emailVerified)return <Navigate to="/profile/me" replace/>;

  async function verify(e:React.FormEvent){
    e.preventDefault();
    setBusy(true);setError(null);setMessage(null);
    const clean=code.replace(/\D/g,"").slice(0,6);
    const {data,error:invokeError}=await supabase.functions.invoke("email-verification",{body:{action:"verify",code:clean}});
    const result=data as VerificationResponse|null;
    setBusy(false);
    if(invokeError||!result?.ok||!result.verified){
      setError(result?.error??"That code could not be verified. Please try again.");
      return;
    }
    const verified=await refreshEmailVerification();
    if(!verified){
      setError("Your email was verified, but POSSARA could not refresh your account. Please reload.");
      return;
    }
    sessionStorage.setItem("possara-transition","signup");
    window.location.replace("/profile/me");
  }

  async function resend(){
    setBusy(true);setError(null);setMessage(null);
    const {data,error:invokeError}=await supabase.functions.invoke("email-verification",{body:{action:"resend"}});
    const result=data as VerificationResponse|null;
    setBusy(false);
    if(invokeError||!result?.ok){
      setError(result?.error??"POSSARA could not send a new code right now. Your account remains safe.");
      return;
    }
    setResendAvailableAt(result?.resendAvailableAt??null);
    setMessage("A fresh verification code has been sent. It expires in 15 minutes.");
  }

  async function useAnotherAccount(){
    await signOut();
    window.location.replace("/signin");
  }

  return <div className="mx-auto max-w-sm rounded-3xl border border-black/[.06] bg-white p-6 shadow-card">
    <div className="mb-5 flex items-center gap-2"><BrandMark className="h-9 w-9"/><span className="font-bold">POSSARA</span></div>
    <h1 className="text-2xl">Verify your email</h1>
    <p className="mt-2 text-sm leading-6 text-ink-light">
      Enter the 6-digit code sent to <span className="font-medium text-ink">{email}</span>. This confirms that the email belongs to you.
    </p>

    {deliveryConfigured===false&&<div className="mt-4 rounded-xl bg-flag-light px-4 py-3 text-sm text-flag-dark">
      Email delivery is not configured on the server yet. Your account is safe and has not been deleted.
    </div>}
    {message&&<p className="mt-4 text-sm text-trust-dark">{message}</p>}
    {error&&<p className="mt-4 text-sm text-flag">{error}</p>}

    <form onSubmit={verify} className="mt-6 space-y-4">
      <label className="block text-sm text-ink-light">Verification code
        <input
          value={code}
          onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          placeholder="000000"
          className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-3 text-center text-xl tracking-[.3em] text-ink outline-none focus:border-brand"
        />
      </label>
      <button type="submit" disabled={busy||code.length!==6} className="w-full rounded-full bg-ink py-2.5 font-medium text-white disabled:opacity-50">
        {busy?"Please wait…":"Verify email"}
      </button>
    </form>

    <div className="mt-4 flex flex-col gap-2 text-center text-sm">
      <button type="button" onClick={resend} disabled={busy||statusLoading||resendWait>0} className="font-medium text-brand-dark underline disabled:opacity-50">
        {resendWait>0?`Send another code in ${resendWait}s`:"Send another code"}
      </button>
      <button type="button" onClick={useAnotherAccount} className="text-ink-light underline">Use another account</button>
    </div>
  </div>;
}
