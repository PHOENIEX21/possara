import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallAppButton({ className = "" }: { className?: string }) {
  const [promptEvent,setPromptEvent]=useState<BeforeInstallPromptEvent|null>(null);
  const [installed,setInstalled]=useState(false);

  useEffect(()=>{
    const standalone=window.matchMedia("(display-mode: standalone)").matches;
    setInstalled(standalone);
    const onPrompt=(event:Event)=>{
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled=()=>{setInstalled(true);setPromptEvent(null);};
    window.addEventListener("beforeinstallprompt",onPrompt);
    window.addEventListener("appinstalled",onInstalled);
    return()=>{
      window.removeEventListener("beforeinstallprompt",onPrompt);
      window.removeEventListener("appinstalled",onInstalled);
    };
  },[]);

  if(installed||!promptEvent)return null;

  return <button type="button" onClick={async()=>{await promptEvent.prompt();const choice=await promptEvent.userChoice;if(choice.outcome==="accepted")setPromptEvent(null);}} className={className}>
    <Download size={18}/>Install POSSARA
  </button>;
}
