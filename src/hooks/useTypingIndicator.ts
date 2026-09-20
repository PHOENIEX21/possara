import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export function useTypingIndicator(otherUserId:string|undefined){
 const {userId}=useAuth(); const [otherTyping,setOtherTyping]=useState(false); const channelRef=useRef<any>(null); const clearRef=useRef<number|undefined>();
 useEffect(()=>{if(!userId||!otherUserId)return;const key=[userId,otherUserId].sort().join(":");const channel=supabase.channel("typing:"+key,{config:{broadcast:{self:false}}});channel.on("broadcast",{event:"typing"},({payload}:any)=>{if(payload?.userId!==otherUserId)return;setOtherTyping(!!payload.typing);if(clearRef.current)window.clearTimeout(clearRef.current);if(payload.typing)clearRef.current=window.setTimeout(()=>setOtherTyping(false),3000);}).subscribe();channelRef.current=channel;return()=>{if(clearRef.current)window.clearTimeout(clearRef.current);channelRef.current=null;void supabase.removeChannel(channel);};},[userId,otherUserId]);
 const broadcast=useCallback((typing:boolean)=>{if(!userId||!channelRef.current)return;void channelRef.current.send({type:"broadcast",event:"typing",payload:{userId,typing}});},[userId]);
 return {otherTyping,broadcast};
}
