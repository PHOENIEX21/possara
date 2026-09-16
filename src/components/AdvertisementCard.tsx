import { ExternalLink } from "lucide-react";
import type { Advertisement } from "../types/database";
export function AdvertisementCard({ ad }: { ad: Advertisement }) {
  return <article className="overflow-hidden rounded-[22px] border border-paper-dim bg-white shadow-card">
    <div className="flex items-center justify-between px-4 pb-3 pt-4">
      <div><p className="text-sm font-semibold text-ink">{ad.organization_name}</p><p className="text-[11px] font-medium uppercase tracking-[.16em] text-ink-faint">Sponsored</p></div>
      <span className="rounded-full bg-paper-dim px-2.5 py-1 text-[11px] text-ink-faint">Ad</span>
    </div>
    {ad.image_url && <img src={ad.image_url} alt="" className="max-h-[420px] w-full object-cover" />}
    <div className="p-4"><h3 className="text-base font-semibold">{ad.title}</h3><p className="mt-1.5 text-sm leading-6 text-ink-light">{ad.description}</p>
      <a href={ad.link} target="_blank" rel="noreferrer" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white">Learn more <ExternalLink size={14}/></a>
    </div>
  </article>;
}
