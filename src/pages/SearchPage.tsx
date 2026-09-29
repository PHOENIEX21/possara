import {useState} from "react";
import {Link,useSearchParams} from "react-router-dom";
import {Search,ArrowUpRight,Users} from "lucide-react";
import {useGlobalSearch,type SearchKind} from "../hooks/useGlobalSearch";
import {OrganizationVerificationBadge} from "../components/OrganizationVerificationBadge";
import {useAuth} from "../store/auth";
const kinds:SearchKind[]=['people','posts','jobs','opportunities','organizations','groups'];
export function SearchPage(){const [params]=useSearchParams();return <SearchResults key={params.get('q')??''} term={params.get('q')??''}/>;}
function SearchResults({term}:{term:string}){
 const [input,setInput]=useState(term);const [tab,setTab]=useState<'all'|SearchKind>('all');const [,setParams]=useSearchParams();const query=useGlobalSearch(term);const {userId}=useAuth();
 const items=query.data?.items.filter(item=>tab==='all'||item.kind===tab)??[];
 return <div className="page-stack"><section><p className="eyebrow">Explore POSSARA</p><h1 className="text-2xl">Find people and possibilities</h1><p className="mt-1 text-sm text-ink-light">Search friends by name or @username, posts, jobs, opportunities, organizations and groups.</p></section>
  <form role="search" className="flex items-center gap-2 rounded-2xl border bg-white p-3" onSubmit={event=>{event.preventDefault();setParams({q:input.trim()});}}><Search size={20} className="shrink-0 text-brand-dark"/><input className="min-w-0 flex-1 bg-transparent text-base outline-none" type="search" aria-label="Search POSSARA" placeholder="Who or what are you looking for?" value={input} minLength={2} maxLength={120} required onChange={event=>setInput(event.target.value)}/><button className="rounded-xl bg-ink px-3 py-2 text-sm text-white">Search</button></form>
  <nav aria-label="Search categories" className="flex gap-2 overflow-x-auto pb-1">{(['all',...kinds] as const).map(kind=><button key={kind} aria-pressed={tab===kind} className={`shrink-0 rounded-full px-4 py-2 text-sm capitalize ${tab===kind?'bg-ink text-white':'bg-white text-ink-light'}`} onClick={()=>setTab(kind)}>{kind}</button>)}</nav>
  {term.trim().length<2?<p className="text-sm text-ink-light">Enter at least two characters to search.</p>:query.isPending?<p role="status">Searching…</p>:<>
   {!!query.data?.failed.length&&<p role="alert" className="text-sm text-flag">Could not search {query.data.failed.join(', ')}. <button className="underline" onClick={()=>query.refetch()}>Try again</button></p>}
   {!items.length&&<p className="rounded-2xl border border-dashed p-6 text-center text-ink-light">No {tab==='all'?'results':tab} found for “{term}”. Try a name, skill or a different phrase.</p>}
   <div className="space-y-3">{items.map(item=><Link key={`${item.kind}:${item.id}`} to={item.path} className="flex min-w-0 items-start gap-3 rounded-2xl border border-paper-dim bg-white p-4 hover:border-brand/30">{item.avatar?<img src={item.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover"/>:<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark"><Users size={20}/></span>}<div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-wide text-brand-dark">{item.kind}</p><div className="flex items-start gap-2"><h2 className="min-w-0 break-words font-semibold [overflow-wrap:anywhere]">{item.title}</h2>{item.verified&&<OrganizationVerificationBadge compact/>}</div><p className="mt-1 line-clamp-2 break-words text-sm text-ink-light">{item.description}</p></div><ArrowUpRight size={16} className="shrink-0 text-ink-faint"/></Link>)}</div>
   {!!items.length&&<p className="text-xs text-ink-light">Showing up to 20 matches per category. Refine your search to find more.</p>}
  </>}
  {!userId&&<p className="text-sm text-ink-light"><Link to="/signin" className="text-brand-dark underline">Sign in</Link> to find groups you can join.</p>}
 </div>;
}
