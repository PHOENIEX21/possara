export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M8 35.5C14.8 31.2 16.1 14 24 11c8.1 3 9.2 20.2 16 24.5" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M16.7 29.1c2.5-4.2 4.6-6.1 7.3-6.1 2.8 0 4.9 1.9 7.4 6.1" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity=".72" />
    </svg>
  );
}
