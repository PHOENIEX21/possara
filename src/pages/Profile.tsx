import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Camera, MessageCircle, MoreHorizontal, Pencil, Search, UserCheck, UserPlus } from "lucide-react";
import { useAuth } from "../store/auth";
import { useProfileById, useProfileByUsername, useOwnProfile, useUpdateOwnProfile } from "../hooks/useProfile";
import { useFollowCounts, useFollowStatus, useToggleFollow } from "../hooks/useFollow";
import { useOpportunityCategories } from "../components/CategoryChips";
import { useAvatarUpload } from "../hooks/useAvatarUpload";
import { useCoverUpload } from "../hooks/useCoverUpload";
import { useFeedPosts } from "../hooks/useFeedPosts";
import { PostCard } from "../components/PostCard";
import { ProfilePhotoViewer } from "../components/ProfilePhotoViewer";
import type { Profile as ProfileType } from "../types/database";

function FollowButton({ targetUserId }: { targetUserId: string }) {
  const { userId } = useAuth();
  const { data: isFollowing } = useFollowStatus(targetUserId);
  const toggle = useToggleFollow(targetUserId);

  if (!userId || userId === targetUserId) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => toggle.mutate(!!isFollowing)}
        disabled={toggle.isPending}
        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium ${
          isFollowing ? "border border-ink-faint/30 text-ink-light" : "bg-ink text-white"
        }`}
      >
        {isFollowing ? <UserCheck size={15} /> : <UserPlus size={15} />}
        {toggle.isPending ? "Working…" : isFollowing ? "Following" : "Follow"}
      </button>
      {toggle.error && <span className="max-w-48 text-right text-[11px] text-flag">{(toggle.error as Error).message}</span>}
    </div>
  );
}

function MessageButton({ targetUserId }: { targetUserId: string }) {
  const { userId } = useAuth();
  const navigate = useNavigate();
  if (!userId || userId === targetUserId) return null;
  return <button type="button" onClick={() => navigate(`/messages/${targetUserId}`)} className="inline-flex items-center gap-1.5 rounded-full border border-ink-faint/30 px-4 py-1.5 text-sm font-medium"><MessageCircle size={15}/>Message</button>;
}

type SocialKind = "instagram" | "x" | "tiktok" | "linkedin" | "youtube" | "facebook" | "website";

function socialHref(kind: SocialKind, raw: string) {
  const value = raw.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const handle = value.replace(/^@/, "").replace(/^\/+|\/+$/g, "");
  if (kind === "instagram") return `https://instagram.com/${handle}`;
  if (kind === "x") return `https://x.com/${handle}`;
  if (kind === "tiktok") return `https://www.tiktok.com/@${handle}`;
  if (kind === "linkedin") return `https://www.linkedin.com/in/${handle}`;
  if (kind === "youtube") return `https://www.youtube.com/@${handle}`;
  if (kind === "facebook") return `https://www.facebook.com/${handle}`;
  return `https://${handle}`;
}

function SocialIcon({ label, symbol, href }: { label: string; symbol: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-paper-dim bg-white text-[13px] font-bold text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-brand/30 hover:text-brand-dark"
    >
      <span aria-hidden="true">{symbol}</span>
    </a>
  );
}

type ProfileMediaItem = { id:string; postId:string; src:string; createdAt:string; caption:string };

function localDateKey(value: string) {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
}

function ProfilePosts({ profileId }: { profileId: string }) {
  const { data: posts, isLoading, error } = useFeedPosts({ authorId: profileId });
  const [tab, setTab] = useState<"posts"|"photos">("posts");
  const [selectedPhoto, setSelectedPhoto] = useState<ProfileMediaItem|null>(null);
  const [keyword, setKeyword] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const filteredPosts = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return (posts ?? []).filter(post => {
      const matchesKeyword = !needle || `${post.content} ${post.topic ?? ""}`.toLowerCase().includes(needle);
      const matchesDate = !dateFilter || localDateKey(post.created_at) === dateFilter;
      return matchesKeyword && matchesDate;
    });
  }, [posts, keyword, dateFilter]);

  const photoGroups = useMemo(() => {
    const media: ProfileMediaItem[] = filteredPosts.flatMap(post => (post.media_urls ?? []).map((src,index)=>({ id:`${post.id}-${index}`, postId:post.id, src, createdAt:post.created_at, caption:post.content })));
    const grouped = new Map<string,{label:string;timestamp:number;items:ProfileMediaItem[]}>();
    media.forEach(item => {
      const date = new Date(item.createdAt);
      const key = localDateKey(item.createdAt);
      if (!grouped.has(key)) grouped.set(key,{ label:date.toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"}), timestamp:new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime(), items:[] });
      grouped.get(key)!.items.push(item);
    });
    return [...grouped.values()].sort((a,b)=>b.timestamp-a.timestamp);
  }, [filteredPosts]);

  const photoCount = photoGroups.reduce((total,group)=>total+group.items.length,0);
  const filtering = !!keyword.trim() || !!dateFilter;
  const dateLabel = dateFilter ? new Date(`${dateFilter}T00:00:00`).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}) : "Search by date";

  return (
    <section className="max-w-2xl">
      <div className="mb-3 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-paper-dim bg-white p-1 shadow-sm" aria-label="Profile content view">
            <button type="button" onClick={()=>setTab("posts")} className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab==="posts"?"bg-ink text-white":"text-ink-light hover:bg-paper"}`}>Posts</button>
            <button type="button" onClick={()=>setTab("photos")} className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab==="photos"?"bg-ink text-white":"text-ink-light hover:bg-paper"}`}>Photos{photoCount>0?` · ${photoCount}`:""}</button>
          </div>
          <span className="text-xs text-ink-faint">{tab==="posts"?"Newest first":"Grouped by date"}</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_190px_auto]">
          <label className="flex items-center gap-2 rounded-xl border border-paper-dim bg-white px-3 py-2 shadow-sm">
            <Search size={15} className="shrink-0 text-ink-faint"/>
            <input value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="Search posts by keyword" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-faint"/>
          </label>
          <label className="relative flex min-h-11 cursor-pointer items-center gap-2 overflow-hidden rounded-xl border border-paper-dim bg-white px-3 py-2 shadow-sm focus-within:border-brand">
            <CalendarDays size={16} className="shrink-0 text-ink-faint"/>
            <span className={`min-w-0 flex-1 truncate text-sm ${dateFilter?"text-ink":"text-ink-faint"}`}>{dateLabel}</span>
            <input type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)} aria-label="Search profile posts by date" className="absolute inset-0 h-full w-full cursor-pointer opacity-0"/>
          </label>
          {filtering&&<button type="button" onClick={()=>{setKeyword("");setDateFilter("");}} className="rounded-xl border border-paper-dim bg-white px-3 py-2 text-sm font-medium text-ink-light shadow-sm hover:bg-paper">Clear</button>}
        </div>
      </div>

      {isLoading&&<div className="feed-skeleton"/>}
      {error&&<p className="text-sm text-flag">Couldn&apos;t load profile activity.</p>}

      {!isLoading&&!error&&tab==="posts"&&(
        <div className="space-y-3">
          {filteredPosts.length===0&&<div className="rounded-2xl border border-paper-dim bg-white p-5 text-sm text-ink-light">{filtering?"No posts match that search.":"No posts yet."}</div>}
          {filteredPosts.map(post=><PostCard key={post.id} post={post}/>)}
        </div>
      )}

      {!isLoading&&!error&&tab==="photos"&&(
        <div className="space-y-5 rounded-2xl border border-paper-dim bg-white p-3 shadow-sm sm:p-4">
          {photoGroups.length===0&&<div className="py-8 text-center text-sm text-ink-light">{filtering?"No photos match that search/date.":"No post photos yet."}</div>}
          {photoGroups.map(group=><section key={group.timestamp}>
            <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold text-ink">{group.label}</h3><span className="text-[11px] text-ink-faint">{group.items.length} {group.items.length===1?"photo":"photos"}</span></div>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {group.items.map(item=><button key={item.id} type="button" onClick={()=>setSelectedPhoto(item)} className="group relative aspect-square overflow-hidden rounded-lg bg-paper-dim" aria-label={`View photo from ${group.label}`}>
                <img src={item.src} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"/>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2 pb-1.5 pt-5 text-left text-[10px] text-white opacity-0 transition group-hover:opacity-100">View photo</span>
              </button>)}
            </div>
          </section>)}
        </div>
      )}

      {selectedPhoto&&<ProfilePhotoViewer src={selectedPhoto.src} name={selectedPhoto.caption.trim()?selectedPhoto.caption.slice(0,80):"POSSARA post photo"} onClose={()=>setSelectedPhoto(null)} downloadable/>}
    </section>
  );
}

type ProfileViewProps={ profile:ProfileType; own?:boolean; onEdit?:()=>void; onOwnCoverClick?:()=>void; onRemoveCover?:()=>void; coverUploading?:boolean };

function ProfileView({profile,own=false,onEdit,onOwnCoverClick,onRemoveCover,coverUploading=false}:ProfileViewProps){
  const {data:counts}=useFollowCounts(profile.id);
  const [photoOpen,setPhotoOpen]=useState(false);
  const [profileMenuOpen,setProfileMenuOpen]=useState(false);
  const name=profile.full_name??"Member";
  const socialLinks = [
    {kind:"instagram" as const,label:"Instagram",symbol:"◎",value:profile.instagram_url},
    {kind:"x" as const,label:"X",symbol:"X",value:profile.x_url},
    {kind:"tiktok" as const,label:"TikTok",symbol:"♪",value:profile.tiktok_url},
    {kind:"linkedin" as const,label:"LinkedIn",symbol:"in",value:profile.linkedin_url},
    {kind:"youtube" as const,label:"YouTube",symbol:"▶",value:profile.youtube_url},
    {kind:"facebook" as const,label:"Facebook",symbol:"f",value:profile.facebook_url},
    {kind:"website" as const,label:"Website",symbol:"↗",value:profile.website},
  ].filter(item=>!!item.value);

  const avatarContent=profile.avatar_url?<img src={profile.avatar_url} alt="" className="relative z-20 h-20 w-20 rounded-full border-4 border-white bg-white object-cover shadow-lg"/>:<div className="relative z-20 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-trust-light text-2xl text-trust-dark shadow-lg">{name.charAt(0).toUpperCase()}</div>;

  return <>
    <div className="max-w-2xl rounded-3xl border border-black/[.06] bg-white shadow-card">
      <div className="relative z-0 h-32 overflow-hidden rounded-t-3xl bg-gradient-to-br from-brand-light via-paper-dim to-trust-light sm:h-40">{profile.cover_url&&<img src={profile.cover_url} alt="" className="h-full w-full object-cover"/>}</div>
      <div className="relative z-10 px-5 pb-6">
        <div className="relative -mt-10 flex items-end justify-between gap-3">
          {profile.avatar_url?<button type="button" onClick={()=>setPhotoOpen(true)} className="relative z-20 rounded-full bg-white transition hover:scale-[1.02]" aria-label={`View ${name} profile photo`} title="View profile photo">{avatarContent}</button>:avatarContent}
          <div className="relative z-20 flex flex-wrap items-center justify-end gap-2">
            {own?<>
              {onEdit&&<button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-full border border-ink-faint/30 bg-white px-4 py-2 text-sm font-medium shadow-sm"><Pencil size={14}/>Edit profile</button>}
              {onOwnCoverClick&&<div className="relative">
                <button type="button" onClick={()=>setProfileMenuOpen(open=>!open)} disabled={coverUploading} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink-faint/30 bg-white text-ink-light shadow-sm transition hover:bg-paper-dim disabled:opacity-60" aria-label="Profile options" aria-haspopup="menu" aria-expanded={profileMenuOpen} title="Profile options"><MoreHorizontal size={18}/></button>
                {profileMenuOpen&&<><button type="button" className="fixed inset-0 z-20 cursor-default bg-transparent" aria-label="Close profile options" onClick={()=>setProfileMenuOpen(false)}/><div className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-xl border border-paper-dim bg-white py-1 shadow-xl" role="menu"><button type="button" role="menuitem" onClick={()=>{setProfileMenuOpen(false);onOwnCoverClick();}} className="flex w-full items-center px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-paper">{coverUploading?"Working…":profile.cover_url?"Change cover photo":"Add cover photo"}</button>{profile.cover_url&&onRemoveCover&&<button type="button" role="menuitem" disabled={coverUploading} onClick={()=>{setProfileMenuOpen(false);onRemoveCover();}} className="flex w-full items-center px-3 py-2.5 text-left text-sm font-medium text-flag hover:bg-flag-light disabled:opacity-50">Remove cover photo</button>}</div></>}
              </div>}
            </>:<><MessageButton targetUserId={profile.id}/><FollowButton targetUserId={profile.id}/></>}
          </div>
        </div>

        <h1 className="mt-3 text-2xl">{name}</h1>
        {profile.username&&<p className="text-sm text-ink-faint">@{profile.username}</p>}
        {(profile.headline||profile.profession)&&<p className="mt-2 font-medium text-ink-light">{profile.headline||profile.profession}</p>}
        <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-ink-faint">{profile.workplace&&<span>{profile.workplace}</span>}{profile.school&&<span>{profile.school}</span>}{profile.location&&<span>{profile.location}</span>}{profile.country&&<span>{profile.country}</span>}</div>
        {counts&&<p className="mt-2 text-sm text-ink-faint">{counts.followers} followers · {counts.following} following</p>}
        {profile.bio&&<p className="mt-4 whitespace-pre-line text-[15px] leading-6 text-ink-light">{profile.bio}</p>}
        {socialLinks.length>0&&<div className="mt-4 flex flex-wrap gap-2" aria-label="Social links">{socialLinks.map(item=><SocialIcon key={item.kind} label={item.label} symbol={item.symbol} href={socialHref(item.kind,item.value as string)}/>)}</div>}
        {profile.skills.length>0&&<div className="mt-5"><h2 className="text-sm font-medium">Skills</h2><div className="mt-2 flex flex-wrap gap-1.5">{profile.skills.map(skill=><span key={skill} className="rounded-full bg-paper-dim px-2.5 py-1 text-xs text-ink-light">{skill}</span>)}</div></div>}
      </div>
    </div>
    {photoOpen&&profile.avatar_url&&<ProfilePhotoViewer src={profile.avatar_url} name={`${name} profile photo`} onClose={()=>setPhotoOpen(false)}/>} 
  </>;
}

function EditOwnProfile({onDone}:{onDone:()=>void}){
  const {data:profile}=useOwnProfile();
  const update=useUpdateOwnProfile();
  const avatarUpload=useAvatarUpload();
  const fileRef=useRef<HTMLInputElement>(null);
  const {data:categories}=useOpportunityCategories();
  const [fullName,setFullName]=useState("");
  const [username,setUsername]=useState("");
  const [headline,setHeadline]=useState("");
  const [profession,setProfession]=useState("");
  const [workplace,setWorkplace]=useState("");
  const [school,setSchool]=useState("");
  const [bio,setBio]=useState("");
  const [location,setLocation]=useState("");
  const [country,setCountry]=useState("");
  const [website,setWebsite]=useState("");
  const [instagram,setInstagram]=useState("");
  const [xLink,setXLink]=useState("");
  const [tiktok,setTiktok]=useState("");
  const [linkedin,setLinkedin]=useState("");
  const [youtube,setYoutube]=useState("");
  const [facebook,setFacebook]=useState("");
  const [skillsInput,setSkillsInput]=useState("");
  const [goals,setGoals]=useState<string[]>([]);
  const [error,setError]=useState<string|null>(null);
  const [photoSuccess,setPhotoSuccess]=useState(false);

  useEffect(()=>{if(!profile)return;setFullName(profile.full_name??"");setUsername(profile.username??"");setHeadline(profile.headline??"");setProfession(profile.profession??"");setWorkplace(profile.workplace??"");setSchool(profile.school??"");setBio(profile.bio??"");setLocation(profile.location??"");setCountry(profile.country??"");setWebsite(profile.website??"");setInstagram(profile.instagram_url??"");setXLink(profile.x_url??"");setTiktok(profile.tiktok_url??"");setLinkedin(profile.linkedin_url??"");setYoutube(profile.youtube_url??"");setFacebook(profile.facebook_url??"");setSkillsInput(profile.skills.join(", "));setGoals(profile.goal_categories);},[profile]);

  async function uploadAvatar(event:React.ChangeEvent<HTMLInputElement>){const file=event.target.files?.[0];if(!file)return;setError(null);setPhotoSuccess(false);try{await avatarUpload.mutateAsync(file);setPhotoSuccess(true);}catch(err){setError((err as Error).message);}finally{event.target.value="";}}

  async function submit(event:React.FormEvent){event.preventDefault();setError(null);const cleanUsername=username.trim().toLowerCase();if(cleanUsername&&!/^[a-z0-9_]{3,24}$/.test(cleanUsername)){setError("Username must be 3–24 lowercase letters, numbers or underscores.");return;}try{await update.mutateAsync({full_name:fullName.trim()||null,username:cleanUsername||null,headline:headline.trim()||null,profession:profession.trim()||null,workplace:workplace.trim()||null,school:school.trim()||null,bio:bio.trim()||null,location:location.trim()||null,country:country.trim()||null,website:website.trim()||null,instagram_url:instagram.trim()||null,x_url:xLink.trim()||null,tiktok_url:tiktok.trim()||null,linkedin_url:linkedin.trim()||null,youtube_url:youtube.trim()||null,facebook_url:facebook.trim()||null,skills:skillsInput.split(",").map(skill=>skill.trim()).filter(Boolean),goal_categories:goals});onDone();}catch(err){setError((err as Error).message);}}

  const socialFields=[
    {label:"Instagram",value:instagram,set:setInstagram,placeholder:"@username or full link"},
    {label:"X",value:xLink,set:setXLink,placeholder:"@username or full link"},
    {label:"TikTok",value:tiktok,set:setTiktok,placeholder:"@username or full link"},
    {label:"LinkedIn",value:linkedin,set:setLinkedin,placeholder:"profile name or full link"},
    {label:"YouTube",value:youtube,set:setYoutube,placeholder:"@channel or full link"},
    {label:"Facebook",value:facebook,set:setFacebook,placeholder:"profile/page or full link"},
  ];

  return <form onSubmit={submit} className="max-w-2xl space-y-4 rounded-3xl bg-white p-5 shadow-card">
    <div className="flex items-center justify-between"><h1 className="text-xl">Edit profile</h1><button type="button" onClick={onDone} className="text-sm text-ink-light">Cancel</button></div>
    <div className="flex items-center gap-4 rounded-2xl bg-paper-dim p-3">{profile?.avatar_url?<img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover"/>:<div className="flex h-16 w-16 items-center justify-center rounded-full bg-trust-light text-xl text-trust-dark">{(profile?.full_name??"?").charAt(0).toUpperCase()}</div>}<div><button type="button" onClick={()=>fileRef.current?.click()} disabled={avatarUpload.isPending} className="inline-flex items-center gap-2 rounded-full border border-ink-faint/30 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"><Camera size={15}/>{avatarUpload.isPending?"Uploading…":"Change profile photo"}</button><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} className="hidden"/><p className="mt-1 text-xs text-ink-faint">JPG, PNG or WebP · max 8 MB</p></div></div>
    {photoSuccess&&<p className="text-sm text-trust-dark">Profile photo updated.</p>}
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm text-ink-light">Full name<input value={fullName} onChange={e=>setFullName(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>
      <label className="text-sm text-ink-light">Username<input value={username} onChange={e=>setUsername(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>
      <label className="text-sm text-ink-light">Headline<input value={headline} onChange={e=>setHeadline(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>
      <label className="text-sm text-ink-light">Profession / field<input value={profession} onChange={e=>setProfession(e.target.value)} placeholder="e.g. Mathematics Tutor" className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>
      <label className="text-sm text-ink-light">Workplace<input value={workplace} onChange={e=>setWorkplace(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>
      <label className="text-sm text-ink-light">School<input value={school} onChange={e=>setSchool(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>
      <label className="text-sm text-ink-light">Location<input value={location} onChange={e=>setLocation(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>
      <label className="text-sm text-ink-light">Country<input value={country} onChange={e=>setCountry(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>
    </div>
    <label className="block text-sm text-ink-light">About<textarea rows={4} value={bio} onChange={e=>setBio(e.target.value)} className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/></label>
    <div className="rounded-2xl border border-paper-dim bg-paper/50 p-4"><div className="mb-3"><p className="text-sm font-semibold text-ink">Social links</p><p className="text-xs text-ink-faint">Only platform symbols are shown on your public profile.</p></div><div className="grid gap-3 sm:grid-cols-2">{socialFields.map(field=><label key={field.label} className="text-sm text-ink-light">{field.label}<input value={field.value} onChange={e=>field.set(e.target.value)} placeholder={field.placeholder} className="mt-1 w-full rounded-lg border border-ink-faint/30 bg-white px-3 py-2 text-ink outline-none focus:border-brand"/></label>)}<label className="text-sm text-ink-light sm:col-span-2">Website / portfolio<input value={website} onChange={e=>setWebsite(e.target.value)} placeholder="yourwebsite.com" className="mt-1 w-full rounded-lg border border-ink-faint/30 bg-white px-3 py-2 text-ink outline-none focus:border-brand"/></label></div></div>
    <label className="block text-sm text-ink-light">Skills — separated by commas<input value={skillsInput} onChange={e=>setSkillsInput(e.target.value)} placeholder="e.g. Mathematics tutoring, Graphic design, React" className="mt-1 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-ink outline-none focus:border-brand"/><span className="mt-1 block text-xs text-ink-faint">POSSARA uses profession and skills to improve people and tutor recommendations.</span></label>
    <div><p className="text-sm text-ink-light">Opportunity interests</p><div className="mt-2 flex flex-wrap gap-2">{categories?.map(category=><button key={category.id} type="button" onClick={()=>setGoals(current=>current.includes(category.slug)?current.filter(value=>value!==category.slug):[...current,category.slug])} className={`rounded-full border px-3 py-1.5 text-sm ${goals.includes(category.slug)?"border-brand bg-brand-light text-brand-dark":"border-ink-faint/30 text-ink-light"}`}>{category.name}</button>)}</div></div>
    {error&&<p className="text-sm text-flag">{error}</p>}
    <button disabled={update.isPending||avatarUpload.isPending} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white disabled:opacity-50">{update.isPending?"Saving…":"Save profile"}</button>
  </form>;
}

export function Profile(){
  const {username,id}=useParams<{username?:string;id?:string}>();
  const {userId}=useAuth();
  const {data:ownProfile,isLoading}=useOwnProfile();
  const coverUpload=useCoverUpload();
  const updateOwnProfile=useUpdateOwnProfile();
  const coverInputRef=useRef<HTMLInputElement>(null);
  const [coverStatus,setCoverStatus]=useState<string|null>(null);
  const [editing,setEditing]=useState(false);
  const isOwn=username==="me"||!!(id&&id===userId)||!!(ownProfile?.username&&username===ownProfile.username);
  const coverBusy=coverUpload.isPending||updateOwnProfile.isPending;
  async function changeOwnCover(event:React.ChangeEvent<HTMLInputElement>){const file=event.target.files?.[0];if(!file)return;setCoverStatus(null);try{await coverUpload.mutateAsync(file);setCoverStatus("Cover photo updated.");}catch(err){setCoverStatus((err as Error).message);}finally{event.target.value="";}}
  async function removeOwnCover(){if(!ownProfile?.cover_url)return;setCoverStatus(null);try{await updateOwnProfile.mutateAsync({cover_url:null});setCoverStatus("Cover photo removed.");}catch(err){setCoverStatus((err as Error).message);}}
  if(isOwn){if(!userId)return <p className="text-ink-light">Sign in to view your profile.</p>;if(isLoading||!ownProfile)return <p className="text-ink-light">Loading…</p>;if(editing)return <EditOwnProfile onDone={()=>setEditing(false)}/>;return <div className="space-y-5"><ProfileView profile={ownProfile} own onEdit={()=>setEditing(true)} onOwnCoverClick={()=>coverInputRef.current?.click()} onRemoveCover={removeOwnCover} coverUploading={coverBusy}/><input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={changeOwnCover} className="hidden"/>{coverStatus&&<p className="text-sm text-ink-light">{coverStatus}</p>}<ProfilePosts profileId={ownProfile.id}/><Link to="/settings" className="inline-block text-sm text-brand-dark underline">Privacy, notifications & account settings</Link></div>;}
  if(id)return <PublicProfileById id={id}/>;
  if(username)return <PublicProfile username={username}/>;
  return <p className="text-ink-light">No profile specified.</p>;
}

function PublicProfile({username}:{username:string}){const {data:profile,isLoading,error}=useProfileByUsername(username);if(isLoading)return <p className="text-ink-light">Loading…</p>;if(error||!profile)return <p className="text-flag">This profile couldn&apos;t be found.</p>;return <div className="space-y-5"><ProfileView profile={profile}/><ProfilePosts profileId={profile.id}/></div>;}
function PublicProfileById({id}:{id:string}){const {data:profile,isLoading,error}=useProfileById(id);if(isLoading)return <p className="text-ink-light">Loading…</p>;if(error||!profile)return <p className="text-flag">This profile couldn&apos;t be found.</p>;return <div className="space-y-5"><ProfileView profile={profile}/><ProfilePosts profileId={profile.id}/></div>;}
