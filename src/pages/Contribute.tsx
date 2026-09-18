import { Link } from "react-router-dom";
import { Image, MessageSquareText, FilePlus, Megaphone, Store, Trophy } from "lucide-react";

const PATHWAYS = [
  { icon: MessageSquareText, title: "Community post", description: "Post to Home or choose any community category such as jobs, scholarships, admissions, grants, internships and more.", to: "/", cta: "Create a post" },
  { icon: Image, title: "Moment", description: "Share a positive image update that lasts for 24 hours. Moments are created from Home.", to: "/", cta: "Create a Moment" },
  { icon: Trophy, title: "Milestone", description: "Milestones are being connected to the profile journey for this staging build.", to: "/profile/me", cta: "Open profile" },
  { icon: Store, title: "Business post", description: "Share a product, service, portfolio or business as a normal community post.", to: "/advertise", cta: "Open business community" },
  { icon: Megaphone, title: "Paid advertisement", description: "Create a sponsored campaign for review. Sponsored placements stay separate from community posts.", to: "/advertise", cta: "Create paid ad" },
];

export function Contribute() {
  return <div className="page-stack"><section><h1 className="text-2xl">Create</h1><p className="mt-1 max-w-prose text-ink-light">Choose what you want to create. Community posts may use any category; submitting an official opportunity listing still uses the separate review flow.</p></section><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{PATHWAYS.map((p)=><Link key={p.title} to={p.to} className="rounded-2xl border border-paper-dim bg-white p-5 shadow-sm transition hover:border-brand"><p.icon size={20} className="text-brand-dark"/><h2 className="mt-3 text-[15px] font-medium">{p.title}</h2><p className="mt-1 text-sm text-ink-light">{p.description}</p><span className="mt-3 inline-block text-sm font-medium text-brand-dark">{p.cta} →</span></Link>)}</div><Link to="/submit-opportunity" className="flex items-center gap-3 rounded-2xl border border-dashed border-ink-faint/30 bg-white p-4 text-sm font-medium text-ink-light hover:border-ink"><FilePlus size={18}/>Submit an opportunity for review</Link></div>;
}
