import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Search, Bell, User, LogOut, Menu, X, Home as HomeIcon, Users, Bookmark, Compass, MessageCircle, Plus, Briefcase, GraduationCap, School, Settings as SettingsIcon, BookOpen, Sparkles, ShieldCheck, Crown, Radar } from "lucide-react";
import { useAuth } from "../store/auth";
import { useUnreadNotificationCount } from "../hooks/useUnreadNotificationCount";
import { useUnreadMessageCount } from "../hooks/useUnreadMessageCount";
import { usePresenceHeartbeat } from "../hooks/useSocialPrivacy";
import { BrandMark } from "../components/BrandMark";
import { ExtraordinaryPeople } from "../components/ExtraordinaryPeople";
import { InstallAppButton } from "../components/InstallAppButton";
import { useMyOrganizations } from "../hooks/useHiring";

const PRIMARY = [
 {to:"/",label:"Home",icon:HomeIcon}, {to:"/opportunities",label:"Opportunities",icon:Compass}, {to:"/connect",label:"Connect",icon:Users}, {to:"/profile/me",label:"Profile",icon:User},
];
const OPPS = [{to:"/jobs",label:"Jobs",icon:Briefcase},{to:"/scholarships",label:"Scholarships",icon:GraduationCap},{to:"/admissions",label:"Admissions",icon:School}];
function LinkRow({to,label,Icon,onClick}:{to:string;label:string;Icon:typeof HomeIcon;onClick?:()=>void}){const location=useLocation();function activate(){if(location.pathname===to||(to==="/"&&location.pathname==="/"))window.scrollTo({top:0,behavior:"smooth"});onClick?.();}return <NavLink to={to} end={to==="/"} onClick={activate} className={({isActive})=>`nav-row ${isActive?"nav-row-active":""}`}><Icon size={19}/><span>{label}</span></NavLink>}

function OrganizationSwitcher({close}:{close?:()=>void}){const {data}=useMyOrganizations();const orgs=(data??[]).map((x:any)=>x.organizations).filter(Boolean);if(!orgs.length)return <NavLink to="/organizations/register" onClick={close} className="nav-row"><Briefcase size={19}/><span>Register organization</span></NavLink>;return <div><p className="drawer-label">Work as organization</p>{orgs.map((org:any)=><NavLink key={org.id} to="/organizations/manage" onClick={()=>{localStorage.setItem("possara-active-organization",org.id);close?.();}} className="nav-row">{org.logo_url?<img src={org.logo_url} alt="" className="h-5 w-5 rounded-md object-cover"/>:<Briefcase size={19}/>}<span className="truncate">{org.name}</span></NavLink>)}</div>}
function EntryExperience(){
  const [transition,setTransition]=useState<"signup"|"logout"|null>(null);
  const [leaving,setLeaving]=useState(false);

  useEffect(()=>{
    const value=sessionStorage.getItem("possara-transition");
    if(value!=="signup"&&value!=="logout")return;
    sessionStorage.removeItem("possara-transition");
    setTransition(value);
    const leaveTimer=window.setTimeout(()=>setLeaving(true),1700);
    const closeTimer=window.setTimeout(()=>setTransition(null),2300);
    return()=>{window.clearTimeout(leaveTimer);window.clearTimeout(closeTimer);};
  },[]);

  if(!transition)return null;
  const signup=transition==="signup";

  return <div className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#11101a] px-6 text-white transition-opacity duration-700 ${leaving?"opacity-0":"opacity-100"}`} role="status" aria-live="polite" aria-label={signup?"Welcome to POSSARA":"Leaving POSSARA"}>
    <style>{`@keyframes possaraFloat{0%,100%{transform:translate3d(0,2px,0) rotate(-1.5deg)}50%{transform:translate3d(0,-15px,0) rotate(1.5deg)}}@keyframes possaraWord{0%{opacity:0;transform:translateY(12px);letter-spacing:.34em}100%{opacity:1;transform:translateY(0);letter-spacing:.14em}}@keyframes possaraReveal{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}`}</style>
    <div className="relative flex w-full max-w-md flex-col items-center text-center">
      <div className="flex h-28 w-28 items-center justify-center rounded-[2.2rem] border border-white/10 bg-white/[.06] shadow-2xl backdrop-blur-md" style={{animation:"possaraFloat 3.2s ease-in-out infinite"}}><BrandMark className="h-[72px] w-[72px] text-white"/></div>
      <p className="mt-7 text-[11px] font-semibold uppercase text-white/45" style={{animation:"possaraWord .9s .1s both"}}>POSSARA</p>
      <div style={{animation:"possaraReveal .7s .45s both"}}>
        <h1 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">{signup?"Welcome to POSSARA.":"See you again."}</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-white/60">{signup?"Your account is ready. Start discovering people, opportunities and progress.":"Your session has ended safely."}</p>
      </div>
    </div>
  </div>;
}
export function AppLayout(){
 const {userId,role,isVerified,signOut}=useAuth(); const {data:unreadCount}=useUnreadNotificationCount(); const {data:unreadMessages}=useUnreadMessageCount(); const location=useLocation(); const navigate=useNavigate(); const [open,setOpen]=useState(false);
 usePresenceHeartbeat();
 const isHome=location.pathname==="/";
 const isAdmin=role==="admin"&&isVerified;
 async function logout(){setOpen(false);sessionStorage.setItem("possara-transition","logout");await signOut();window.location.replace("/signin")} function create(){if(!userId){navigate("/signin");return;}const orgId=localStorage.getItem("possara-active-organization");if(orgId)navigate("/organizations/manage");else navigate("/contribute");}
 return <div className="min-h-screen bg-paper pt-[60px] sm:pt-16">
  <EntryExperience/>
  <header className="app-header"><div className="app-header-inner"><NavLink to="/" className="brand-lockup"><BrandMark/><span>POSSARA</span></NavLink><NavLink to="/search" className="desktop-search"><Search size={17}/><span>Search POSSARA</span><kbd>/</kbd></NavLink><div className="header-actions">{!isHome&&<NavLink to="/search" aria-label="Search"><Search size={20}/></NavLink>}{userId&&<><NavLink to="/messages" className="relative" aria-label="Messages"><MessageCircle size={20}/>{!!unreadMessages&&unreadMessages>0&&<i/>}</NavLink><NavLink to="/notifications" className="relative" aria-label="Notifications"><Bell size={20}/>{!!unreadCount&&unreadCount>0&&<i/>}</NavLink></>}{!userId&&<NavLink to="/signin" className="signin-pill">Sign in</NavLink>}<button onClick={()=>setOpen(!open)} className="mobile-menu-btn" aria-label="Menu">{open?<X/>:<Menu/>}</button></div></div></header>
  {isHome&&<><section className="possara-welcome" aria-label="Welcome to POSSARA"><div className="possara-welcome-inner"><div className="possara-welcome-mark"><Sparkles size={18}/></div><div><p className="possara-welcome-kicker">Welcome to POSSARA</p><h1>See what is possible. Find what moves you forward.</h1><p className="possara-welcome-copy">Discover inspiring people, real opportunities, useful learning and a community built around growth.</p></div></div></section><ExtraordinaryPeople/></>}
  {open&&<div className="mobile-drawer"><div className="mobile-drawer-card overflow-y-auto pb-24">{PRIMARY.map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon} onClick={()=>setOpen(false)}/>)}<p className="drawer-label">Learn & grow</p><LinkRow to="/study" label="POSSARA Study" Icon={BookOpen} onClick={()=>setOpen(false)}/><LinkRow to="/plus" label="POSSARA+" Icon={Crown} onClick={()=>setOpen(false)}/><p className="drawer-label">Explore opportunities</p>{OPPS.map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon} onClick={()=>setOpen(false)}/>)}{userId&&<><OrganizationSwitcher close={()=>setOpen(false)}/><p className="drawer-label">Your progress</p><LinkRow to="/applications" label="Applications" Icon={Briefcase} onClick={()=>setOpen(false)}/><LinkRow to="/passport" label="Growth Passport" Icon={Sparkles} onClick={()=>setOpen(false)}/><p className="drawer-label">Your account</p>{isAdmin&&<><LinkRow to="/admin" label="Admin" Icon={ShieldCheck} onClick={()=>setOpen(false)}/><LinkRow to="/admin/opportunity-discovery" label="Opportunity engine" Icon={Radar} onClick={()=>setOpen(false)}/></>}<LinkRow to="/messages" label="Messages" Icon={MessageCircle} onClick={()=>setOpen(false)}/><LinkRow to="/notifications" label="Notifications" Icon={Bell} onClick={()=>setOpen(false)}/><LinkRow to="/saved" label="Saved" Icon={Bookmark} onClick={()=>setOpen(false)}/><LinkRow to="/settings" label="Settings" Icon={SettingsIcon} onClick={()=>setOpen(false)}/><InstallAppButton className="nav-row w-full"/><button onClick={logout} className="nav-row w-full"><LogOut size={19}/>Sign out</button></>}</div></div>}
  <div className="app-shell"><aside className="desktop-sidebar"><nav>{PRIMARY.slice(0,3).map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon}/>)}</nav><p className="drawer-label">Learn & grow</p><nav><LinkRow to="/study" label="POSSARA Study" Icon={BookOpen}/><LinkRow to="/plus" label="POSSARA+" Icon={Crown}/></nav><p className="drawer-label">Opportunities</p><nav>{OPPS.map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon}/>)}</nav><div className="sidebar-divider"/>{userId?<><OrganizationSwitcher/>{isAdmin&&<><LinkRow to="/admin" label="Admin" Icon={ShieldCheck}/><LinkRow to="/admin/opportunity-discovery" label="Opportunity engine" Icon={Radar}/></>}<LinkRow to="/applications" label="Applications" Icon={Briefcase}/><LinkRow to="/passport" label="Growth Passport" Icon={Sparkles}/><LinkRow to="/saved" label="Saved" Icon={Bookmark}/><LinkRow to="/messages" label="Messages" Icon={MessageCircle}/><LinkRow to="/profile/me" label="Profile" Icon={User}/><LinkRow to="/settings" label="Settings" Icon={SettingsIcon}/><InstallAppButton className="nav-row w-full"/><button onClick={logout} className="nav-row mt-1 w-full"><LogOut size={19}/>Sign out</button></>:<NavLink to="/signin" className="sidebar-cta">Join POSSARA</NavLink>}<p className="sidebar-note">Be inspired. Learn. Find opportunities.<br/>Connect. Move forward.</p></aside><main className="app-main"><Outlet/></main></div>
  <nav className="bottom-nav">{PRIMARY.slice(0,2).map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon}/>)}<button type="button" onClick={create} className="create-fab" aria-label={localStorage.getItem("possara-active-organization")?"Create as organization":"Create post"}><Plus size={24}/></button>{PRIMARY.slice(2).map(i=><LinkRow key={i.to} to={i.to} label={i.label} Icon={i.icon}/>)}</nav>
 </div>
}
