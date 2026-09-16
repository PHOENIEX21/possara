import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { UserRole, UserRoleRow } from "../types/database";

interface AuthState {
  userId:string|null;
  email:string|null;
  role:UserRole|null;
  isVerified:boolean;
  isBanned:boolean;
  banReason:string|null;
  loading:boolean;
  init:()=>()=>void;
  signOut:()=>Promise<void>;
}

export const useAuth=create<AuthState>((set)=>({
  userId:null,email:null,role:null,isVerified:false,isBanned:false,banReason:null,loading:true,
  init:()=>{
    let active=true;

    async function hydrateUser(user:{id:string;email?:string|null}|null){
      if(!active)return;
      if(!user){
        set({userId:null,email:null,role:null,isVerified:false,isBanned:false,banReason:null,loading:false});
        return;
      }

      set({userId:user.id,email:user.email??null,role:null,isVerified:false,isBanned:false,banReason:null,loading:true});
      const {data,error}=await supabase
        .from("user_roles")
        .select("role,is_verified,is_banned,ban_reason")
        .eq("user_id",user.id)
        .single() as {data:Pick<UserRoleRow,"role"|"is_verified"|"is_banned"|"ban_reason">|null;error:unknown};
      if(!active)return;

      if(data?.is_banned){
        set({isBanned:true,banReason:data.ban_reason,role:data.role??"user",isVerified:data.is_verified??false,loading:false});
        await supabase.auth.signOut();
        if(active)set({userId:null,email:null,loading:false});
        return;
      }

      set({role:!error&&data?.role?data.role:"user",isVerified:!error&&(data?.is_verified??false),isBanned:false,banReason:null,loading:false});
    }

    void supabase.auth.getSession().then(({data})=>hydrateUser(data.session?.user??null));
    const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{void hydrateUser(session?.user??null);});
    return()=>{active=false;listener.subscription.unsubscribe();};
  },
  signOut:async()=>{
    await supabase.auth.signOut();
    set({userId:null,email:null,role:null,isVerified:false,isBanned:false,banReason:null,loading:false});
  },
}));
