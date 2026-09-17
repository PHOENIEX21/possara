import { useState } from "react";
import { BadgeCheck, BookOpenCheck, BriefcaseBusiness, Eye, EyeOff, FolderKanban, HandHeart, Medal, Sparkles, Wrench } from "lucide-react";
import { useAddGrowthPassportItem, useGrowthPassport, useUpdateGrowthPassportVisibility } from "../hooks/usePossaraPlus";
import type { GrowthPassportKind } from "../hooks/usePossaraPlus";

const KINDS: { value: GrowthPassportKind; label: string; icon: typeof Sparkles }[] = [
  { value: "skill", label: "Skill", icon: Wrench },
  { value: "project", label: "Project", icon: FolderKanban },
  { value: "learning", label: "Learning", icon: BookOpenCheck },
  { value: "achievement", label: "Achievement", icon: Medal },
  { value: "service", label: "Service", icon: HandHeart },
  { value: "opportunity", label: "Opportunity", icon: BriefcaseBusiness },
];

export function Passport() {
  const { data: items, isLoading, error } = useGrowthPassport();
  const add = useAddGrowthPassportItem();
  const visibility = useUpdateGrowthPassportVisibility();
  const [kind, setKind] = useState<GrowthPassportKind>("achievement");
  const [title, setTitle] = useState("");
  const [issuer, setIssuer] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [occurredOn, setOccurredOn] = useState("");
  const [publicItem, setPublicItem] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    await add.mutateAsync({ kind, title, issuer, description, evidenceUrl, occurredOn: occurredOn || null, visibility: publicItem ? "public" : "private" });
    setTitle(""); setIssuer(""); setDescription(""); setEvidenceUrl(""); setOccurredOn(""); setPublicItem(false);
  }

  return <div className="page-stack">
    <section className="rounded-3xl bg-gradient-to-br from-[#171128] via-[#2b1e49] to-[#233954] p-6 text-white sm:p-7"><div className="flex items-center gap-2 text-sm font-medium text-white/65"><Sparkles size={16}/> POSSARA+</div><h1 className="mt-2 text-3xl font-semibold">Growth Passport</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Keep evidence of what you are actually becoming: skills, projects, learning, service and achievements. You choose what stays private and what appears publicly.</p></section>

    <section className="grid gap-4 lg:grid-cols-[330px_1fr]">
      <form onSubmit={submit} className="h-fit rounded-3xl border border-black/[.06] bg-white p-5 shadow-card">
        <p className="eyebrow">Add evidence</p><h2 className="mt-1 text-lg font-semibold">Record progress</h2>
        <label className="mt-4 block text-xs font-semibold text-ink-light">Type<select value={kind} onChange={(event) => setKind(event.target.value as GrowthPassportKind)} className="mt-1 w-full rounded-xl border border-ink-faint/25 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand">{KINDS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="mt-3 block text-xs font-semibold text-ink-light">Title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="e.g. Built my first React website" className="mt-1 w-full rounded-xl border border-ink-faint/25 px-3 py-2.5 text-sm outline-none focus:border-brand"/></label>
        <label className="mt-3 block text-xs font-semibold text-ink-light">Issuer / source<input value={issuer} onChange={(event) => setIssuer(event.target.value)} maxLength={120} placeholder="School, organisation, client…" className="mt-1 w-full rounded-xl border border-ink-faint/25 px-3 py-2.5 text-sm outline-none focus:border-brand"/></label>
        <label className="mt-3 block text-xs font-semibold text-ink-light">What did you do?<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={700} placeholder="Short evidence or outcome" className="mt-1 w-full resize-none rounded-xl border border-ink-faint/25 px-3 py-2.5 text-sm outline-none focus:border-brand"/></label>
        <label className="mt-3 block text-xs font-semibold text-ink-light">Evidence link <span className="font-normal text-ink-faint">optional</span><input value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="Portfolio, certificate or project link" className="mt-1 w-full rounded-xl border border-ink-faint/25 px-3 py-2.5 text-sm outline-none focus:border-brand"/></label>
        <label className="mt-3 block text-xs font-semibold text-ink-light">Date<input type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} className="mt-1 w-full rounded-xl border border-ink-faint/25 px-3 py-2.5 text-sm outline-none focus:border-brand"/></label>
        <label className="mt-3 flex items-start gap-2 rounded-xl bg-paper p-3 text-xs text-ink-light"><input type="checkbox" checked={publicItem} onChange={(event) => setPublicItem(event.target.checked)} className="mt-0.5"/><span><strong className="text-ink">Show on my public Growth Passport.</strong><br/>Keep unchecked for private progress only.</span></label>
        {add.error && <p className="mt-3 text-xs text-flag">{(add.error as Error).message}</p>}
        <button disabled={add.isPending || !title.trim()} className="mt-4 w-full rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{add.isPending ? "Saving…" : "Add to Growth Passport"}</button>
      </form>

      <div>
        <div className="mb-3 flex items-end justify-between"><div><p className="eyebrow">Your record</p><h2 className="text-xl font-semibold">Evidence of progress</h2></div><span className="text-xs text-ink-faint">{items?.length ?? 0} items</span></div>
        {isLoading && <div className="feed-skeleton"/>}
        {error && <p className="rounded-2xl bg-red-50 p-4 text-sm text-flag">Couldn&apos;t load your Growth Passport.</p>}
        {!isLoading && !error && items?.length === 0 && <div className="rounded-3xl border border-dashed border-black/10 bg-white p-8 text-center"><BadgeCheck size={28} className="mx-auto text-ink-faint"/><h3 className="mt-3 font-semibold">Your Growth Passport starts here</h3><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-ink-light">Record useful progress as it happens instead of trying to remember everything when you need a CV, scholarship application or portfolio.</p></div>}
        <div className="space-y-3">{items?.map((item) => {
          const meta = KINDS.find((entry) => entry.value === item.kind) ?? KINDS[0];
          const Icon = meta.icon;
          return <article key={item.id} className="rounded-3xl border border-black/[.06] bg-white p-4 shadow-card sm:p-5">
            <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark"><Icon size={18}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.title}</h3>{item.verified && <span className="inline-flex items-center gap-1 rounded-full bg-trust-light px-2 py-0.5 text-[10px] font-semibold text-trust-dark"><BadgeCheck size={11}/>Verified</span>}</div>{item.issuer && <p className="mt-0.5 text-xs text-ink-faint">{item.issuer}</p>}{item.description && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink-light">{item.description}</p>}{item.evidence_url && <a href={item.evidence_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-semibold text-brand-dark underline">Open evidence</a>}</div><button type="button" onClick={() => visibility.mutate({ id: item.id, visibility: item.visibility === "public" ? "private" : "public" })} className="rounded-full p-2 text-ink-faint hover:bg-paper" title={item.visibility === "public" ? "Make private" : "Show publicly"}>{item.visibility === "public" ? <Eye size={16}/> : <EyeOff size={16}/>}</button></div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-ink-faint"><span className="rounded-full bg-paper px-2.5 py-1 font-medium">{meta.label}</span>{item.occurred_on && <span>{new Date(`${item.occurred_on}T12:00:00`).toLocaleDateString()}</span>}<span className="ml-auto">{item.visibility === "public" ? "Public" : "Private"}</span></div>
          </article>;
        })}</div>
      </div>
    </section>
  </div>;
}
