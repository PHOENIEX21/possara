import { useEffect, useMemo, useRef, useState } from "react";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_ID = "possara-turnstile-script";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve();
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise<void>((resolve, reject) => {
      if (window.turnstile) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Security check could not load.")), { once: true });
    });
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Security check could not load.")), { once: true });
    document.head.appendChild(script);
  });
}

export const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() ?? "";

export function BotChallenge({
  onToken,
  resetKey,
}: {
  onToken: (token: string | null) => void;
  resetKey: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const enabled = useMemo(() => Boolean(turnstileSiteKey), []);

  useEffect(() => {
    if (!enabled) {
      onToken(null);
      return;
    }

    let cancelled = false;
    let widgetId: string | null = null;
    onToken(null);
    setLoadError(null);

    void loadTurnstile()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: turnstileSiteKey,
          theme: "auto",
          size: "flexible",
          callback: (token: string) => onToken(token),
          "expired-callback": () => onToken(null),
          "timeout-callback": () => onToken(null),
          "error-callback": () => {
            onToken(null);
            setLoadError("Security check could not complete. Please retry.");
          },
        });
      })
      .catch(() => {
        if (!cancelled) {
          onToken(null);
          setLoadError("Security check could not load. Check your connection and retry.");
        }
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          // Widget may already have removed itself after navigation.
        }
      }
    };
  }, [enabled, onToken, resetKey]);

  if (!enabled) return null;

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="min-h-[65px] w-full overflow-hidden rounded-xl" aria-label="Bot protection check" />
      {loadError && <p className="text-xs text-flag">{loadError}</p>}
      <p className="text-[11px] leading-5 text-ink-faint">
        Protected by Cloudflare Turnstile to prevent automated account abuse.
      </p>
    </div>
  );
}
