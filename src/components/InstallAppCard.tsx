import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallAppCard() {
  const [promptEvent,setPromptEvent]=useState<InstallPromptEvent|null>(null);
  const [installed,setInstalled]=useState(false);

  useEffect(()=>{
    const standalone=window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as Navigator & {standalone?: boolean}).standalone));
    if(standalone)setInstalled(true);

    function beforeInstall(event:Event){
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    }
    function installedHandler(){setInstalled(true);setPromptEvent(null);}
    window.addEventListener("beforeinstallprompt",beforeInstall);
    window.addEventListener("appinstalled",installedHandler);
    return()=>{window.removeEventListener("beforeinstallprompt",beforeInstall);window.removeEventListener("appinstalled",installedHandler);};
  },[]);

  async function install(){
    if(!promptEvent)return;
    await promptEvent.prompt();
    const choice=await promptEvent.userChoice;
    if(choice.outcome==="accepted")setInstalled(true);
    setPromptEvent(null);
  }

  return <section className="mt-8 border-t border-paper-dim pt-6">
    <div className="flex items-start gap-3">
      <div className="rounded-2xl bg-brand-light p-3 text-brand-dark"><Smartphone size={20}/></div>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg">POSSARA app</h2>
        <p className="mt-1 text-sm leading-6 text-ink-light">Install POSSARA on your phone or computer for a standalone app experience and quicker access.</p>
        {installed ? <p className="mt-3 text-sm font-semibold text-trust-dark">POSSARA is installed on this device.</p> :
          promptEvent ? <button type="button" onClick={install} className="mt-3 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white"><Download size={16}/>Install POSSARA</button> :
          <p className="mt-3 text-xs leading-5 text-ink-faint">If your browser supports installation, use its “Install app” or “Add to Home screen” option. The install button appears here when the browser makes it available.</p>}
      </div>
    </div>
  </section>;
}
