import { create } from "zustand";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
const INSTALLED = "possara-installed";
const DISMISSED = "possara-install-dismissed-until";
const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* Storage may be disabled. */ } };
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: minimal-ui)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const useInstall = create<{
  installed: boolean; event: InstallEvent | null; ios: boolean; visible: boolean; busy: boolean; error: string;
}>(() => ({ installed: read(INSTALLED) === "yes" || standalone(), event: null, ios: false, visible: false, busy: false, error: "" }));

export function markInstalled() {
  write(INSTALLED, "yes");
  useInstall.setState({ installed: true, event: null, visible: false, busy: false });
}
export function dismissInstall() {
  write(DISMISSED, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  useInstall.setState({ visible: false, error: "" });
}
export async function installApp() {
  const { event, busy } = useInstall.getState();
  if (busy || !event) return;
  useInstall.setState({ busy: true, error: "" });
  try {
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") markInstalled();
    else dismissInstall();
  } catch {
    useInstall.setState({ error: "Installation could not start. Use your browser's Install app option or try again on your next visit." });
  } finally {
    // A native install event can only be used once, including after dismissal.
    useInstall.setState({ event: null, busy: false });
  }
}
let initialized = false;
export function initializeInstall() {
  if (initialized) return;
  initialized = true;
  if (standalone()) markInstalled();
  const offer = () => !useInstall.getState().installed && Number(read(DISMISSED) || 0) < Date.now();
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    if (useInstall.getState().installed || standalone()) return;
    useInstall.setState({ event: event as InstallEvent, visible: offer() });
  });
  window.addEventListener("appinstalled", markInstalled);
  window.matchMedia("(display-mode: standalone)").addEventListener("change", event => { if (event.matches) markInstalled(); });
  window.addEventListener("storage", event => {
    if (event.key === INSTALLED && event.newValue === "yes") markInstalled();
    if (event.key === DISMISSED) useInstall.setState({ visible: false });
  });
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const safari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
  if (ios && safari) {
    useInstall.setState({ ios: true });
    window.setTimeout(() => { if (offer()) useInstall.setState({ visible: true }); }, 15000);
  }
}
