export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="possara-top" x1="7" y1="8" x2="40" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B28F2"/><stop offset=".46" stopColor="#E33AD1"/><stop offset="1" stopColor="#FF9B43"/>
        </linearGradient>
        <linearGradient id="possara-lower" x1="9" y1="18" x2="31" y2="39" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A82DF3"/><stop offset=".5" stopColor="#7C35F1"/><stop offset="1" stopColor="#5363F4"/>
        </linearGradient>
      </defs>
      <path d="M9 7.5h20.4c7.1 0 11.6 3.8 11.6 9.3 0 5.7-4.7 9.5-11.8 9.5H18.5l6.8-7.3h4.2c2.2 0 3.5-.8 3.5-2.2 0-1.3-1.3-2.1-3.5-2.1H9.8A3.8 3.8 0 0 1 6 10.9v-.1a3.3 3.3 0 0 1 3-3.3Z" fill="url(#possara-top)"/>
      <path d="M6.2 20.1c0-2 1.6-3.6 3.6-3.6h13.8l-6.9 7.4h-2.5v5.7h8.2l-6.8 7.4H9.8a3.6 3.6 0 0 1-3.6-3.6V20.1Z" fill="url(#possara-lower)"/>
    </svg>
  );
}
