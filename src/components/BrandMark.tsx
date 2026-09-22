export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs><linearGradient id="possara-spectrum" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor="#ff4d8d"/><stop offset=".24" stopColor="#ff9f43"/><stop offset=".43" stopColor="#ffd84d"/><stop offset=".62" stopColor="#35d6c5"/><stop offset=".8" stopColor="#4b7cff"/><stop offset="1" stopColor="#9b4dff"/></linearGradient></defs>
      <path d="M9 8h18c8 0 13 4.2 13 10.5S35 29 27 29H18v10H9V8Zm9 8v5h8.5c2.6 0 4-1 4-2.5s-1.4-2.5-4-2.5H18Z" fill="url(#possara-spectrum)"/>
    </svg>
  );
}
