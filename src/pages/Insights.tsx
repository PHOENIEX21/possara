import { Link } from "react-router-dom";
import { BarChart3, FileText, Heart, MessageCircle, Minus, TrendingDown, TrendingUp, Users } from "lucide-react";
import { useCreatorInsights } from "../hooks/useCreatorInsights";
import { useOwnProfile } from "../hooks/useProfile";

export function Insights() {
  const { data: insights, isLoading, error } = useCreatorInsights(30);
  const { data: profile } = useOwnProfile();
  const completenessFields = profile ? [profile.full_name, profile.username, profile.headline || profile.profession, profile.bio, profile.location || profile.country, profile.avatar_url, ...(profile.skills?.length ? ["skills"] : []), ...(profile.goal_categories?.length ? ["goals"] : [])] : [];
  const profileReadiness = profile ? Math.round((completenessFields.filter(Boolean).length / 8) * 100) : 0;

  const momentum = insights?.momentumPercent ?? null;
  const MomentumIcon = momentum === null || momentum === 0 ? Minus : momentum > 0 ? TrendingUp : TrendingDown;

  return <div className="page-stack">
    <section className="rounded-3xl bg-ink p-6 text-white sm:p-7"><div className="flex items-center gap-2 text-sm font-medium text-white/65"><BarChart3 size={16}/> POSSARA+ Insights</div><h1 className="mt-2 text-3xl font-semibold">See what is actually helping you grow.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Meaningful account analytics based on followers, posts, reactions and conversations around your content — without hidden fingerprinting or vanity-only numbers.</p></section>

    {isLoading && <div className="feed-skeleton"/>}
    {error && <p className="rounded-2xl bg-red-50 p-4 text-sm text-flag">Couldn&apos;t load your insights.</p>}

    {insights && <>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-card"><FileText size={18} className="text-brand"/><p className="mt-3 text-2xl font-bold">{insights.postsPublished}</p><p className="text-xs text-ink-faint">Posts · 30 days</p></div>
        <div className="rounded-2xl bg-white p-4 shadow-card"><Heart size={18} className="text-brand"/><p className="mt-3 text-2xl font-bold">{insights.reactionsReceived}</p><p className="text-xs text-ink-faint">Reactions received</p></div>
        <div className="rounded-2xl bg-white p-4 shadow-card"><MessageCircle size={18} className="text-brand"/><p className="mt-3 text-2xl font-bold">{insights.commentsReceived}</p><p className="text-xs text-ink-faint">Comments received</p></div>
        <div className="rounded-2xl bg-white p-4 shadow-card"><Users size={18} className="text-brand"/><p className="mt-3 text-2xl font-bold">{insights.newFollowers}</p><p className="text-xs text-ink-faint">New followers</p></div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-3xl border border-black/[.06] bg-white p-5 shadow-card"><p className="eyebrow">Momentum</p><div className="mt-2 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-light text-brand-dark"><MomentumIcon size={20}/></div><div><p className="text-2xl font-bold">{momentum === null ? "New" : `${momentum > 0 ? "+" : ""}${momentum}%`}</p><p className="text-xs text-ink-faint">engagement vs previous 7 days</p></div></div><div className="mt-4 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-paper p-3"><p className="font-semibold">{insights.recentSevenDayEngagement}</p><p className="text-[11px] text-ink-faint">Last 7 days</p></div><div className="rounded-xl bg-paper p-3"><p className="font-semibold">{insights.previousSevenDayEngagement}</p><p className="text-[11px] text-ink-faint">Previous 7 days</p></div></div></article>
        <article className="rounded-3xl border border-black/[.06] bg-white p-5 shadow-card"><p className="eyebrow">Profile readiness</p><p className="mt-2 text-3xl font-bold">{profileReadiness}%</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-dim"><div className="h-full rounded-full bg-brand" style={{width:`${profileReadiness}%`}}/></div><p className="mt-3 text-sm leading-6 text-ink-light">A fuller profile gives people and Opportunity Intelligence more context about your work, skills and goals.</p><Link to="/profile/me" className="mt-3 inline-flex text-sm font-semibold text-brand-dark">Improve profile →</Link></article>
      </section>

      <section className="rounded-3xl border border-black/[.06] bg-white p-5 shadow-card"><div className="flex items-end justify-between gap-3"><div><p className="eyebrow">Content signals</p><h2 className="mt-1 text-xl font-semibold">Posts creating conversation</h2></div><span className="text-xs text-ink-faint">Top 5 · 30 days</span></div>{insights.topPosts.length===0?<p className="mt-5 rounded-2xl bg-paper p-5 text-sm text-ink-light">Publish something useful and your strongest posts will appear here.</p>:<div className="mt-4 divide-y divide-paper-dim">{insights.topPosts.map((post,index)=><Link key={post.id} to={`/post/${post.id}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-paper text-sm font-bold text-ink-faint">{index+1}</div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-medium text-ink">{post.content || "Media post"}</p><p className="mt-1 text-xs text-ink-faint">{post.reactions} reactions · {post.comments} comments</p></div><span className="text-sm font-semibold text-brand-dark">{post.engagement}</span></Link>)}</div>}</section>
    </>}
  </div>;
}
