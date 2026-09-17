import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export type DiscoverySource = {
  id: string;
  name: string;
  endpoint_url: string;
  format: "rss" | "atom" | "json_feed" | "json_api" | "grants_gov" | "reliefweb";
  enabled: boolean;
  trust_tier: "official" | "partner" | "trusted_aggregator";
  default_category_slug: string | null;
  default_location: string | null;
  default_organization_name: string | null;
  check_every_minutes: number;
  adapter: Record<string, unknown>;
  auto_publish: boolean;
  requires_setup: boolean;
  setup_note: string | null;
  last_checked_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  consecutive_failures: number;
};

export type DiscoveryCandidate = {
  id: string;
  source_id: string;
  external_id: string;
  canonical_url: string;
  title: string;
  description: string | null;
  eligibility: string | null;
  deadline: string | null;
  location: string | null;
  organization_name: string | null;
  category_slug: string | null;
  status: "pending" | "needs_review" | "published" | "rejected" | "duplicate" | "expired";
  review_note: string | null;
  first_seen_at: string;
  last_seen_at: string;
  link_http_status: number | null;
  opportunity_sources: Pick<DiscoverySource, "name" | "trust_tier" | "default_category_slug"> | null;
};

export type DiscoveryRun = {
  id: string;
  source_id: string | null;
  mode: "discover" | "recheck";
  status: "running" | "success" | "partial" | "failed";
  fetched_count: number;
  new_count: number;
  updated_count: number;
  duplicate_count: number;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
  opportunity_sources: { name: string } | null;
};

export type DiscoveryCategory = { id: string; name: string; slug: string };

function invalidateDiscovery(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["admin", "opportunity-discovery"] });
  qc.invalidateQueries({ queryKey: ["opportunities"] });
  qc.invalidateQueries({ queryKey: ["matched-opportunities"] });
}

export function useDiscoverySources() {
  return useQuery({
    queryKey: ["admin", "opportunity-discovery", "sources"],
    queryFn: async (): Promise<DiscoverySource[]> => {
      const { data, error } = await supabase.from("opportunity_sources").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as DiscoverySource[];
    },
  });
}

export function useDiscoveryCandidates() {
  return useQuery({
    queryKey: ["admin", "opportunity-discovery", "candidates"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<DiscoveryCandidate[]> => {
      const { data, error } = await supabase
        .from("opportunity_candidates")
        .select("id,source_id,external_id,canonical_url,title,description,eligibility,deadline,location,organization_name,category_slug,status,review_note,first_seen_at,last_seen_at,link_http_status,opportunity_sources(name,trust_tier,default_category_slug)")
        .in("status", ["pending", "needs_review"])
        .order("last_seen_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as DiscoveryCandidate[];
    },
  });
}

export function useDiscoveryRuns() {
  return useQuery({
    queryKey: ["admin", "opportunity-discovery", "runs"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<DiscoveryRun[]> => {
      const { data, error } = await supabase
        .from("opportunity_discovery_runs")
        .select("id,source_id,mode,status,fetched_count,new_count,updated_count,duplicate_count,error_message,started_at,finished_at,opportunity_sources(name)")
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as DiscoveryRun[];
    },
  });
}

export function useDiscoveryCategories() {
  return useQuery({
    queryKey: ["admin", "opportunity-discovery", "categories"],
    queryFn: async (): Promise<DiscoveryCategory[]> => {
      const { data, error } = await supabase.from("opportunity_categories").select("id,name,slug").order("name");
      if (error) throw error;
      return (data ?? []) as DiscoveryCategory[];
    },
  });
}

export function useRunOpportunityDiscovery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mode: "discover" | "recheck" = "discover") => {
      const { data, error } = await supabase.functions.invoke("opportunity-discovery", { body: { mode, force: mode === "discover" } });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error ?? "Discovery run failed.");
      return data;
    },
    onSuccess: () => invalidateDiscovery(qc),
  });
}

export function useAddDiscoverySource() {
  const qc = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      endpointUrl: string;
      format: DiscoverySource["format"];
      trustTier: DiscoverySource["trust_tier"];
      categorySlug?: string | null;
      location?: string | null;
      organizationName?: string | null;
      checkEveryMinutes?: number;
      appname?: string | null;
    }) => {
      const name = input.name.trim();
      const endpoint = input.endpointUrl.trim();
      if (!name || !/^https:\/\//i.test(endpoint)) throw new Error("Use a source name and a secure https:// endpoint.");
      if (input.format === "reliefweb" && !input.appname?.trim()) throw new Error("ReliefWeb requires your approved appname before this source can be enabled.");
      const adapter: Record<string, unknown> = {};
      if (input.format === "reliefweb") {
        adapter.appname = input.appname?.trim() ?? "";
        adapter.limit = 50;
      }
      const { data, error } = await supabase.from("opportunity_sources").insert({
        name,
        endpoint_url: endpoint,
        format: input.format,
        enabled: true,
        trust_tier: input.trustTier,
        default_category_slug: input.categorySlug || null,
        default_location: input.location?.trim() || null,
        default_organization_name: input.organizationName?.trim() || null,
        check_every_minutes: input.checkEveryMinutes ?? 240,
        adapter,
        auto_publish: false,
        requires_setup: false,
        setup_note: null,
        created_by: userId,
      }).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateDiscovery(qc),
  });
}

export function useToggleDiscoverySource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { data, error } = await supabase.from("opportunity_sources").update({ enabled, updated_at: new Date().toISOString() }).eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("The source could not be updated.");
    },
    onSuccess: () => invalidateDiscovery(qc),
  });
}

export function useSetDiscoveryAutoPublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, autoPublish }: { id: string; autoPublish: boolean }) => {
      const { data: source, error: readError } = await supabase.from("opportunity_sources").select("trust_tier").eq("id", id).single();
      if (readError) throw readError;
      if (autoPublish && source.trust_tier === "trusted_aggregator") throw new Error("Auto-publish is restricted to official or direct partner sources.");
      const { data, error } = await supabase.from("opportunity_sources").update({ auto_publish: autoPublish, updated_at: new Date().toISOString() }).eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Auto-publish setting was not changed.");
    },
    onSuccess: () => invalidateDiscovery(qc),
  });
}

export function useApproveDiscoveryCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ candidateId, categoryId }: { candidateId: string; categoryId?: string | null }) => {
      const { data, error } = await supabase.rpc("admin_approve_opportunity_candidate", { p_candidate_id: candidateId, p_category_id: categoryId ?? null });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidateDiscovery(qc),
  });
}

export function useRejectDiscoveryCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ candidateId, reason }: { candidateId: string; reason?: string }) => {
      const { error } = await supabase.rpc("admin_reject_opportunity_candidate", { p_candidate_id: candidateId, p_reason: reason?.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => invalidateDiscovery(qc),
  });
}
