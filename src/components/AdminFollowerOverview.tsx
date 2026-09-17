import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, X } from "lucide-react";
import { supabase } from "../lib/supabase";

type AdminProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type FollowRow = {
  follower_id: string;
  following_id: string;
  created_at: string;
};

type MemberWithCounts = AdminProfile & {
  followers: number;
  following: number;
};

function profilePath(profile: AdminProfile) {
  return profile.username ? `/profile/${profile.username}` : `/profile/id/${profile.id}`;
}

function useAdminFollowerData() {
  return useQuery({
    queryKey: ["admin", "follower-overview"],
    queryFn: async () => {
      const [{ data: follows, error: followError }, { data: profiles, error: profileError }] = await Promise.all([
        supabase.from("follows").select("follower_id,following_id,created_at").order("created_at", { ascending: false }).limit(10000),
        supabase.from("profiles").select("id,full_name,username,avatar_url").order("created_at", { ascending: false }).limit(5000),
      ]);
      if (followError) throw followError;
      if (profileError) throw profileError;

      const followRows = (follows ?? []) as FollowRow[];
      const profileRows = (profiles ?? []) as AdminProfile[];
      const followerCounts = new Map<string, number>();
      const followingCounts = new Map<string, number>();
      for (const row of followRows) {
        followerCounts.set(row.following_id, (followerCounts.get(row.following_id) ?? 0) + 1);
        followingCounts.set(row.follower_id, (followingCounts.get(row.follower_id) ?? 0) + 1);
      }

      const members: MemberWithCounts[] = profileRows.map(profile => ({
        ...profile,
        followers: followerCounts.get(profile.id) ?? 0,
        following: followingCounts.get(profile.id) ?? 0,
      }));
      return { follows: followRows, profiles: profileRows, members };
    },
    staleTime: 30_000,
  });
}

export function AdminFollowerOverview() {
  const query = useAdminFollowerData();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MemberWithCounts | null>(null);
  const [detailTab, setDetailTab] = useState<"followers" | "following">("followers");

  const profileMap = useMemo(() => new Map((query.data?.profiles ?? []).map(profile => [profile.id, profile])), [query.data?.profiles]);
  const filteredMembers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const members = [...(query.data?.members ?? [])].sort((a, b) => b.followers - a.followers || b.following - a.following);
    if (!needle) return members;
    return members.filter(member => `${member.full_name ?? ""} ${member.username ?? ""}`.toLowerCase().includes(needle));
  }, [query.data?.members, search]);

  const detailedPeople = useMemo(() => {
    if (!selected) return [] as AdminProfile[];
    const ids = (query.data?.follows ?? [])
      .filter(row => detailTab === "followers" ? row.following_id === selected.id : row.follower_id === selected.id)
      .map(row => detailTab === "followers" ? row.follower_id : row.following_id);
    return ids.map(id => profileMap.get(id)).filter((profile): profile is AdminProfile => !!profile);
  }, [selected, detailTab, query.data?.follows, profileMap]);

  return <section className="rounded-2xl border border-paper-dim bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2"><Users size={18} className="text-brand-dark"/><h2 className="text-lg font-semibold">Followers & connections</h2></div>
        <p className="mt-1 text-sm text-ink-light">Admin view of the current follow graph and each member&apos;s follower/following totals.</p>
      </div>
      <div className="rounded-xl bg-paper px-3 py-2 text-right"><p className="text-xl font-semibold text-ink">{query.data?.follows.length ?? 0}</p><p className="text-[11px] text-ink-faint">total follow relationships</p></div>
    </div>

    <label className="mt-4 flex items-center gap-2 rounded-xl border border-paper-dim bg-paper/50 px-3 py-2"><Search size={15} className="text-ink-faint"/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search members" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label>

    {query.isLoading&&<p className="mt-4 text-sm text-ink-light">Loading follower data…</p>}
    {query.error&&<p className="mt-4 text-sm text-flag">{(query.error as Error).message}</p>}
    {!query.isLoading&&!query.error&&<div className="mt-3 max-h-[440px] space-y-2 overflow-y-auto pr-1">
      {filteredMembers.map(member=><button key={member.id} type="button" onClick={()=>{setSelected(member);setDetailTab("followers");}} className="flex w-full items-center gap-3 rounded-xl border border-paper-dim p-3 text-left transition hover:bg-paper">
        {member.avatar_url?<img src={member.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover"/>:<div className="flex h-10 w-10 items-center justify-center rounded-full bg-trust-light text-sm font-semibold text-trust-dark">{(member.full_name??member.username??"?").charAt(0).toUpperCase()}</div>}
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{member.full_name??"Member"}</p><p className="truncate text-xs text-ink-faint">{member.username?`@${member.username}`:member.id.slice(0,8)}</p></div>
        <div className="grid shrink-0 grid-cols-2 gap-3 text-center"><div><p className="text-sm font-semibold">{member.followers}</p><p className="text-[10px] text-ink-faint">Followers</p></div><div><p className="text-sm font-semibold">{member.following}</p><p className="text-[10px] text-ink-faint">Following</p></div></div>
      </button>)}
      {filteredMembers.length===0&&<p className="py-6 text-center text-sm text-ink-faint">No members match that search.</p>}
    </div>}

    {selected&&<div className="fixed inset-0 z-[90] flex items-end bg-ink/45 sm:items-center sm:justify-center sm:p-4" onClick={()=>setSelected(null)}>
      <div className="max-h-[82vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl" onClick={event=>event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-paper-dim px-4 py-3"><div><p className="font-semibold">{selected.full_name??"Member"}</p><p className="text-xs text-ink-faint">{selected.username?`@${selected.username}`:selected.id.slice(0,8)}</p></div><button type="button" onClick={()=>setSelected(null)} className="rounded-full p-2 hover:bg-paper" aria-label="Close"><X size={18}/></button></div>
        <div className="grid grid-cols-2 border-b border-paper-dim p-2"><button type="button" onClick={()=>setDetailTab("followers")} className={`rounded-xl px-3 py-2 text-sm font-semibold ${detailTab==="followers"?"bg-ink text-white":"text-ink-light"}`}>{selected.followers} Followers</button><button type="button" onClick={()=>setDetailTab("following")} className={`rounded-xl px-3 py-2 text-sm font-semibold ${detailTab==="following"?"bg-ink text-white":"text-ink-light"}`}>{selected.following} Following</button></div>
        <div className="max-h-[58vh] overflow-y-auto p-2">{detailedPeople.length===0?<p className="p-6 text-center text-sm text-ink-faint">No {detailTab} yet.</p>:detailedPeople.map(person=><Link key={person.id} to={profilePath(person)} onClick={()=>setSelected(null)} className="flex items-center gap-3 rounded-xl p-3 hover:bg-paper">{person.avatar_url?<img src={person.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover"/>:<div className="flex h-10 w-10 items-center justify-center rounded-full bg-trust-light text-sm font-semibold text-trust-dark">{(person.full_name??person.username??"?").charAt(0).toUpperCase()}</div>}<div className="min-w-0"><p className="truncate text-sm font-semibold">{person.full_name??"Member"}</p>{person.username&&<p className="truncate text-xs text-ink-faint">@{person.username}</p>}</div></Link>)}</div>
      </div>
    </div>}
  </section>;
}
