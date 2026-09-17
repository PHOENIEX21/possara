import { useQuery } from "@tanstack/react-query";
import { UserPlus, Users } from "lucide-react";
import { supabase } from "../lib/supabase";
import { AdminFollowerOverview } from "./AdminFollowerOverview";

function useAdminMemberTotals() {
  return useQuery({
    queryKey: ["admin", "member-totals"],
    queryFn: async () => {
      const [{ count: memberCount, error: memberError }, { count: followCount, error: followError }] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("follows").select("id", { count: "exact", head: true }),
      ]);
      if (memberError) throw memberError;
      if (followError) throw followError;
      return { members: memberCount ?? 0, follows: followCount ?? 0 };
    },
    staleTime: 20_000,
  });
}

export function AdminMemberSummary() {
  const totals = useAdminMemberTotals();

  return (
    <div className="mb-5 space-y-4">
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-paper-dim bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Total signups</p><p className="mt-1 text-3xl font-bold text-ink">{totals.isLoading ? "…" : totals.data?.members ?? 0}</p><p className="mt-1 text-xs text-ink-light">Registered POSSARA accounts</p></div><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-light text-brand-dark"><UserPlus size={20}/></span></div>
        </div>
        <div className="rounded-2xl border border-paper-dim bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Follow connections</p><p className="mt-1 text-3xl font-bold text-ink">{totals.isLoading ? "…" : totals.data?.follows ?? 0}</p><p className="mt-1 text-xs text-ink-light">Current follower relationships</p></div><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-trust-light text-trust-dark"><Users size={20}/></span></div>
        </div>
      </section>
      {totals.error && <p className="text-sm text-flag">{(totals.error as Error).message}</p>}
      <AdminFollowerOverview />
    </div>
  );
}
