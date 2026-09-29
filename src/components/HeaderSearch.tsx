import {useEffect,useRef,useState} from "react";
import {useNavigate} from "react-router-dom";
import {Search,X} from "lucide-react";
export function HeaderSearch(){
 const [open,setOpen]=useState(false);const [term,setTerm]=useState("");const input=useRef<HTMLInputElement>(null);const button=useRef<HTMLButtonElement>(null);const container=useRef<HTMLDivElement>(null);const navigate=useNavigate();
 function close(){setOpen(false);button.current?.focus();}
 useEffect(()=>{if(open)input.current?.focus();},[open]);
 useEffect(()=>{if(!open)return;const outside=(event:PointerEvent)=>{if(!container.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[open]);
 return <div ref={container}>
  <button ref={button} type="button" aria-label="Search POSSARA" aria-expanded={open} aria-controls="header-search-form" className="flex h-8 w-8 items-center justify-center rounded-full text-ink-light hover:bg-paper-dim hover:text-ink" onClick={()=>setOpen(value=>!value)}><Search size={20}/></button>
  {open&&<form id="header-search-form" role="search" className="absolute inset-x-3 top-2 z-50 mx-auto flex h-11 max-w-2xl items-center gap-2 rounded-xl border border-brand/30 bg-white px-3 shadow-lg" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();close();}}} onSubmit={event=>{event.preventDefault();if(term.trim().length<2)return;navigate(`/search?q=${encodeURIComponent(term.trim())}`);setOpen(false);}}>
   <Search size={18} className="shrink-0 text-brand-dark"/><input ref={input} type="search" aria-label="Search people, posts and opportunities" placeholder="People, posts, jobs, groups…" className="min-w-0 flex-1 bg-transparent text-base outline-none" value={term} maxLength={120} minLength={2} required onChange={event=>setTerm(event.target.value)}/><button type="submit" className="rounded-lg bg-brand-light px-2 py-1 text-xs font-semibold text-brand-dark">Search</button><button type="button" aria-label="Close search" onClick={close} className="p-1 text-ink-light"><X size={18}/></button>
  </form>}
 </div>;
}
