export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="possara-spectrum" x1="7" y1="5" x2="41" y2="43" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5B35E8"/><stop offset=".28" stopColor="#8B36F0"/><stop offset=".55" stopColor="#E342C3"/><stop offset=".78" stopColor="#FF6B78"/><stop offset="1" stopColor="#FF9A43"/>
        </linearGradient>
      </defs>
      <path d="M11 6.5h14.7c9.7 0 15.8 5 15.8 12.5 0 7.7-6.2 12.8-15.8 12.8h-5.4v9.7H11V6.5Zm9.3 8.2v9h5.1c4.3 0 6.8-1.6 6.8-4.6 0-2.9-2.5-4.4-6.8-4.4h-5.1Z" fill="url(#possara-spectrum)"/>
      <path d="M7.2 11.7 12 7v34.5H7.2V11.7Z" fill="#4B32D7" opacity=".96"/>
      <path d="M20.4 17.3h5.5c2.9 0 4.4.7 4.4 2.2 0 1.6-1.6 2.4-4.5 2.4h-5.4v-4.6Z" fill="white" opacity=".98"/>
    </svg>
  );
}
