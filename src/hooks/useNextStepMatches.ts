import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import type { NextStepOpportunity } from "../lib/nextStep";

export function useNextStepMatches() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["next-step-matches", userId], enabled: !!userId, staleTime: 60000,
    queryFn: async (): Promise<NextStepOpportunity[]> => {
      const { data, error } = await supabase.from("notifications").select("link")
        .eq("user_id", userId!).eq("type", "opportunity_match").order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      const targets = (data ?? []).flatMap(row => {
        const match = /^\/(opportunities|jobs)\/([0-9a-f-]{36})$/.exec(row.link ?? "");
        return match ? [{ type: match[1], id: match[2], path: row.link as string }] : [];
      });
      const opportunityIds = targets.filter(item => item.type === "opportunities").map(item => item.id);
      const jobIds = targets.filter(item => item.type === "jobs").map(item => item.id);
      const [opportunities, jobs] = await Promise.all([
        opportunityIds.length ? supabase.from("opportunities").select("id,title,deadline,status").in("id", opportunityIds) : Promise.resolve({ data: [], error: null }),
        jobIds.length ? supabase.from("job_postings").select("id,title,closes_at,status").in("id", jobIds) : Promise.resolve({ data: [], error: null }),
      ]);
      if (opportunities.error) throw opportunities.error;
      if (jobs.error) throw jobs.error;
      const listings: NextStepOpportunity[] = [
        ...(opportunities.data ?? []).map(item => ({ ...item, path: `/opportunities/${item.id}` })),
        ...(jobs.data ?? []).map(item => ({ id: item.id, title: item.title, path: `/jobs/${item.id}`, deadline: item.closes_at, status: item.status })),
      ];
      return targets.flatMap(target => {
        const item = listings.find(item => item.path === target.path);
        return item ? [item] : [];
      });
    },
  });
}
