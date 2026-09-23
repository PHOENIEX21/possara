export function PageLoading() {
  return <div role="status" aria-live="polite" className="mx-auto flex min-h-48 items-center justify-center gap-3 px-5 text-sm text-ink-light">
    <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-brand/20 border-t-brand motion-reduce:animate-none" />
    Loading page…
  </div>;
}
