import { ShieldCheck, ShieldQuestion, Clock } from "lucide-react";

interface TrustBadgeProps {
  verified: boolean;
  lastVerifiedAt: string | null;
  sponsored?: boolean | null;
  sourceVerified?: boolean;
}

export function TrustBadge({ verified, lastVerifiedAt, sponsored, sourceVerified = false }: TrustBadgeProps) {
  const formattedDate = lastVerifiedAt
    ? new Date(lastVerifiedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {verified ? (
        <span className="inline-flex items-center gap-1.5 text-trust-dark">
          <ShieldCheck size={16} strokeWidth={2} />Verified organization
        </span>
      ) : sourceVerified ? (
        <span className="inline-flex items-center gap-1.5 text-trust-dark">
          <ShieldCheck size={16} strokeWidth={2} />Verified source
        </span>
      ) : lastVerifiedAt ? (
        <span className="inline-flex items-center gap-1.5 text-trust-dark">
          <ShieldCheck size={16} strokeWidth={2} />Source checked
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-ink-light">
          <ShieldQuestion size={16} strokeWidth={2} />Source under review
        </span>
      )}
      {formattedDate && (
        <span className="inline-flex items-center gap-1.5 text-ink-faint">
          <Clock size={14} strokeWidth={2} />Last checked {formattedDate}
        </span>
      )}
      {sponsored && <span className="rounded-full bg-opportunity-light px-2.5 py-0.5 text-xs font-medium text-opportunity-dark">Sponsored</span>}
    </div>
  );
}
