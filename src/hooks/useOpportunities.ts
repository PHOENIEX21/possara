import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Opportunity, Organization, OpportunityCategory } from "../types/database";

export interface OpportunitySourceInfo { name: string; verified_source: boolean; trust_tier: string; last_success_at: string | null; }
export interface OpportunityWithOrg extends Opportunity {
  organizations: Pick<Organization, "name" | "verified" | "is_sponsored"> | null;
  opportunity_categories: Pick<OpportunityCategory, "name" | "icon" | "color"> | null;
  opportunity_candidates: { opportunity_sources: OpportunitySourceInfo | null } | null;
}
interface UseOpportunitiesOptions { limit?: number; categorySlug?: string; categorySlugs?: string[]; }

export function useOpportunities({ limit = 20, categorySlug, categorySlugs }: UseOpportunitiesOptions = {}) {
  return useQuery({
    queryKey: ["opportunities", { limit, categorySlug, categorySlugs }],
    queryFn: async (): Promise<OpportunityWithOrg[]> => {
      let categoryIds: string[] | undefined;
      const slugsToResolve = categorySlugs ?? (categorySlug ? [categorySlug] : undefined);
      if (slugsToResolve?.length) {
        const { data: categories } = await supabase.from("opportunity_categories").select("id").in("slug", slugsToResolve);
        categoryIds = (categories ?? []).map((c) => c.id);
        if (!categoryIds.length) return [];
      }
      const nowIso = new Date().toISOString();
      let query = supabase.from("opportunities").select("*, organizations(name, verified, is_sponsored), opportunity_categories(name, icon, color), opportunity_candidates(opportunity_sources(name,verified_source,trust_tier,last_success_at))").eq("status", "active").or(`deadline.is.null,deadline.gte.${nowIso}`).order("created_at", { ascending: false }).limit(limit);
      if (categoryIds) query = query.in("category_id", categoryIds);
      const { data, error } = await query;
      if (error) throw error;
      return (data as OpportunityWithOrg[]) ?? [];
    },
  });
}

export function useOpportunity(id: string | undefined) {
  return useQuery({ queryKey: ["opportunity", id], enabled: !!id, queryFn: async (): Promise<OpportunityWithOrg | null> => { const { data, error } = await supabase.from("opportunities").select("*, organizations(name, verified, is_sponsored), opportunity_categories(name, icon, color), opportunity_candidates(opportunity_sources(name,verified_source,trust_tier,last_success_at))").eq("id", id as string).single(); if (error) throw error; return data as OpportunityWithOrg; } });
}
