import type { MemberTrustRank } from "../hooks/useTrustRank";

const STYLE: Record<Exclude<MemberTrustRank["rankKey"], "restricted">, string> = {
  bronze: "border-[#b7794b]/30 bg-[#f7eee7] text-[#85502d]",
  silver: "border-slate-300 bg-slate-100 text-slate-600",
  gold: "border-amber-300/70 bg-amber-50 text-amber-700",
  platinum: "border-indigo-200 bg-indigo-50 text-indigo-700",
  diamond: "border-cyan-200 bg-cyan-50 text-cyan-700",
  official: "border-amber-300/70 bg-amber-50 text-amber-800",
};

const SYMBOL: Record<Exclude<MemberTrustRank["rankKey"], "restricted">, string> = {
  bronze: "🥉",
  silver: "◆",
  gold: "◆",
  platinum: "✦",
  diamond: "💎",
  official: "🥇",
};

export function TrustRankBadge({ rank, compact = false }: { rank: MemberTrustRank | null | undefined; compact?: boolean }) {
  if (!rank || rank.rankKey === "restricted") return null;
  const title = rank.official
    ? "POSSARA Official account"
    : `POSSARA Trust Rank · ${rank.score}/100. Built from account trust, useful participation, contribution and confirmed moderation history. Followers and POSSARA+ payment do not increase rank.`;

  return (
    <span
      title={title}
      aria-label={rank.official ? "POSSARA Official" : `${rank.label} POSSARA Trust Rank`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border font-semibold ${STYLE[rank.rankKey]} ${compact ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"}`}
    >
      <span aria-hidden="true">{SYMBOL[rank.rankKey]}</span>
      <span>{rank.official ? "Official" : rank.label}</span>
    </span>
  );
}
