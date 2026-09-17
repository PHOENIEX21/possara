import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
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
export function AppLayout(){
 const {userId,signOut}=useAuth(); const {data:unreadCount}=useUnreadNotificationCount(); const {data:unreadMessages}=useUnreadMessageCount(); const navigate=useNavigate(); const location=useLocation(); const [open,setOpen]=useState(false);
 usePresenceHeartbeat();
 const isHome=location.pathname==="/";
 async function logout(){await signOut();setOpen(false);navigate("/")}
 return <div className="min-h-screen bg-paper">
  <header className="app-header"><div className="app-header-inner"><NavLink to="/" className="brand-lockup"><BrandMark/><span>POSSARA</span></NavLink><NavLink to="/search" className="desktop-search"><Search size={17}/><span>Search POSSARA</span><kbd>/</kbd></NavLink><div className="header-actions"><NavLink to="/search" aria-label="Search"><Search size={20}/></NavLink>{userId&&<><NavLink to="/messages" className="relative" aria-label="Messages"><MessageCircle size={20}/>{!!unreadMessages&&unreadMessages>0&&<i/>}</NavLink><NavLink to="/notifications" className="relative"><Bell size={20}/>{!!unreadCount&&unreadCount>0&&<i/>}</NavLink></>}{!userId&&<NavLink to="/signin" className="signin-pill">Sign in</NavLink>}<button onClick={()=>setOpen(!open)} className="mobile-menu-btn" aria-label="Menu">{open?<X/>:<Menu/>}</button></div></div></header>
  {isHome&&<><section className="possara-welcome" aria-label="Welcome to POSSARA"><div className="possara-welcome-inner"><div className="possara-welcome-mark"><Sparkles size={18}/></div><div><p className="possara-welcome-kicker">Welcome to POSSARA</p><h1>See what is possible. Find what moves you forward.</h1><p className="possara-welcome-copy">Discover inspiring people, real opportunities, useful learning and a community built around growth.</p></div></div></section><ExtraordinaryPeople/></>}
  {open&&<div className="mobile-drawer"><div className="mobile-drawer-card overflow-y-auto pb-24">{PRIMARY.map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon} onClick={()=>setOpen(false)}/>)}<p className="drawer-label">Learn & grow</p><LinkRow to="/study" label="POSSARA Study" Icon={BookOpen} onClick={()=>setOpen(false)}/><p className="drawer-label">Explore opportunities</p>{OPPS.map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon} onClick={()=>setOpen(false)}/>)}{userId&&<><p className="drawer-label">Your account</p><LinkRow to="/messages" label="Messages" Icon={MessageCircle} onClick={()=>setOpen(false)}/><LinkRow to="/notifications" label="Notifications" Icon={Bell} onClick={()=>setOpen(false)}/><LinkRow to="/saved" label="Saved" Icon={Bookmark} onClick={()=>setOpen(false)}/><LinkRow to="/settings" label="Settings" Icon={SettingsIcon} onClick={()=>setOpen(false)}/><button onClick={logout} className="nav-row w-full"><LogOut size={19}/>Sign out</button></>}</div></div>}
  <div className="app-shell"><aside className="desktop-sidebar"><nav>{PRIMARY.slice(0,3).map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon}/>)}</nav><p className="drawer-label">Learn & grow</p><nav><LinkRow to="/study" label="POSSARA Study" Icon={BookOpen}/></nav><p className="drawer-label">Opportunities</p><nav>{OPPS.map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon}/>)}</nav><div className="sidebar-divider"/>{userId?<><LinkRow to="/saved" label="Saved" Icon={Bookmark}/><LinkRow to="/messages" label="Messages" Icon={MessageCircle}/><LinkRow to="/profile/me" label="Profile" Icon={User}/><LinkRow to="/settings" label="Settings" Icon={SettingsIcon}/><button onClick={logout} className="nav-row mt-1 w-full"><LogOut size={19}/>Sign out</button></>:<NavLink to="/signin" className="sidebar-cta">Join POSSARA</NavLink>}<p className="sidebar-note">Be inspired. Learn. Find opportunities.<br/>Connect. Move forward.</p></aside><main className="app-main"><Outlet/></main></div>
  <nav className="bottom-nav">{PRIMARY.slice(0,2).map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon}/>)}<NavLink to={userId?"/contribute":"/signin"} className="create-fab" aria-label="Create"><Plus size={24}/></NavLink>{PRIMARY.slice(2).map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon}/>)}</nav>
 </div>
}
