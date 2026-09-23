import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, ExternalLink, LoaderCircle, X, ZoomIn, ZoomOut } from "lucide-react";
import { saveImage } from "../lib/saveImage";

export function PhotoViewer({ urls, initialIndex = 0, title = "Photo", onClose }: {
  urls: string[]; initialIndex?: number; title?: string; onClose: () => void;
}) {
  const [index, setIndex] = useState(() => Math.max(0, Math.min(initialIndex, urls.length - 1)));
  const [zoomed, setZoomed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const activeThumb = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const alive = useRef(true);
  const savingLock = useRef(false);
  const src = urls[index];

  useEffect(() => {
    alive.current = true;
    const previousFocus = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => { alive.current = false; document.body.style.overflow = oldOverflow; previousFocus?.focus(); };
  }, []);
  useEffect(() => {
    activeThumb.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [index]);

  function selectPhoto(next: number) {
    if (next < 0 || next >= urls.length || next === index) return;
    setIndex(next); setZoomed(false); setNotice("");
    viewport.current?.scrollTo(0, 0);
  }
  async function download() {
    if (savingLock.current) return;
    savingLock.current = true; setSaving(true); setNotice("");
    try {
      await saveImage(src, `${title}-${index + 1}`);
      if (alive.current) setNotice("Download started");
    } catch (error) {
      if (alive.current) setNotice(error instanceof Error ? error.message : "Could not save this image. Try opening the original.");
    } finally {
      savingLock.current = false;
      if (alive.current) setSaving(false);
    }
  }

  if (!src) return null;
  return createPortal(
    <div ref={dialog} className="photo-viewer" role="dialog" aria-modal="true" aria-label={`${title} viewer`} data-photo-viewer
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.stopPropagation(); onClose(); }
        if (event.key === "ArrowLeft") { event.preventDefault(); selectPhoto(index - 1); }
        if (event.key === "ArrowRight") { event.preventDefault(); selectPhoto(index + 1); }
        if (event.key !== "Tab") return;
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')).filter((element) => element.getClientRects().length);
        const first = items[0]; const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
      <header className="photo-viewer-header">
        <button ref={closeButton} type="button" onClick={onClose} aria-label="Close photo"><X size={24} /></button>
        <div className="photo-viewer-title"><strong title={title}>{title}</strong><span aria-live="polite">{index + 1} / {urls.length}</span></div>
        <button type="button" onClick={() => setZoomed((value) => !value)} disabled={failedSource === src} aria-label={zoomed ? "Zoom out" : "Zoom in"} aria-pressed={zoomed}>{zoomed ? <ZoomOut size={21} /> : <ZoomIn size={21} />}</button>
        <a href={src} target="_blank" rel="noopener noreferrer" aria-label="Open original image" title="Open original image"><ExternalLink size={20} /></a>
        <button className="photo-save-button" type="button" onClick={() => void download()} disabled={saving || failedSource === src} aria-label="Save photo to device">{saving ? <LoaderCircle className="animate-spin" size={20} /> : <Download size={20} />}<span>{saving ? "Saving…" : "Save"}</span></button>
      </header>
      <div className="photo-viewer-stage">
        <div ref={viewport} className={`photo-viewport ${zoomed ? "is-zoomed" : ""}`}
          onDoubleClick={() => { if (failedSource !== src) setZoomed((value) => !value); }}
          onTouchStart={(event) => {
            gesture.current = !zoomed && event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
          }}
          onTouchMove={(event) => { if (event.touches.length !== 1) gesture.current = null; }}
          onTouchCancel={() => { gesture.current = null; }}
          onTouchEnd={(event) => {
            const start = gesture.current; gesture.current = null;
            const end = event.changedTouches[0];
            if (!start || !end || zoomed) return;
            const dx = end.clientX - start.x; const dy = end.clientY - start.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) selectPhoto(index + (dx < 0 ? 1 : -1));
          }}>
          {failedSource === src ? <div className="photo-load-error"><p>This photo could not load.</p><a href={src} target="_blank" rel="noopener noreferrer">Open original image</a></div> : <>
            {loadedSource !== src && <LoaderCircle className="photo-loading animate-spin" size={30} aria-label="Loading photo" />}
            <img key={src} src={src} alt={`${title}, photo ${index + 1} of ${urls.length}`} draggable={false} onLoad={() => setLoadedSource(src)} onError={() => setFailedSource(src)} />
          </>}
        </div>
        {index > 0 && <button type="button" className="photo-nav photo-nav-prev" aria-label="Previous photo" onClick={() => selectPhoto(index - 1)}><ChevronLeft size={30} /></button>}
        {index < urls.length - 1 && <button type="button" className="photo-nav photo-nav-next" aria-label="Next photo" onClick={() => selectPhoto(index + 1)}><ChevronRight size={30} /></button>}
      </div>
      {notice && <p className="photo-download-notice" role="status">{notice}</p>}
      {urls.length > 1 && <nav className="photo-thumbnails" aria-label="Photos in this post">
        {urls.map((url, i) => <button ref={i === index ? activeThumb : undefined} key={`${url}-${i}`} type="button" aria-label={`View photo ${i + 1}`} aria-current={i === index ? "true" : undefined} onClick={() => selectPhoto(i)}><img src={url} alt="" loading="lazy" /></button>)}
      </nav>}
    </div>, document.body,
  );
}
