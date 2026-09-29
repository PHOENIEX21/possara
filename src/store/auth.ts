import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { UserRole } from "../types/database";

interface AuthState {
  userId:string|null;
  email:string|null;
  emailVerified:boolean;
  role:UserRole|null;
  isVerified:boolean;
  isBanned:boolean;
  banReason:string|null;
  loading:boolean;
  init:()=>()=>void;
  refreshEmailVerification:()=>Promise<boolean>;
  signOut:()=>Promise<void>;
}

export const useAuth=create<AuthState>((set,get)=>({
  userId:null,email:null,emailVerified:false,role:null,isVerified:false,isBanned:false,banReason:null,loading:true,
  init:()=>{
    let active=true;
    let authEventSeen=false;
    let hydrationVersion=0;
    let hydrationTimer:ReturnType<typeof setTimeout>|undefined;

    async function hydrateUser(user:{id:string;email?:string|null}|null){
      const version=++hydrationVersion;
      if(!active)return;
      if(!user){
        set({userId:null,email:null,emailVerified:false,role:null,isVerified:false,isBanned:false,banReason:null,loading:false});
        return;
      }

      // Returning from a native photo picker can emit SIGNED_IN again. Do not
      // unmount composers (and lose their File objects) for the same account.
      const refreshing=get().userId===user.id&&!get().loading;
      if(refreshing)set({email:user.email??null});
      else set({userId:user.id,email:user.email??null,emailVerified:false,role:null,isVerified:false,isBanned:false,banReason:null,loading:true});
      let accountState:unknown=null;
      let accountStateError:unknown=null;
      try {
        const result=await supabase.rpc("get_my_account_state");
        accountState=result.data;
        accountStateError=result.error;
      } catch(error) { accountStateError=error; }
      if(!active||version!==hydrationVersion)return;

      // A temporary network failure is not evidence that a verified user has
      // become unverified. Database policies still authorize every write.
      if(refreshing&&accountStateError)return;

      const accountRow=(Array.isArray(accountState)?accountState[0]:accountState) as {
        role?:UserRole|null;
        is_verified?:boolean|null;
        is_banned?:boolean|null;
        ban_reason?:string|null;
        email_verified_at?:string|null;
      }|null;
      const emailVerified=!accountStateError&&Boolean(accountRow?.email_verified_at);

      if(accountRow?.is_banned){
        set({isBanned:true,banReason:accountRow.ban_reason??null,role:accountRow.role??"user",isVerified:accountRow.is_verified??false,emailVerified,loading:false});
        await supabase.auth.signOut({scope:"local"});
        if(active&&version===hydrationVersion)set({userId:null,email:null,emailVerified:false,loading:false});
        return;
      }

      set({
        role:!accountStateError&&accountRow?.role?accountRow.role:"user",
        isVerified:!accountStateError&&(accountRow?.is_verified??false),
        emailVerified,
        isBanned:false,
        banReason:null,
        loading:false,
      });
    }

    const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{
      authEventSeen=true;
      clearTimeout(hydrationTimer);
      hydrationVersion+=1;
      if(!session?.user){void hydrateUser(null);return;}
      // Supabase calls listeners while holding its auth lock. Start requests
      // after the callback returns so RPC authentication cannot deadlock.
      hydrationTimer=setTimeout(()=>{void hydrateUser(session.user);},0);
    });
    void supabase.auth.getSession().then(({data})=>{
      if(!authEventSeen)void hydrateUser(data.session?.user??null);
    });

    return()=>{active=false;hydrationVersion+=1;clearTimeout(hydrationTimer);listener.subscription.unsubscribe();};
  },
  refreshEmailVerification:async()=>{
    const userId=get().userId;
    if(!userId){
      set({emailVerified:false});
      return false;
    }
    const {data,error}=await supabase.rpc("get_my_account_state");
    const row=(Array.isArray(data)?data[0]:data) as {email_verified_at?:string|null}|null;
    const verified=!error&&Boolean(row?.email_verified_at);
    set({emailVerified:verified});
    return verified;
  },
  signOut:async()=>{
    await supabase.auth.signOut({scope:"local"});
    set({userId:null,email:null,emailVerified:false,role:null,isVerified:false,isBanned:false,banReason:null,loading:false});
  },
}));
