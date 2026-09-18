import { BadgeCheck } from "lucide-react";
import type { MemberTrustRank } from "../hooks/useTrustRank";

const STYLE: Record<Exclude<MemberTrustRank["rankKey"], "restricted">, string> = {
  bronze: "border-[#b7794b]/45 bg-gradient-to-br from-[#f4d7bd] via-[#c88956] to-[#8d5734] text-white shadow-[0_1px_5px_rgba(141,87,52,.28)]",
  silver: "border-slate-300 bg-gradient-to-br from-white via-slate-300 to-slate-500 text-white shadow-[0_1px_5px_rgba(100,116,139,.25)]",
  gold: "border-amber-300 bg-gradient-to-br from-[#fff0a8] via-[#e9b949] to-[#a96800] text-white shadow-[0_1px_6px_rgba(217,151,0,.28)]",
  platinum: "border-violet-200 bg-gradient-to-br from-white via-violet-200 to-indigo-500 text-white shadow-[0_1px_6px_rgba(99,102,241,.24)]",
  diamond: "border-cyan-200 bg-gradient-to-br from-white via-cyan-200 to-sky-500 text-white shadow-[0_1px_7px_rgba(14,165,233,.26)]",
  official: "border-amber-300 bg-gradient-to-br from-[#fff4b8] via-[#f3bd43] to-[#b46c00] text-white shadow-[0_1px_7px_rgba(217,151,0,.3)]",
};

export function TrustRankBadge({ rank, compact = false }: { rank: MemberTrustRank | null | undefined; compact?: boolean }) {
  if (!rank || rank.rankKey === "restricted") return null;
  const title = rank.official
    ? "POSSARA Official"
    : `${rank.label} POSSARA Trust Rank · ${rank.score}/100. Trust is earned through account quality, useful participation, contribution and confirmed moderation history.`;
  const size = compact ? 16 : 20;

  return (
    <span
      title={title}
      aria-label={rank.official ? "POSSARA Official" : `${rank.label} POSSARA Trust Rank`}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border ${STYLE[rank.rankKey]} ${compact ? "h-[18px] w-[18px]" : "h-6 w-6"}`}
    >
      {rank.official ? <span aria-hidden="true" className={compact ? "text-[12px] leading-none" : "text-[15px] leading-none"}>🥇</span> : <BadgeCheck size={size} strokeWidth={2.4} aria-hidden="true"/>}
    </span>
  );
}
