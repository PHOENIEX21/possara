export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="possara-top-v2" x1="6" y1="7" x2="46" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C2CF3"/><stop offset=".42" stopColor="#D637E2"/><stop offset=".72" stopColor="#FF5B8C"/><stop offset="1" stopColor="#FFA33E"/>
        </linearGradient>
        <linearGradient id="possara-lower" x1="7" y1="18" x2="34" y2="43" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D72DEB"/><stop offset=".48" stopColor="#A330F1"/><stop offset="1" stopColor="#6436E9"/>
        </linearGradient>
      </defs>
      <path d="M10 6.5h23.5c7 0 12 4.1 12 9.7 0 5.5-5 9.7-12 9.7H19.3l7.6-8.2h6.6c1.8 0 2.8-.6 2.8-1.6 0-.9-1-1.5-2.8-1.5H10c-2.9 0-5-1.7-5-4.1s2.1-4 5-4Z" fill="url(#possara-top-v2)"/>
      <path d="M5 18.4h20.7c3.7 0 6.3 2 6.3 4.8 0 1.6-.8 3-2.4 4.4L15.8 40.5c-1.5 1.4-3.3 2.1-5.2 2.1-3.2 0-5.6-2-5.6-4.8V18.4Zm9.2 8.2v5.6l6.1-5.6h-6.1Z" fill="url(#possara-lower)"/>
    </svg>
  );
}
