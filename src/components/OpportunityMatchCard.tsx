import { CheckCircle2, MapPin, Sparkles, Target } from "lucide-react";
import { useOwnProfile } from "../hooks/useProfile";
import type { OpportunityWithOrg } from "../hooks/useOpportunities";

function norm(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slugLike(value: string) {
  return norm(value).replace(/\s+/g, "-");
}

export function OpportunityMatchCard({ opportunity }: { opportunity: OpportunityWithOrg }) {
  const { data: profile } = useOwnProfile();
  if (!profile) return null;

  const haystack = norm(`${opportunity.title} ${opportunity.description} ${opportunity.eligibility ?? ""} ${opportunity.location ?? ""}`);
  const categoryName = opportunity.opportunity_categories?.name ?? "";
  const signals: { label: string; detail: string; weight: number }[] = [];

  const matchedSkills = (profile.skills ?? []).filter((skill) => {
    const token = norm(skill);
    return token.length >= 3 && haystack.includes(token);
  }).slice(0, 4);
  if (matchedSkills.length) signals.push({ label: "Skills", detail: `Your profile mentions ${matchedSkills.join(", ")}.`, weight: 40 });

  const profession = norm(profile.profession ?? profile.headline ?? "");
  if (profession.length >= 3 && haystack.includes(profession)) signals.push({ label: "Field", detail: `Your field appears directly relevant to this opportunity.`, weight: 20 });

  const locationText = norm(`${profile.country ?? ""} ${profile.location ?? ""}`);
  const opportunityLocation = norm(opportunity.location ?? "");
  if (locationText && opportunityLocation && (locationText.includes(opportunityLocation) || opportunityLocation.includes(locationText))) {
    signals.push({ label: "Location", detail: `Your profile location overlaps with the listed opportunity location.`, weight: 20 });
  }

  const categorySlug = slugLike(categoryName);
  const goals = profile.goal_categories ?? [];
  if (categorySlug && goals.some((goal) => categorySlug.includes(goal) || goal.includes(categorySlug))) {
    signals.push({ label: "Goal", detail: `${categoryName} matches one of your opportunity interests.`, weight: 20 });
  }

  const fit = Math.min(100, signals.reduce((sum, signal) => sum + signal.weight, 0));
  const profileDepth = [profile.profession, profile.country, profile.location, ...(profile.skills ?? [])].filter(Boolean).length;

  return <section className="mt-6 rounded-3xl border border-brand/15 bg-gradient-to-br from-brand-light/70 via-white to-trust-light/40 p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div><p className="eyebrow">POSSARA Opportunity Intelligence</p><h2 className="mt-1 flex items-center gap-2 text-lg font-semibold"><Sparkles size={18} className="text-brand"/>Profile fit signals</h2></div>
      <div className="rounded-2xl bg-white px-3 py-2 text-center shadow-sm"><p className="text-xl font-bold text-ink">{fit}%</p><p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">signal match</p></div>
    </div>

    {signals.length ? <div className="mt-4 space-y-2">{signals.map((signal) => <div key={signal.label} className="flex gap-3 rounded-2xl bg-white/80 p-3"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-trust-dark"/><div><p className="text-sm font-semibold">{signal.label}</p><p className="mt-0.5 text-xs leading-5 text-ink-light">{signal.detail}</p></div></div>)}</div> : <div className="mt-4 rounded-2xl bg-white/80 p-4"><p className="text-sm font-medium">Not enough profile signals yet.</p><p className="mt-1 text-xs leading-5 text-ink-light">Add your profession, location, interests and skills so POSSARA can explain why opportunities may fit you.</p></div>}

    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <div className="flex items-start gap-2 rounded-xl bg-white/70 p-3"><Target size={15} className="mt-0.5 text-brand-dark"/><div><p className="text-xs font-semibold">What this means</p><p className="mt-0.5 text-[11px] leading-5 text-ink-light">This compares profile signals with the listing. It is not a decision on eligibility.</p></div></div>
      <div className="flex items-start gap-2 rounded-xl bg-white/70 p-3"><MapPin size={15} className="mt-0.5 text-brand-dark"/><div><p className="text-xs font-semibold">Improve matching</p><p className="mt-0.5 text-[11px] leading-5 text-ink-light">{profileDepth < 4 ? "Complete more of your profile for stronger matching." : "Keep your skills and goals current as they change."}</p></div></div>
    </div>
  </section>;
}
