import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { isSupabaseConfigured } from "./lib/supabase";
import { BrandMark } from "./components/BrandMark";

function ConfigurationRequired() {
  return <main className="flex min-h-screen items-center justify-center bg-paper px-5"><section className="w-full max-w-md rounded-3xl border border-black/[.06] bg-white p-7 text-center shadow-card"><BrandMark className="mx-auto h-11 w-11 text-ink"/><h1 className="mt-4 text-2xl font-bold">POSSARA is being connected</h1><p className="mt-2 text-sm leading-6 text-ink-light">This deployment is missing its public Supabase configuration. Add the staging environment variables, then redeploy.</p><div className="mt-5 rounded-2xl bg-paper-dim p-4 text-left text-xs leading-6 text-ink-light"><code>VITE_SUPABASE_URL</code><br/><code>VITE_SUPABASE_ANON_KEY</code></div></section></main>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>{isSupabaseConfigured ? <App /> : <ConfigurationRequired />}</StrictMode>,
);


if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // POSSARA remains fully usable in browsers that reject service-worker registration.
    });
  });
}
