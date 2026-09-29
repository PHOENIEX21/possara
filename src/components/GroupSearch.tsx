import {useState} from 'react';
import {Link} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {Search} from 'lucide-react';
import {supabase} from '../lib/supabase';
import {searchFilter} from '../lib/search';
import {useAuth} from '../store/auth';
export function GroupSearch({groupId}:{groupId:string}){
 const {userId}=useAuth();const [input,setInput]=useState('');const [term,setTerm]=useState('');
 const query=useQuery({queryKey:['group-search',userId,groupId,term],enabled:term.length>=2,queryFn:async()=>{const {data,error}=await supabase.from('community_messages').select('id,body,file_name,kind,created_at').eq('group_id',groupId).or(searchFilter(['body','file_name'],term)).order('created_at',{ascending:false}).limit(50);if(error)throw error;return data;}});
 return <section className="rounded-2xl border border-paper-dim bg-white p-4"><form role="search" className="flex items-center gap-2" onSubmit={event=>{event.preventDefault();setTerm(input.trim());}}><Search size={17} className="shrink-0 text-ink-light"/><input aria-label="Search this group" placeholder="Find a message, answer or file" className="min-w-0 flex-1 bg-transparent text-sm outline-none" value={input} minLength={2} maxLength={120} onChange={event=>setInput(event.target.value)} type="search"/><button className="rounded-lg bg-brand-light px-3 py-2 text-xs font-semibold text-brand-dark">Search</button>{term&&<button type="button" className="text-xs text-ink-light" onClick={()=>{setTerm('');setInput('');}}>Clear</button>}</form>
  {term&&<div className="mt-3 space-y-2 border-t pt-3">{query.isPending?<p role="status" className="text-sm">Searching group history…</p>:query.error?<p role="alert" className="text-sm text-flag">Could not search. <button className="underline" onClick={()=>query.refetch()}>Try again</button></p>:query.data?.length?query.data.map(message=><Link key={message.id} to={`/groups/${groupId}?message=${message.id}`} className="block rounded-xl bg-paper p-3"><p className="line-clamp-2 break-words text-sm">{message.body||message.file_name}</p><p className="mt-1 truncate text-xs text-ink-light">{message.file_name||message.kind} · {new Date(message.created_at).toLocaleDateString()}</p></Link>):<p className="text-sm text-ink-light">No matching messages or files in this group.</p>}{query.data?.length===50&&<p className="text-xs text-ink-light">Showing the newest 50 matches. Refine your search for more.</p>}</div>}
 </section>;
}
