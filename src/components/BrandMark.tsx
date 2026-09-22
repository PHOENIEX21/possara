export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="possara-p" x1="7" y1="5" x2="42" y2="43" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C2CF3"/><stop offset=".42" stopColor="#D637E2"/><stop offset=".72" stopColor="#FF5B8C"/><stop offset="1" stopColor="#FFA33E"/>
        </linearGradient>
      </defs>
      {/* Hollow ribbon P: preserve the designed P, remove the extra slash/tail that made it read as V. */}
      <path fillRule="evenodd" clipRule="evenodd" d="M8 5h20.2C36.8 5 42 10.1 42 17.5S36.8 30 28.2 30H18v13H8V5Zm10 8v9h9.4c3.2 0 5-1.6 5-4.5S30.6 13 27.4 13H18Z" fill="url(#possara-p)"/>
      <path d="M18 13h9.4c3.2 0 5 1.6 5 4.5s-1.8 4.5-5 4.5H18v-9Z" fill="white"/>
    </svg>
  );
}
