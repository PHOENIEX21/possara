import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { UserRole } from "../types/database";

function noRows(action: string) {
  return new Error(`${action} did not update anything. Confirm that this account still has the admin role, then sign out and back in.`);
}

export function usePendingOpportunities() {
  return useQuery({
    queryKey: ["admin", "pending-opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("id,title,description,status,source,created_at,organizations(name)")
        .eq("status", "draft")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSetOpportunityReviewStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "flagged" }) => {
      const updates = status === "active" ? { status, last_verified_at: new Date().toISOString() } : { status };
      const { data, error } = await supabase.from("opportunities").update(updates).eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw noRows("Opportunity review");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      qc.invalidateQueries({ queryKey: ["matched-opportunities"] });
    },
  });
}

export function useUnverifiedOrganizations() {
  return useQuery({
    queryKey: ["admin", "unverified-organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id,name,slug,website,created_at")
        .eq("verified", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminOrganizations() {
  return useQuery({
    queryKey: ["admin", "organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id,name,slug,website,description,industry,country,state,headquarters,verified")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; website?: string; description?: string; industry?: string; country?: string; state?: string; headquarters?: string }) => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Sign in again before creating an organization.");
      const base = input.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "organization";
      let slug = base;
      const { data: existing } = await supabase.from("organizations").select("slug").eq("slug", slug).maybeSingle();
      if (existing) slug = `${base}-${Date.now().toString().slice(-6)}`;
      const { data, error } = await supabase.from("organizations").insert({
        owner_id: authData.user.id,
        name: input.name.trim(),
        slug,
        website: input.website?.trim() || null,
        description: input.description?.trim() || null,
        industry: input.industry?.trim() || null,
        country: input.country?.trim() || null,
        state: input.state?.trim() || null,
        headquarters: input.headquarters?.trim() || null,
        verified: false,
        is_sponsored: false,
      }).select("id,slug").single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["organization-directory"] });
    },
  });
}

export function useUpdateOrganizationDirectoryMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; industry?: string | null; country?: string | null; state?: string | null; headquarters?: string | null }) => {
      const { data, error } = await supabase.from("organizations").update(updates).eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw noRows("Organization update");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "organizations"] });
      qc.invalidateQueries({ queryKey: ["organization-directory"] });
      qc.invalidateQueries({ queryKey: ["organization"] });
    },
  });
}

export function useVerifyOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("organizations").update({ verified: true }).eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw noRows("Organization verification");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      qc.invalidateQueries({ queryKey: ["organization"] });
      qc.invalidateQueries({ queryKey: ["organization-directory"] });
    },
  });
}

export function usePendingReports() {
  return useQuery({
    queryKey: ["admin", "pending-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id,reason,status,created_at,post_id,opportunity_id")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, actionTaken }: { id: string; status: "resolved" | "dismissed"; actionTaken: string }) => {
      const { data: authData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("reports")
        .update({ status, action_taken: actionTaken || null, resolved_by: authData.user?.id ?? null, resolved_at: new Date().toISOString() })
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw noRows("Report moderation");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "pending-reports"] }),
  });
}

export function usePendingAdvertisements() {
  return useQuery({
    queryKey: ["admin", "pending-advertisements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("advertisements").select("*").eq("status", "pending").order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useModerateAdvertisement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "rejected" }) => {
      const { data, error } = await supabase.from("advertisements").update({ status }).eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw noRows("Advertisement moderation");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "pending-advertisements"] });
      qc.invalidateQueries({ queryKey: ["advertisements"] });
    },
  });
}

export function useProfilesWithRoles() {
  return useQuery({
    queryKey: ["admin", "profiles-with-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,username,created_at,user_roles(role,is_verified)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSetUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { data, error } = await supabase.from("user_roles").update({ role, updated_at: new Date().toISOString() }).eq("user_id", userId).select("user_id");
      if (error) throw error;
      if (!data?.length) throw noRows("Role update");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "profiles-with-roles"] }),
  });
}
