import { Link } from "react-router-dom";
import { Award, Briefcase, Building2, GraduationCap, School, MoreHorizontal, ArrowRight, Search } from "lucide-react";
import { OpportunityCard } from "../components/OpportunityCard";
import { useMatchedOpportunities } from "../hooks/useMatchedOpportunities";
import { useAuth } from "../store/auth";

const categories=[
  {to:"/jobs",title:"Jobs",copy:"Current roles and career openings",icon:Briefcase,cls:"bg-brand-light text-brand-dark"},
  {to:"/organizations",title:"Organizations",copy:"Browse employers and institutions by industry or state",icon:Building2,cls:"bg-paper-dim text-ink"},
  {to:"/scholarships",title:"Scholarships",copy:"Funding for your next step",icon:GraduationCap,cls:"bg-opportunity-light text-opportunity-dark"},
  {to:"/admissions",title:"Admissions",copy:"School news, screening & deadlines",icon:School,cls:"bg-trust-light text-trust-dark"},
  {to:"/competitions",title:"Competitions",copy:"Essay contests, quizzes, hackathons and talent challenges",icon:Award,cls:"bg-brand-light text-brand-dark"},
  {to:"/discover",title:"More",copy:"Grants, internships and fellowships",icon:MoreHorizontal,cls:"bg-paper-dim text-ink-light"}
];

export function Opportunities(){
  const {userId}=useAuth();
  const {data:matches,isLoading}=useMatchedOpportunities();
  return <div className="page-stack">
    <section className="page-hero"><div><p className="eyebrow">Your next move</p><h1>Opportunities</h1><p>Jobs, scholarships and admissions matched to where you want to go next.</p></div></section>
    <Link to="/search" className="opportunity-search"><Search size={18}/><span>Search jobs, scholarships, admissions, competitions…</span></Link>
    
    <section id="matched" className="scroll-mt-24 rounded-3xl border border-brand/15 bg-brand-light/30 p-4 sm:p-5"><div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">For you</p><h2 className="text-xl">Matched opportunities</h2><p className="mt-1 text-sm text-ink-light">{!userId?"Sign in and choose your opportunity interests to personalize this section.":matches?.matched?"Based on the opportunity interests saved in your profile.":"Choose your interests in Profile to improve your matches. Showing recent opportunities for now."}</p></div>{userId&&<Link to="/profile/me" className="text-sm font-medium text-brand-dark hover:underline">Update matching interests →</Link>}</div>
      {isLoading&&<div className="feed-skeleton"/>}
      {!isLoading&&matches?.opportunities.length===0&&<div className="rounded-2xl bg-white p-5 text-sm text-ink-light">No matching active opportunities yet. You can still browse all categories above.</div>}
      <div>{matches?.opportunities.map(item=><OpportunityCard key={item.id} opportunity={item} organization={item.organizations} category={item.opportunity_categories}/>)}</div>
    </section>
    <section><div className="mb-3"><p className="eyebrow">Browse everything</p><h2 className="text-xl">Explore by category</h2></div><div className="opportunity-grid">{categories.map(c=><Link key={c.to} to={c.to} className="opportunity-tile"><span className={`page-icon ${c.cls}`}><c.icon size={22}/></span><div><h2>{c.title}</h2><p>{c.copy}</p></div><ArrowRight size={18} className="ml-auto text-ink-faint"/></Link>)}</div></section>\n    <section className="trust-panel"><div><p className="eyebrow">Built for trust</p><h2>Know what you're opening.</h2><p>Organization verification, source checks, sponsorship and personal relevance are separate signals on POSSARA.</p></div></section>
  </div>
}
