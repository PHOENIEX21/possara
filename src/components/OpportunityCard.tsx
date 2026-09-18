import { Bookmark, ThumbsUp } from "lucide-react";
import { Link } from "react-router-dom";
import { TrustBadge } from "./TrustBadge";
import { ReportButton } from "./ReportButton";
import { getCategoryIcon } from "../lib/categoryIcon";
import { useOpportunityViewerState, useToggleOpportunityUseful, useToggleOpportunitySave } from "../hooks/useOpportunityActions";
import { useAuth } from "../store/auth";
import type { Opportunity, Organization, OpportunityCategory } from "../types/database";

interface OpportunityCardProps { opportunity: Opportunity & { opportunity_candidates?: { opportunity_sources?: { name:string; verified_source:boolean; trust_tier:string } | null } | null }; organization?: Pick<Organization, "name" | "verified" | "is_sponsored"> | null; category?: Pick<OpportunityCategory, "name" | "icon" | "color"> | null; }
export function OpportunityCard({ opportunity, organization, category }: OpportunityCardProps) {
  const { userId } = useAuth();
  const { data: viewerState } = useOpportunityViewerState(opportunity.id);
  const toggleUseful = useToggleOpportunityUseful(opportunity.id);
  const toggleSave = useToggleOpportunitySave(opportunity.id);
  const deadline = opportunity.deadline ? new Date(opportunity.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null;
  const CategoryIcon = category ? getCategoryIcon(category.icon) : null;
  const reacted = viewerState?.reacted ?? false;
  const saved = viewerState?.saved ?? false;
  return <article className="mb-4 rounded-2xl border border-paper-dim bg-white p-5 shadow-sm transition hover:shadow-md"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><TrustBadge verified={organization?.verified ?? false} lastVerifiedAt={opportunity.last_verified_at} sponsored={organization?.is_sponsored} sourceVerified={!!opportunity.opportunity_candidates?.opportunity_sources?.verified_source} />{deadline && <span className="whitespace-nowrap text-sm text-ink-light">Deadline {deadline}</span>}</div>{category && CategoryIcon && <span className="mb-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: (category.color ?? "#4A4468") + "1a", color: category.color ?? "#4A4468" }}><CategoryIcon size={11} strokeWidth={2.5} />{category.name}</span>}<h3 className="text-xl leading-snug"><Link to={`/opportunities/${opportunity.id}`} className="hover:underline">{opportunity.title}</Link></h3>{organization?.name && <p className="mt-0.5 text-sm text-ink-light">{organization.name}</p>}<p className="prose-width mt-2 text-[15px] leading-relaxed text-ink-light">{opportunity.description}</p><div className="mt-4 flex flex-wrap items-center gap-4 text-sm"><button onClick={() => userId && toggleUseful.mutate(reacted)} disabled={!userId || toggleUseful.isPending} title={userId ? undefined : "Sign in to mark as useful"} className={"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition disabled:opacity-50 " + (reacted ? "border-trust bg-trust-light text-trust-dark" : "border-ink-faint/30 hover:border-trust hover:text-trust-dark")}><ThumbsUp size={15} /> Useful</button><button onClick={() => userId && toggleSave.mutate(saved)} disabled={!userId || toggleSave.isPending} title={userId ? undefined : "Sign in to save"} className={"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition disabled:opacity-50 " + (saved ? "border-opportunity bg-opportunity-light text-opportunity-dark" : "border-ink-faint/30 hover:border-opportunity hover:text-opportunity-dark")}><Bookmark size={15} /> {saved ? "Saved" : "Save"}</button>{opportunity.link && <a href={opportunity.link} target="_blank" rel="noreferrer" className="ml-auto rounded-full bg-ink px-4 py-1.5 font-medium text-paper transition hover:bg-ink/90">View opportunity</a>}</div><div className="mt-2"><ReportButton opportunityId={opportunity.id} /></div></article>;
}
