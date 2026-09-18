import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Search, Bell, User, LogOut, Menu, X, Home as HomeIcon, Users, Bookmark, Compass, MessageCircle, Plus, Briefcase, GraduationCap, School, Settings as SettingsIcon, BookOpen, Sparkles, ShieldCheck, Crown, Radar } from "lucide-react";
import { useAuth } from "../store/auth";
import { useUnreadNotificationCount } from "../hooks/useUnreadNotificationCount";
import { useUnreadMessageCount } from "../hooks/useUnreadMessageCount";
import { usePresenceHeartbeat } from "../hooks/useSocialPrivacy";
import { BrandMark } from "../components/BrandMark";
import { ExtraordinaryPeople } from "../components/ExtraordinaryPeople";

const PRIMARY = [
 {to:"/",label:"Home",icon:HomeIcon}, {to:"/opportunities",label:"Opportunities",icon:Compass}, {to:"/connect",label:"Connect",icon:Users}, {to:"/profile/me",label:"Profile",icon:User},
];
const OPPS = [{to:"/jobs",label:"Jobs",icon:Briefcase},{to:"/scholarships",label:"Scholarships",icon:GraduationCap},{to:"/admissions",label:"Admissions",icon:School}];
function LinkRow({to,label,Icon,onClick}:{to:string;label:string;Icon:typeof HomeIcon;onClick?:()=>void}){return <NavLink to={to} end={to==="/"} onClick={onClick} className={({isActive})=>`nav-row ${isActive?"nav-row-active":""}`}><Icon size={19}/><span>{label}</span></NavLink>}

function SessionTransition(){
 const [kind,setKind]=useState<"signup"|"logout"|null>(null);
 useEffect(()=>{
   const value=sessionStorage.getItem("possara-transition");
   if(value!=="signup"&&value!=="logout")return;
   sessionStorage.removeItem("possara-transition");
   setKind(value);
   const timer=window.setTimeout(()=>setKind(null),2200);
   return()=>window.clearTimeout(timer);
 },[]);
 if(!kind)return null;
 const signup=kind==="signup";
 return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#11101a] px-6 text-white" role="status" aria-live="polite">
   <style>{`@keyframes possaraOnce{0%{opacity:0;transform:scale(.88) translateY(10px)}35%{opacity:1;transform:scale(1.03) translateY(0)}75%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.98)}}`}</style>
   <div className="flex flex-col items-center text-center" style={{animation:"possaraOnce 2.15s ease both"}}>
     <div className="flex h-28 w-28 items-center justify-center rounded-[2.2rem] border border-white/10 bg-white/[.06] shadow-2xl"><BrandMark className="h-[72px] w-[72px] text-white"/></div>
     <p className="mt-6 text-[11px] font-semibold uppercase tracking-[.16em] text-white/50">POSSARA</p>
     <h1 className="mt-2 text-2xl font-bold">{signup?"Welcome to POSSARA.":"See you again."}</h1>
     <p className="mt-2 max-w-xs text-sm leading-6 text-white/60">{signup?"Your account is ready. Start discovering people, growth and opportunities.":"Your POSSARA session has ended securely."}</p>
   </div>
 </div>;
}

export function AppLayout(){
 const {userId,role,isVerified,signOut}=useAuth(); const {data:unreadCount}=useUnreadNotificationCount(); const {data:unreadMessages}=useUnreadMessageCount(); const location=useLocation(); const [open,setOpen]=useState(false);
 usePresenceHeartbeat();
 const isHome=location.pathname==="/";
 const isAdmin=role==="admin"&&isVerified;
 async function logout(){setOpen(false);sessionStorage.setItem("possara-transition","logout");await signOut();window.location.replace("/signin")}
 return <div className="min-h-screen bg-paper">
  <SessionTransition/>
  <header className="app-header"><div className="app-header-inner"><NavLink to="/" className="brand-lockup"><BrandMark/><span>POSSARA</span></NavLink><NavLink to="/search" className="desktop-search"><Search size={17}/><span>Search POSSARA</span><kbd>/</kbd></NavLink><div className="header-actions"><NavLink to="/search" aria-label="Search"><Search size={20}/></NavLink>{userId&&<><NavLink to="/messages" className="relative" aria-label="Messages"><MessageCircle size={20}/>{!!unreadMessages&&unreadMessages>0&&<i/>}</NavLink><NavLink to="/notifications" className="relative" aria-label="Notifications"><Bell size={20}/>{!!unreadCount&&unreadCount>0&&<i/>}</NavLink></>}{!userId&&<NavLink to="/signin" className="signin-pill">Sign in</NavLink>}<button onClick={()=>setOpen(!open)} className="mobile-menu-btn" aria-label="Menu">{open?<X/>:<Menu/>}</button></div></div></header>
  {isHome&&<><section className="possara-welcome" aria-label="Welcome to POSSARA"><div className="possara-welcome-inner"><div className="possara-welcome-mark"><Sparkles size={18}/></div><div><p className="possara-welcome-kicker">Welcome to POSSARA</p><h1>See what is possible. Find what moves you forward.</h1><p className="possara-welcome-copy">Discover inspiring people, real opportunities, useful learning and a community built around growth.</p></div></div></section><ExtraordinaryPeople/></>}
  {open&&<div className="mobile-drawer"><div className="mobile-drawer-card overflow-y-auto pb-24">{PRIMARY.map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon} onClick={()=>setOpen(false)}/>)}<p className="drawer-label">Learn & grow</p><LinkRow to="/study" label="POSSARA Study" Icon={BookOpen} onClick={()=>setOpen(false)}/><LinkRow to="/plus" label="POSSARA+" Icon={Crown} onClick={()=>setOpen(false)}/><p className="drawer-label">Explore opportunities</p>{OPPS.map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon} onClick={()=>setOpen(false)}/>)}{userId&&<><p className="drawer-label">Your progress</p><LinkRow to="/applications" label="Applications" Icon={Briefcase} onClick={()=>setOpen(false)}/><LinkRow to="/passport" label="Growth Passport" Icon={Sparkles} onClick={()=>setOpen(false)}/><p className="drawer-label">Your account</p>{isAdmin&&<><LinkRow to="/admin" label="Admin" Icon={ShieldCheck} onClick={()=>setOpen(false)}/><LinkRow to="/admin/opportunity-discovery" label="Opportunity engine" Icon={Radar} onClick={()=>setOpen(false)}/></>}<LinkRow to="/messages" label="Messages" Icon={MessageCircle} onClick={()=>setOpen(false)}/><LinkRow to="/notifications" label="Notifications" Icon={Bell} onClick={()=>setOpen(false)}/><LinkRow to="/saved" label="Saved" Icon={Bookmark} onClick={()=>setOpen(false)}/><LinkRow to="/settings" label="Settings" Icon={SettingsIcon} onClick={()=>setOpen(false)}/><button onClick={logout} className="nav-row w-full"><LogOut size={19}/>Sign out</button></>}</div></div>}
  <div className="app-shell"><aside className="desktop-sidebar"><nav>{PRIMARY.slice(0,3).map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon}/>)}</nav><p className="drawer-label">Learn & grow</p><nav><LinkRow to="/study" label="POSSARA Study" Icon={BookOpen}/><LinkRow to="/plus" label="POSSARA+" Icon={Crown}/></nav><p className="drawer-label">Opportunities</p><nav>{OPPS.map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon}/>)}</nav><div className="sidebar-divider"/>{userId?<>{isAdmin&&<><LinkRow to="/admin" label="Admin" Icon={ShieldCheck}/><LinkRow to="/admin/opportunity-discovery" label="Opportunity engine" Icon={Radar}/></>}<LinkRow to="/applications" label="Applications" Icon={Briefcase}/><LinkRow to="/passport" label="Growth Passport" Icon={Sparkles}/><LinkRow to="/saved" label="Saved" Icon={Bookmark}/><LinkRow to="/messages" label="Messages" Icon={MessageCircle}/><LinkRow to="/profile/me" label="Profile" Icon={User}/><LinkRow to="/settings" label="Settings" Icon={SettingsIcon}/><button onClick={logout} className="nav-row mt-1 w-full"><LogOut size={19}/>Sign out</button></>:<NavLink to="/signin" className="sidebar-cta">Join POSSARA</NavLink>}<p className="sidebar-note">Be inspired. Learn. Find opportunities.<br/>Connect. Move forward.</p></aside><main className="app-main"><Outlet/></main></div>
  <nav className="bottom-nav">{PRIMARY.slice(0,2).map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon}/>)}<NavLink to={userId?"/contribute":"/signin"} className="create-fab" aria-label="Create"><Plus size={24}/></NavLink>{PRIMARY.slice(2).map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon}/>)}</nav>
 </div>
}
