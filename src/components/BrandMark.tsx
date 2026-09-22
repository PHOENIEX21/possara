export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="possara-p" x1="6" y1="4" x2="43" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C2CF3"/><stop offset=".42" stopColor="#D637E2"/><stop offset=".72" stopColor="#FF5B8C"/><stop offset="1" stopColor="#FFA33E"/>
        </linearGradient>
      </defs>
      <path fillRule="evenodd" clipRule="evenodd" d="M7 4h21.5C37.4 4 43 9.4 43 17.4S37.4 31 28.5 31H18v13H7V4Zm11 9v9h9.8c3 0 4.7-1.7 4.7-4.5S30.8 13 27.8 13H18Z" fill="url(#possara-p)"/>
    </svg>
  );
}