import { useRef, useState } from "react";
import { Megaphone, Store } from "lucide-react";
import { useActiveAdvertisements, useSubmitAdvertisement } from "../hooks/useAdvertisements";
import { useFeedPosts } from "../hooks/useFeedPosts";
import { useAuth } from "../store/auth";
import { PostComposer } from "../components/PostComposer";
import { PostCard } from "../components/PostCard";

function AdCard({ ad }: { ad: { organization_name: string; title: string; description: string; link: string; image_url: string | null } }) {
  return <a href={ad.link} target="_blank" rel="noreferrer" className="block rounded-2xl border border-paper-dim bg-white p-4 shadow-sm transition hover:border-opportunity hover:shadow-md">{ad.image_url && <img src={ad.image_url} alt="" className="mb-3 h-32 w-full rounded-lg object-cover" />}<span className="text-xs font-medium uppercase tracking-wide text-opportunity-dark">Sponsored · {ad.organization_name}</span><h3 className="mt-0.5 text-[15px] font-medium leading-snug">{ad.title}</h3><p className="mt-1 line-clamp-2 text-sm text-ink-light">{ad.description}</p></a>;
}

function SubmitAdForm() {
  const { userId } = useAuth();
  const submitAd = useSubmitAdvertisement();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!userId) return <p className="text-ink-light">Sign in to create an advertisement.</p>;
  if (success) return <div className="rounded-xl border border-trust-light bg-trust-light/40 p-5"><p className="text-trust-dark">Submitted for review. Payment activation will be added during the Paystack staging phase; submitting this form does not activate the ad.</p></div>;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await submitAd.mutateAsync({ organizationName, title, description, link, imageFile });
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-paper-dim bg-white p-5 shadow-sm">
    <div><label className="mb-1 block text-sm text-ink-light" htmlFor="org-name">Business or organization name</label><input id="org-name" required value={organizationName} onChange={(e)=>setOrganizationName(e.target.value)} className="w-full rounded-lg border border-ink-faint/30 px-3 py-2 outline-none focus:border-trust"/></div>
    <div><label className="mb-1 block text-sm text-ink-light" htmlFor="ad-title">Ad title</label><input id="ad-title" required value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full rounded-lg border border-ink-faint/30 px-3 py-2 outline-none focus:border-trust"/></div>
    <div><label className="mb-1 block text-sm text-ink-light" htmlFor="ad-description">Description</label><textarea id="ad-description" required rows={3} value={description} onChange={(e)=>setDescription(e.target.value)} className="w-full rounded-lg border border-ink-faint/30 px-3 py-2 outline-none focus:border-trust"/></div>
    <div><label className="mb-1 block text-sm text-ink-light" htmlFor="ad-link">Destination link</label><input id="ad-link" type="url" required placeholder="https://…" value={link} onChange={(e)=>setLink(e.target.value)} className="w-full rounded-lg border border-ink-faint/30 px-3 py-2 outline-none focus:border-trust"/></div>
    <div><label className="mb-1 block text-sm text-ink-light" htmlFor="ad-image">Image</label><input id="ad-image" ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e)=>setImageFile(e.target.files?.[0] ?? null)} className="text-sm"/></div>
    {error&&<p className="text-sm text-flag">{error}</p>}
    <button type="submit" disabled={submitAd.isPending} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper hover:bg-ink/90 disabled:opacity-50">{submitAd.isPending?"Submitting…":"Submit for review"}</button>
  </form>;
}

export function Advertise() {
  const { data: ads, isLoading } = useActiveAdvertisements();
  const { data: businessPosts, isLoading: businessLoading } = useFeedPosts({ postType:"general", noCategoryOnly:true, topic:"business" });
  const [showForm,setShowForm]=useState(false);

  return <div className="page-stack">
    <section className="rounded-[28px] bg-ink p-5 text-white shadow-xl sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="eyebrow !text-white/60">Business & promotion</p><h1 className="text-3xl text-white">Advertise</h1><p className="mt-2 max-w-prose text-sm leading-6 text-white/70">Paid campaigns and ordinary business posts stay clearly separate, so people always know what is sponsored.</p></div>
        <button onClick={()=>setShowForm(v=>!v)} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink"><Megaphone size={15}/>{showForm?"Hide paid-ad form":"Create paid ad"}</button>
      </div>
      {showForm&&<div className="mt-5 max-w-lg text-ink"><SubmitAdForm/></div>}
    </section>

    <section>
      <div className="mb-3"><p className="eyebrow">Sponsored campaigns</p><h2 className="mt-1 text-xl font-semibold">Paid advertisements</h2><p className="mt-1 text-sm text-ink-light">These are reviewed advertising campaigns and are always labelled Sponsored.</p></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading&&<div className="animate-pulse rounded-2xl border border-paper-dim bg-white p-4 shadow-sm"><div className="h-4 w-2/3 rounded bg-paper-dim"/><div className="mt-2 h-3 w-full rounded bg-paper-dim"/></div>}
        {!isLoading&&ads?.length===0&&<p className="col-span-full text-ink-light">No active sponsored campaigns right now.</p>}
        {ads?.map((ad)=><AdCard key={ad.id} ad={ad}/>)}
      </div>
    </section>

    <section className="border-t border-paper-dim pt-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand-dark"><Store size={19}/></div>
        <div><p className="eyebrow">Business community</p><h2 className="mt-1 text-xl font-semibold">Products, services and people building things</h2><p className="mt-1 text-sm text-ink-light">Ordinary community posts are not paid ads. They remain on the member&apos;s profile and may also appear in Home.</p></div>
      </div>

      <PostComposer defaultTopic="business" placeholder="Share your business, service, product, portfolio or useful offer…"/>
      <div className="mt-5 space-y-4">
        {businessLoading&&<div className="feed-skeleton"/>}
        {!businessLoading&&businessPosts?.length===0&&<div className="empty-state"><Store size={28}/><h2>No business community posts yet</h2><p>Be the first to introduce something useful you are building or offering.</p></div>}
        {businessPosts?.map((post)=><PostCard key={post.id} post={post}/>)}
      </div>
    </section>
  </div>;
}
