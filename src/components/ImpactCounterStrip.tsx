interface ImpactMetric { label: string; value: string; provenance: "Verified by partner" | "Reported by user" | "Self-declared" | "Under review"; }
interface ImpactCounterStripProps { metrics: ImpactMetric[]; }
export function ImpactCounterStrip({ metrics }: ImpactCounterStripProps) {
  return <div className="grid grid-cols-2 gap-4 border-y border-paper-dim py-5 sm:grid-cols-4">{metrics.map((metric) => <div key={metric.label}><div className="font-display text-2xl text-ink">{metric.value}</div><div className="text-sm text-ink-light">{metric.label}</div><div className="mt-0.5 text-xs text-ink-faint">{metric.provenance}</div></div>)}</div>;
}
