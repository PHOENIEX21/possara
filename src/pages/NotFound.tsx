import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export function NotFound() {
  return <section className="empty-state mx-auto max-w-xl" aria-labelledby="not-found-title">
    <Compass size={32} aria-hidden="true" />
    <h1 id="not-found-title" className="mt-4 text-2xl font-bold text-ink">Page not found</h1>
    <p>This link may be incorrect or the page may have moved. You can return home or explore current opportunities.</p>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <Link to="/" className="rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white">Go home</Link>
      <Link to="/opportunities" className="rounded-xl bg-brand-light px-5 py-3 text-sm font-semibold text-brand-dark">Explore opportunities</Link>
    </div>
  </section>;
}
