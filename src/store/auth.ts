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

    async function hydrateUser(user:{id:string;email?:string|null}|null){
      const version=++hydrationVersion;
      if(!active)return;
      if(!user){
        set({userId:null,email:null,emailVerified:false,role:null,isVerified:false,isBanned:false,banReason:null,loading:false});
        return;
      }

      set({userId:user.id,email:user.email??null,emailVerified:false,role:null,isVerified:false,isBanned:false,banReason:null,loading:true});
      const {data:accountState,error:accountStateError}=await supabase.rpc("get_my_account_state");
      if(!active||version!==hydrationVersion)return;

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
      void hydrateUser(session?.user??null);
    });
    void supabase.auth.getSession().then(({data})=>{
      if(!authEventSeen)void hydrateUser(data.session?.user??null);
    });

    return()=>{active=false;hydrationVersion+=1;listener.subscription.unsubscribe();};
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
