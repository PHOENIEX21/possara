import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Search, Bell, User, LogOut, Menu, X, Home as HomeIcon, Users, Bookmark, Compass, MessageCircle, Plus, Briefcase, GraduationCap, School, Settings as SettingsIcon, BookOpen, Sparkles } from "lucide-react";
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

function SignedOutIntro(){
 const {userId,loading}=useAuth();
 const [visible,setVisible]=useState(false);
 const [leaving,setLeaving]=useState(false);
 useEffect(()=>{
  if(loading||userId)return;
  const key="possara-signed-out-intro-seen";
  if(sessionStorage.getItem(key))return;
  sessionStorage.setItem(key,"1");
  setVisible(true);
  const leaveTimer=window.setTimeout(()=>setLeaving(true),1900);
  const closeTimer=window.setTimeout(()=>setVisible(false),2450);
  return()=>{window.clearTimeout(leaveTimer);window.clearTimeout(closeTimer)};
 },[loading,userId]);
 if(!visible)return null;
 return <div className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#11101a] px-6 text-white transition-opacity duration-500 ${leaving?"opacity-0":"opacity-100"}`} role="status" aria-label="Welcome to POSSARA">
  <style>{`@keyframes possaraFloat{0%,100%{transform:translate3d(0,0,0) rotate(-2deg)}50%{transform:translate3d(0,-16px,0) rotate(2deg)}}@keyframes possaraOrbit{from{transform:rotate(0deg) translateX(62px) rotate(0deg)}to{transform:rotate(360deg) translateX(62px) rotate(-360deg)}}@keyframes possaraWord{0%{opacity:0;transform:translateY(14px);letter-spacing:.34em}100%{opacity:1;transform:translateY(0);letter-spacing:.14em}}@keyframes possaraGlow{0%,100%{opacity:.35;transform:scale(.92)}50%{opacity:.75;transform:scale(1.08)}}`}</style>
  <div className="pointer-events-none absolute inset-0"><div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl" style={{animation:"possaraGlow 2.3s ease-in-out infinite"}}/><div className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-white/80 shadow-[0_0_22px_rgba(255,255,255,.65)]" style={{animation:"possaraOrbit 3.6s linear infinite"}}/><div className="absolute left-[23%] top-[28%] h-1.5 w-1.5 rounded-full bg-white/35"/><div className="absolute right-[20%] top-[34%] h-2 w-2 rounded-full bg-violet-300/45"/><div className="absolute bottom-[24%] left-[31%] h-1 w-1 rounded-full bg-white/45"/></div>
  <div className="relative flex flex-col items-center text-center">
   <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/10 bg-white/[.06] shadow-2xl backdrop-blur-md" style={{animation:"possaraFloat 2.4s ease-in-out infinite"}}><BrandMark className="h-16 w-16 text-white"/></div>
   <p className="mt-6 text-[11px] font-semibold uppercase text-white/45" style={{animation:"possaraWord .8s .2s both"}}>POSSARA</p>
   <h1 className="mt-3 max-w-sm text-2xl font-bold leading-tight sm:text-3xl">Find what moves you forward.</h1>
   <p className="mt-2 max-w-xs text-sm leading-6 text-white/60">People. Opportunities. Learning. Growth.</p>
  </div>
 </div>;
}

export function AppLayout(){
 const {userId,signOut}=useAuth(); const {data:unreadCount}=useUnreadNotificationCount(); const {data:unreadMessages}=useUnreadMessageCount(); const location=useLocation(); const [open,setOpen]=useState(false);
 usePresenceHeartbeat();
 const isHome=location.pathname==="/";
 async function logout(){setOpen(false);await signOut();window.location.replace("/signin")}
 return <div className="min-h-screen bg-paper">
  <SignedOutIntro/>
  <header className="app-header"><div className="app-header-inner"><NavLink to="/" className="brand-lockup"><BrandMark/><span>POSSARA</span></NavLink><NavLink to="/search" className="desktop-search"><Search size={17}/><span>Search POSSARA</span><kbd>/</kbd></NavLink><div className="header-actions"><NavLink to="/search" aria-label="Search"><Search size={20}/></NavLink>{userId&&<><NavLink to="/messages" className="relative" aria-label="Messages"><MessageCircle size={20}/>{!!unreadMessages&&unreadMessages>0&&<i/>}</NavLink><NavLink to="/notifications" className="relative"><Bell size={20}/>{!!unreadCount&&unreadCount>0&&<i/>}</NavLink></>}{!userId&&<NavLink to="/signin" className="signin-pill">Sign in</NavLink>}<button onClick={()=>setOpen(!open)} className="mobile-menu-btn" aria-label="Menu">{open?<X/>:<Menu/>}</button></div></div></header>
  {isHome&&<><section className="possara-welcome" aria-label="Welcome to POSSARA"><div className="possara-welcome-inner"><div className="possara-welcome-mark"><Sparkles size={18}/></div><div><p className="possara-welcome-kicker">Welcome to POSSARA</p><h1>See what is possible. Find what moves you forward.</h1><p className="possara-welcome-copy">Discover inspiring people, real opportunities, useful learning and a community built around growth.</p></div></div></section><ExtraordinaryPeople/></>}
  {open&&<div className="mobile-drawer"><div className="mobile-drawer-card overflow-y-auto pb-24">{PRIMARY.map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon} onClick={()=>setOpen(false)}/>)}<p className="drawer-label">Learn & grow</p><LinkRow to="/study" label="POSSARA Study" Icon={BookOpen} onClick={()=>setOpen(false)}/><p className="drawer-label">Explore opportunities</p>{OPPS.map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon} onClick={()=>setOpen(false)}/>)}{userId&&<><p className="drawer-label">Your account</p><LinkRow to="/messages" label="Messages" Icon={MessageCircle} onClick={()=>setOpen(false)}/><LinkRow to="/notifications" label="Notifications" Icon={Bell} onClick={()=>setOpen(false)}/><LinkRow to="/saved" label="Saved" Icon={Bookmark} onClick={()=>setOpen(false)}/><LinkRow to="/settings" label="Settings" Icon={SettingsIcon} onClick={()=>setOpen(false)}/><button onClick={logout} className="nav-row w-full"><LogOut size={19}/>Sign out</button></>}</div></div>}
  <div className="app-shell"><aside className="desktop-sidebar"><nav>{PRIMARY.slice(0,3).map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon}/>)}</nav><p className="drawer-label">Learn & grow</p><nav><LinkRow to="/study" label="POSSARA Study" Icon={BookOpen}/></nav><p className="drawer-label">Opportunities</p><nav>{OPPS.map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon}/>)}</nav><div className="sidebar-divider"/>{userId?<><LinkRow to="/saved" label="Saved" Icon={Bookmark}/><LinkRow to="/messages" label="Messages" Icon={MessageCircle}/><LinkRow to="/profile/me" label="Profile" Icon={User}/><LinkRow to="/settings" label="Settings" Icon={SettingsIcon}/><button onClick={logout} className="nav-row mt-1 w-full"><LogOut size={19}/>Sign out</button></>:<NavLink to="/signin" className="sidebar-cta">Join POSSARA</NavLink>}<p className="sidebar-note">Be inspired. Learn. Find opportunities.<br/>Connect. Move forward.</p></aside><main className="app-main"><Outlet/></main></div>
  <nav className="bottom-nav">{PRIMARY.slice(0,2).map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon}/>)}<NavLink to={userId?"/contribute":"/signin"} className="create-fab" aria-label="Create"><Plus size={24}/></NavLink>{PRIMARY.slice(2).map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon}/>)}</nav>
 </div>
}
