import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallAppButton({ className = "" }: { className?: string }) {
  const [promptEvent,setPromptEvent]=useState<InstallPromptEvent|null>(null);
  const [installed,setInstalled]=useState(false);

  useEffect(()=>{
    const standalone=window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & {standalone?:boolean}).standalone === true;
    if(standalone)setInstalled(true);

    const before=(event:Event)=>{
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const done=()=>{setInstalled(true);setPromptEvent(null);};
    window.addEventListener("beforeinstallprompt",before);
    window.addEventListener("appinstalled",done);
    return()=>{window.removeEventListener("beforeinstallprompt",before);window.removeEventListener("appinstalled",done);};
  },[]);

  if(installed||!promptEvent)return null;

  async function install(){
    if(!promptEvent)return;
    await promptEvent.prompt();
    const choice=await promptEvent.userChoice;
    if(choice.outcome==="accepted")setPromptEvent(null);
  }

  return <button type="button" onClick={install} className={className || "nav-row w-full"}><Download size={19}/>Install POSSARA</button>;
}
