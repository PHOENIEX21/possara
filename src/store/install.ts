import { create } from "zustand";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
const INSTALLED = "possara-installed";
const INSTALLED_AT = "possara-installed-at";
const DISMISSED = "possara-install-dismissed-until";
export const INSTALL_COOLDOWN_MS = 21 * 24 * 60 * 60 * 1000;
const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* Storage may be disabled. */ } };
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: minimal-ui)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
// Keep suppression in memory too when browser storage is unavailable.
let suppressedUntil = Number(read(DISMISSED)) || 0;
const coolingDown = () => Math.max(suppressedUntil, Number(read(DISMISSED)) || 0, (Number(read(INSTALLED_AT)) || 0) + (read(INSTALLED) === "yes" ? INSTALL_COOLDOWN_MS : 0)) > Date.now();
function suppressInstall() {
  suppressedUntil = Date.now() + INSTALL_COOLDOWN_MS;
  write(DISMISSED, String(suppressedUntil));
}

export const useInstall = create<{
  installed: boolean; event: InstallEvent | null; ios: boolean; visible: boolean; busy: boolean; error: string;
}>(() => ({ installed: read(INSTALLED) === "yes" || standalone(), event: null, ios: false, visible: false, busy: false, error: "" }));

export function markInstalled() {
  write(INSTALLED_AT, String(Date.now()));
  write(INSTALLED, "yes");
  suppressInstall();
  useInstall.setState({ installed: true, event: null, visible: false, busy: false, error: "" });
}
export function dismissInstall() {
  suppressInstall();
  useInstall.setState({ visible: false, error: "" });
}
export async function installApp() {
  const { event, busy } = useInstall.getState();
  if (busy || !event) return;
  useInstall.setState({ busy: true, error: "" });
  try {
    await event.prompt();
    const choice = await event.userChoice;
    // Acceptance can precede a completed installation. Only appinstalled,
    // installed display mode, or the user's explicit confirmation marks it so.
    // Either outcome stops automatic reminders for three weeks.
    if (choice.outcome === "accepted" || choice.outcome === "dismissed") dismissInstall();
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
  // Migrate older installation records without making existing users see a prompt.
  else if (read(INSTALLED) === "yes" && !Number(read(INSTALLED_AT))) markInstalled();
  const offer = () => !standalone() && !useInstall.getState().installed && !coolingDown();
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    if (standalone()) return;
    if (useInstall.getState().installed && coolingDown()) return;
    // A new browser install offer, after the cooldown, allows reinstalling if
    // the app was removed. A date alone never clears a confirmed installation.
    if (useInstall.getState().installed) {
      write(INSTALLED, "no");
      useInstall.setState({ installed: false });
    }
    useInstall.setState({ event: event as InstallEvent, visible: offer(), error: "" });
  });
  window.addEventListener("appinstalled", markInstalled);
  window.matchMedia("(display-mode: standalone)").addEventListener("change", event => { if (event.matches) markInstalled(); });
  window.matchMedia("(display-mode: minimal-ui)").addEventListener("change", event => { if (event.matches) markInstalled(); });
  window.addEventListener("storage", event => {
    // Do not write storage here: that would bounce timestamp updates across tabs.
    if (event.key === INSTALLED && event.newValue === "yes") useInstall.setState({ installed: true, event: null, visible: false, busy: false, error: "" });
    if (event.key === DISMISSED) {
      suppressedUntil = Math.max(suppressedUntil, Number(event.newValue) || 0);
      useInstall.setState({ visible: false, error: "" });
    }
  });
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const safari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
  if (ios && safari) {
    useInstall.setState({ ios: true });
    window.setTimeout(() => { if (offer()) useInstall.setState({ visible: true }); }, 15000);
  }
}
