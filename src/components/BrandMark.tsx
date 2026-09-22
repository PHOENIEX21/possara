export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="possara-p" x1="8" y1="5" x2="41" y2="43" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C2CF3"/><stop offset=".42" stopColor="#D637E2"/><stop offset=".72" stopColor="#FF5B8C"/><stop offset="1" stopColor="#FFA33E"/>
        </linearGradient>
      </defs>
      <path d="M10 5h17.2C36.5 5 42 10.1 42 17.7S36.5 30.4 27.2 30.4H18.5V43H10V5Zm8.5 8v9.5h8.1c4.4 0 6.7-1.6 6.7-4.8S31 13 26.6 13h-8.1Z" fill="url(#possara-p)"/>
    </svg>
  );
}
