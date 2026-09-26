import { Download } from "lucide-react";
import { installApp, useInstall } from "../store/install";

export function InstallAppButton({ className = "" }: { className?: string }) {
  const { event, installed, ios, busy } = useInstall();
  if (installed || (!event && !ios)) return null;
  return <button type="button" disabled={busy} onClick={() => ios ? useInstall.setState({ visible: true }) : void installApp()} className={className || "nav-row w-full"}><Download size={19}/>Install POSSARA</button>;
}
