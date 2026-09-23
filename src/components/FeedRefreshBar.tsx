import { useEffect, useRef, useState, type RefObject } from "react";
import { RefreshCw } from "lucide-react";

export function FeedRefreshBar({ onRefresh, feedRef }: {
  onRefresh: () => Promise<void>;
  feedRef: RefObject<HTMLDivElement | null>;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [distance, setDistance] = useState(0);
  const busy = useRef(false);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    let origin: { x: number; y: number } | null = null;
    let pulling = false;
    let pull = 0;
    const atTop = () => {
      let element: HTMLElement | null = feed;
      while (element) {
        if (element.scrollTop > 1) return false;
        element = element.parentElement;
      }
      return window.scrollY <= 1;
    };
    const cancel = () => {
      origin = null;
      pulling = false;
      pull = 0;
      setDistance(0);
    };
    const touchStart = (event: TouchEvent) => {
      const target = event.target;
      if (busy.current || event.touches.length !== 1 || !atTop() ||
          (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]'))) {
        cancel();
        return;
      }
      origin = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };
    const touchMove = (event: TouchEvent) => {
      if (!origin) return;
      if (event.touches.length !== 1 || !atTop()) { cancel(); return; }
      const dx = event.touches[0].clientX - origin.x;
      const dy = event.touches[0].clientY - origin.y;
      if (!pulling && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        if (dy <= 0 || Math.abs(dx) > dy) { cancel(); return; }
        pulling = true;
      }
      if (!pulling) return;
      if (!event.cancelable) { cancel(); return; }
      event.preventDefault();
      pull = Math.min(90, Math.max(0, dy * 0.5));
      setDistance(pull);
    };
    const touchEnd = () => {
      const ready = pulling && pull >= 60;
      cancel();
      if (!ready || busy.current) return;
      busy.current = true;
      setRefreshing(true);
      void onRefresh().finally(() => {
        busy.current = false;
        setRefreshing(false);
      });
    };
    feed.addEventListener("touchstart", touchStart, { passive: true });
    feed.addEventListener("touchmove", touchMove, { passive: false });
    feed.addEventListener("touchend", touchEnd);
    feed.addEventListener("touchcancel", cancel);
    return () => {
      feed.removeEventListener("touchstart", touchStart);
      feed.removeEventListener("touchmove", touchMove);
      feed.removeEventListener("touchend", touchEnd);
      feed.removeEventListener("touchcancel", cancel);
    };
  }, [feedRef, onRefresh]);

  if (!refreshing && distance === 0) return null;

  return (
    <div className="home-refresh-indicator" role="status" aria-live="polite" style={{ height: refreshing ? 48 : distance }}>
      <RefreshCw
        size={20}
        aria-hidden="true"
        className={refreshing ? "animate-spin" : undefined}
        style={refreshing ? undefined : { transform: "rotate(" + distance * 3 + "deg)" }}
      />
      <span className="sr-only">{refreshing ? "Refreshing posts" : distance >= 60 ? "Release to refresh" : "Pull to refresh"}</span>
    </div>
  );
}
