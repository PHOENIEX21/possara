import { Download, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { dismissInstall, installApp, markInstalled, useInstall } from "../store/install";
import { BrandMark } from "./BrandMark";

export function InstallAppPrompt() {
  const { event, installed, visible, ios, busy, error } = useInstall();
  const { pathname } = useLocation();
  if (installed || !visible || (!event && !ios && !error) || pathname.startsWith("/create/") || pathname.endsWith("/cbt")) return null;
  return <aside aria-label="Install POSSARA" className="fixed bottom-24 left-3 right-3 z-[55] rounded-2xl border border-brand/20 bg-white p-4 shadow-xl sm:bottom-5 sm:left-auto sm:right-5 sm:w-96">
    <div className="flex items-start gap-3"><BrandMark className="h-11 w-10 shrink-0"/><div className="min-w-0 flex-1"><h2 className="font-bold">Take POSSARA with you</h2><p className="mt-1 text-sm text-ink-light">Add POSSARA to your home screen for quick access.</p></div><button type="button" aria-label="Dismiss install prompt" onClick={dismissInstall} className="rounded-full p-1.5 hover:bg-paper"><X size={18}/></button></div>
    {ios ? <><p className="mt-3 text-sm">Tap Safari’s <strong>Share</strong> button, choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</p><button type="button" onClick={markInstalled} className="mt-3 text-sm font-semibold text-brand-dark">I already installed POSSARA</button></> : <button type="button" disabled={busy || !event} onClick={() => void installApp()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-brand px-4 py-2.5 font-semibold text-white disabled:opacity-50"><Download size={17}/>{busy ? "Opening installer…" : "Install POSSARA"}</button>}
    {error && <p role="alert" className="mt-2 text-sm text-flag">{error}</p>}
  </aside>;
}
