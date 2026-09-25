import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { supabase } from "../lib/supabase";

export function AdminSignupSummary({compact=false}:{compact?:boolean}) {
  const query = useQuery({
    queryKey: ["admin", "signup-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  if (compact) return <section className="rounded-2xl border border-paper-dim bg-white p-5">
    <h2 className="text-sm font-semibold text-ink-light">Registered members</h2>
    <p className="mt-2 text-3xl font-bold">{query.isLoading||query.error ? "—" : query.data??0}</p>
    <p className="mt-1 text-xs leading-5 text-ink-faint">Accounts in the POSSARA community.</p>
    {query.error&&<button onClick={()=>void query.refetch()} className="mt-3 text-left text-xs font-semibold text-flag">Could not load. Retry</button>}
  </section>;

  return (
    <section className="rounded-2xl border border-paper-dim bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><Users size={18} className="text-brand-dark"/><h2 className="text-lg font-semibold">Registered members</h2></div>
          <p className="mt-1 text-sm text-ink-light">Total accounts currently registered on POSSARA.</p>
        </div>
        <div className="rounded-2xl bg-paper px-4 py-3 text-right">
          <p className="text-3xl font-semibold text-ink">{query.isLoading ? "—" : query.data ?? 0}</p>
          <p className="text-[11px] text-ink-faint">total signups</p>
        </div>
      </div>
      {query.error && <p className="mt-3 text-sm text-flag">{(query.error as Error).message}</p>}
    </section>
  );
}
