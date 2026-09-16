import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  useModerateAdvertisement,
  usePendingAdvertisements,
  usePendingOpportunities,
  usePendingReports,
  useProfilesWithRoles,
  useResolveReport,
  useSetOpportunityReviewStatus,
  useSetUserRole,
  useUnverifiedOrganizations,
  useVerifyOrganization,
} from "../hooks/useAdminData";
import { useAuth } from "../store/auth";
import type { UserRole } from "../types/database";

function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  return <p className="mt-2 text-sm text-flag">{error instanceof Error ? error.message : "Something went wrong."}</p>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-paper-dim bg-white p-4 shadow-sm"><h2 className="text-lg font-semibold">{title}</h2><div className="mt-3">{children}</div></section>;
}

export function Admin() {
  const { email, role, isVerified } = useAuth();
  const pendingOpps = usePendingOpportunities();
  const reviewOpp = useSetOpportunityReviewStatus();
  const orgs = useUnverifiedOrganizations();
  const verifyOrg = useVerifyOrganization();
  const reports = usePendingReports();
  const resolveReport = useResolveReport();
  const ads = usePendingAdvertisements();
  const moderateAd = useModerateAdvertisement();
  const members = useProfilesWithRoles();
  const setRole = useSetUserRole();
  const [reportNotes, setReportNotes] = useState<Record<string, string>>({});

  return <div className="mx-auto max-w-4xl space-y-5 pb-10">
    <div className="flex items-start gap-3"><div className="rounded-xl bg-trust-light p-2 text-trust-dark"><ShieldCheck size={22}/></div><div><h1 className="text-2xl">Admin</h1><p className="text-sm text-ink-light">Moderation, verification and member-role controls.</p></div></div>
    <div className="rounded-2xl bg-trust-light px-4 py-3 text-sm text-trust-dark">Signed in as <b>{email ?? "admin"}</b> · role <b>{role ?? "loading"}</b> · {isVerified ? "verified" : "not verified"}</div>

    <Section title="Opportunities awaiting review">
      {pendingOpps.isLoading && <p className="text-sm text-ink-light">Loading…</p>}
      {!pendingOpps.isLoading && pendingOpps.data?.length === 0 && <p className="text-sm text-ink-light">Nothing waiting for review.</p>}
      <div className="space-y-3">{pendingOpps.data?.map((opp) => <div key={opp.id} className="rounded-xl border border-paper-dim p-3"><p className="font-medium">{opp.title}</p><p className="mt-1 line-clamp-2 text-sm text-ink-light">{opp.description}</p><div className="mt-3 flex gap-2"><button onClick={()=>reviewOpp.mutate({id:opp.id,status:"active"})} className="rounded-full bg-trust px-3 py-1.5 text-sm font-medium text-white">Approve</button><button onClick={()=>reviewOpp.mutate({id:opp.id,status:"flagged"})} className="rounded-full border border-flag px-3 py-1.5 text-sm font-medium text-flag">Flag</button></div></div>)}</div>
      <ErrorText error={reviewOpp.error}/>
    </Section>

    <Section title="Organizations awaiting verification">
      {orgs.isLoading && <p className="text-sm text-ink-light">Loading…</p>}
      {!orgs.isLoading && orgs.data?.length === 0 && <p className="text-sm text-ink-light">Nothing waiting for verification.</p>}
      <div className="space-y-3">{orgs.data?.map((org) => <div key={org.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-paper-dim p-3"><div><p className="font-medium">{org.name}</p>{org.website&&<p className="text-xs text-ink-faint">{org.website}</p>}</div><button onClick={()=>verifyOrg.mutate(org.id)} className="rounded-full bg-trust px-3 py-1.5 text-sm font-medium text-white">Verify</button></div>)}</div>
      <ErrorText error={verifyOrg.error}/>
    </Section>

    <Section title="Reports">
      {reports.isLoading && <p className="text-sm text-ink-light">Loading…</p>}
      {!reports.isLoading && reports.data?.length === 0 && <p className="text-sm text-ink-light">No open reports.</p>}
      <div className="space-y-3">{reports.data?.map((report) => <div key={report.id} className="rounded-xl border border-paper-dim p-3"><p className="font-medium">{report.reason}</p><input value={reportNotes[report.id]??""} onChange={e=>setReportNotes({...reportNotes,[report.id]:e.target.value})} placeholder="Action taken" className="mt-2 w-full rounded-lg border border-ink-faint/30 px-3 py-2 text-sm"/><div className="mt-2 flex gap-2"><button onClick={()=>resolveReport.mutate({id:report.id,status:"resolved",actionTaken:reportNotes[report.id]??""})} className="rounded-full bg-trust px-3 py-1.5 text-sm font-medium text-white">Resolve</button><button onClick={()=>resolveReport.mutate({id:report.id,status:"dismissed",actionTaken:reportNotes[report.id]??""})} className="rounded-full border border-ink-faint/30 px-3 py-1.5 text-sm">Dismiss</button></div></div>)}</div>
      <ErrorText error={resolveReport.error}/>
    </Section>

    <Section title="Advertisements awaiting review">
      {ads.isLoading && <p className="text-sm text-ink-light">Loading…</p>}
      {!ads.isLoading && ads.data?.length === 0 && <p className="text-sm text-ink-light">No advertisements waiting for review.</p>}
      <div className="space-y-3">{ads.data?.map((ad) => <div key={ad.id} className="rounded-xl border border-paper-dim p-3"><p className="font-medium">{ad.title}</p><p className="text-sm text-ink-light">{ad.organization_name}</p><div className="mt-2 flex gap-2"><button onClick={()=>moderateAd.mutate({id:ad.id,status:"active"})} className="rounded-full bg-trust px-3 py-1.5 text-sm font-medium text-white">Approve</button><button onClick={()=>moderateAd.mutate({id:ad.id,status:"rejected"})} className="rounded-full border border-flag px-3 py-1.5 text-sm font-medium text-flag">Reject</button></div></div>)}</div>
      <ErrorText error={moderateAd.error}/>
    </Section>

    <Section title="Members & roles">
      {members.isLoading && <p className="text-sm text-ink-light">Loading…</p>}
      <div className="space-y-2">{members.data?.map((profile) => {
        const rel = Array.isArray(profile.user_roles) ? profile.user_roles[0] : profile.user_roles;
        const currentRole = (rel?.role ?? "user") as UserRole;
        return <div key={profile.id} className="flex items-center justify-between gap-3 rounded-xl border border-paper-dim p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{profile.full_name ?? "Member"}</p><p className="truncate text-xs text-ink-faint">{profile.username ? `@${profile.username}` : profile.id.slice(0,8)}</p></div><select value={currentRole} onChange={e=>setRole.mutate({userId:profile.id,role:e.target.value as UserRole})} className="rounded-lg border border-ink-faint/30 px-2 py-1.5 text-sm"><option value="user">user</option><option value="creator">creator</option><option value="moderator">moderator</option><option value="admin">admin</option></select></div>;
      })}</div>
      <ErrorText error={setRole.error}/>
    </Section>
  </div>;
}
