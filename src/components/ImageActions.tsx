import { useEffect, useState } from "react";
import { PhotoViewer } from "./PhotoViewer";

// Linked photos keep their normal tap action. Long-press / right-click offers
// the same view-and-save controls for images throughout the app.
export function ImageActions() {
  const [photo, setPhoto] = useState<{ src: string; title: string } | null>(null);
  useEffect(() => {
    let timer: number | undefined;
    let origin: { x: number; y: number } | null = null;
    let suppressClickUntil = 0;
    const imageFor = (target: EventTarget | null) => target instanceof HTMLImageElement && !target.closest('[data-photo-viewer], .story-viewer, [aria-hidden="true"]') ? target : null;
    const open = (image: HTMLImageElement) => {
      if (!image.currentSrc && !image.src) return;
      setPhoto({ src: image.currentSrc || image.src, title: image.alt || "Photo" });
    };
    const clear = () => { window.clearTimeout(timer); origin = null; };
    const contextMenu = (event: MouseEvent) => {
      const image = imageFor(event.target);
      if (!image) return;
      event.preventDefault(); clear(); open(image);
      suppressClickUntil = Date.now() + 1000;
    };
    const touchStart = (event: TouchEvent) => {
      clear();
      const image = imageFor(event.target);
      if (!image || event.touches.length !== 1) return;
      origin = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      timer = window.setTimeout(() => { open(image); suppressClickUntil = Date.now() + 1000; }, 600);
    };
    const touchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (event.touches.length !== 1 || !touch || (origin && Math.hypot(touch.clientX - origin.x, touch.clientY - origin.y) > 10)) clear();
    };
    const click = (event: MouseEvent) => {
      if (Date.now() < suppressClickUntil && imageFor(event.target)) { event.preventDefault(); event.stopPropagation(); return; }
      const image = imageFor(event.target);
      if (!image || image.closest('a, button, [role="button"], label, [contenteditable="true"]')) return;
      open(image);
    };
    document.addEventListener("contextmenu", contextMenu, true);
    document.addEventListener("touchstart", touchStart, { passive: true, capture: true });
    document.addEventListener("touchmove", touchMove, { passive: true, capture: true });
    document.addEventListener("touchend", clear, true);
    document.addEventListener("touchcancel", clear, true);
    document.addEventListener("scroll", clear, true);
    document.addEventListener("click", click, true);
    return () => {
      clear();
      document.removeEventListener("contextmenu", contextMenu, true);
      document.removeEventListener("touchstart", touchStart, true);
      document.removeEventListener("touchmove", touchMove, true);
      document.removeEventListener("touchend", clear, true);
      document.removeEventListener("touchcancel", clear, true);
      document.removeEventListener("scroll", clear, true);
      document.removeEventListener("click", click, true);
    };
  }, []);
  return photo ? <PhotoViewer urls={[photo.src]} title={photo.title} onClose={() => setPhoto(null)} /> : null;
}
