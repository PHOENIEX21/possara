import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useUnverifiedOrganizations, useVerifyOrganization } from "../hooks/useAdminData";

export function OrganizationVerificationAdmin() {
  const organizations = useUnverifiedOrganizations();
  const verify = useVerifyOrganization();
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState("");
  const pending = organizations.data ?? [];
  const visible = pending.filter(org => org.name.toLowerCase().includes(search.trim().toLowerCase()));
  async function approve(id: string, name: string) {
    setSuccess("");
    try {
      await verify.mutateAsync(id);
      setSuccess(`${name} is verified. Its organization tick is now enabled.`);
    } catch { /* The mutation error stays visible below. */ }
  }
  const error = organizations.error || verify.error;
  return <section id="organization-verification" aria-labelledby="organization-verification-title" className="scroll-mt-20 rounded-2xl border border-brand/20 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2"><ShieldCheck className="shrink-0 text-brand-dark" size={22}/><h2 id="organization-verification-title" className="text-lg font-semibold">Organization verification</h2></div>
      <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark">{organizations.isLoading ? "Loading…" : organizations.error ? "Unable to load" : `${pending.length} awaiting review`}</span>
    </div>
    <p className="mt-2 text-sm text-ink-light">Review the organization’s profile and official details, then approve it to display the verified tick.</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <label className="min-w-0 flex-1"><span className="sr-only">Find an organization awaiting verification</span><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Find an organization…" className="w-full rounded-xl border border-ink-faint/25 px-3 py-2 text-sm"/></label>
      <button type="button" disabled={organizations.isFetching} onClick={()=>void organizations.refetch()} className="min-h-11 rounded-xl border border-ink-faint/25 px-3 text-sm font-semibold disabled:opacity-50">{organizations.isFetching ? "Refreshing…" : "Refresh list"}</button>
    </div>
    {error&&<p role="alert" className="mt-3 rounded-xl bg-flag-light p-3 text-sm text-flag-dark">{error.message || "Could not load verification requests. Please retry."}</p>}
    {success&&<p role="status" className="mt-3 rounded-xl bg-trust-light p-3 text-sm text-trust-dark">{success}</p>}
    {organizations.isLoading&&<p role="status" className="mt-4 text-sm text-ink-light">Loading organizations for review…</p>}
    {!organizations.isLoading&&!organizations.error&&visible.length===0&&<p className="mt-4 text-sm text-ink-light">{pending.length ? "No organizations match that name." : "No organizations are awaiting verification."}</p>}
    <div className="mt-4 space-y-3">{visible.map(org=><article key={org.id} className="rounded-xl border border-paper-dim p-4">
      <h3 className="break-words font-semibold">{org.name}</h3>
      {org.description&&<p className="mt-1 whitespace-pre-line break-words text-sm text-ink-light">{org.description}</p>}
      {(org.industry||org.location)&&<p className="mt-2 break-words text-xs text-ink-faint">{[org.industry,org.location].filter(Boolean).join(" · ")}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link to={`/organizations/${org.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-dark underline">Review organization profile</Link>
        {org.website&&/^https?:\/\//i.test(org.website)&&<a href={org.website} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-dark underline">Official website</a>}
        <button type="button" disabled={verify.isPending} onClick={()=>void approve(org.id,org.name)} className="min-h-11 rounded-xl bg-trust px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{verify.isPending&&verify.variables===org.id ? "Approving…" : "Approve verification"}</button>
      </div>
    </article>)}</div>
  </section>;
}
