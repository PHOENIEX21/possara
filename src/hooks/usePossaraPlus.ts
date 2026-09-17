import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export type PossaraPlan = "free" | "plus";
export type PossaraSubscription = {
  user_id: string;
  plan: PossaraPlan;
  status: "inactive" | "trialing" | "active" | "past_due" | "cancelled";
  trial_ends_at: string | null;
  current_period_end: string | null;
};

export type ApplicationStatus = "preparing" | "applied" | "interview" | "accepted" | "rejected" | "withdrawn";
export type OpportunityApplication = {
  id: string;
  user_id: string;
  opportunity_id: string;
  status: ApplicationStatus;
  notes: string | null;
  next_step: string | null;
  next_step_due_at: string | null;
  created_at: string;
  updated_at: string;
  opportunities?: { title: string; deadline: string | null; link: string | null; organizations: { name: string } | null } | null;
};

export type ApplicationTask = {
  id: string;
  application_id: string;
  user_id: string;
  label: string;
  done: boolean;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GrowthPassportKind = "skill" | "project" | "learning" | "achievement" | "service" | "opportunity";
export type GrowthPassportItem = {
  id: string;
  user_id: string;
  kind: GrowthPassportKind;
  title: string;
  issuer: string | null;
  description: string | null;
  evidence_url: string | null;
  occurred_on: string | null;
  visibility: "private" | "public";
  verified: boolean;
  created_at: string;
  updated_at: string;
};

export function usePossaraSubscription() {
  const { userId } = useAuth();
  return useQuery({ queryKey: ["possara-subscription", userId], enabled: !!userId, queryFn: async (): Promise<PossaraSubscription | null> => { const { data, error } = await supabase.from("possara_subscriptions").select("user_id,plan,status,trial_ends_at,current_period_end").eq("user_id", userId as string).maybeSingle(); if (error) return null; return data as PossaraSubscription | null; } });
}

export function useOpportunityApplications() {
  const { userId } = useAuth();
  return useQuery({ queryKey: ["opportunity-applications", userId], enabled: !!userId, queryFn: async (): Promise<OpportunityApplication[]> => { const { data, error } = await supabase.from("opportunity_applications").select("*, opportunities(title,deadline,link,organizations(name))").eq("user_id", userId as string).order("updated_at", { ascending: false }); if (error) throw error; return (data ?? []) as OpportunityApplication[]; } });
}

export function useApplicationForOpportunity(opportunityId?: string) {
  const { userId } = useAuth();
  return useQuery({ queryKey: ["opportunity-application", opportunityId, userId], enabled: !!userId && !!opportunityId, queryFn: async (): Promise<OpportunityApplication | null> => { const { data, error } = await supabase.from("opportunity_applications").select("*").eq("user_id", userId as string).eq("opportunity_id", opportunityId as string).maybeSingle(); if (error) throw error; return data as OpportunityApplication | null; } });
}

export function useSaveApplication() {
  const { userId } = useAuth(); const qc = useQueryClient();
  return useMutation({ mutationFn: async (input: { opportunityId: string; status?: ApplicationStatus; notes?: string | null; nextStep?: string | null; nextStepDueAt?: string | null }) => { if (!userId) throw new Error("Sign in to track an application."); const payload = { user_id: userId, opportunity_id: input.opportunityId, status: input.status ?? "preparing", notes: input.notes ?? null, next_step: input.nextStep ?? null, next_step_due_at: input.nextStepDueAt ?? null, updated_at: new Date().toISOString() }; const { data, error } = await supabase.from("opportunity_applications").upsert(payload, { onConflict: "user_id,opportunity_id" }).select("*").single(); if (error) throw error; return data as OpportunityApplication; }, onSuccess: (row) => { qc.invalidateQueries({ queryKey: ["opportunity-applications"] }); qc.invalidateQueries({ queryKey: ["opportunity-application", row.opportunity_id] }); } });
}

export function useDeleteApplication() {
  const { userId } = useAuth(); const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => { if (!userId) throw new Error("Sign in to manage applications."); const { error } = await supabase.from("opportunity_applications").delete().eq("id", id).eq("user_id", userId); if (error) throw error; }, onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunity-applications"] }) });
}

export function useApplicationTasks(applicationId: string) {
  const { userId } = useAuth();
  return useQuery({ queryKey: ["application-tasks", applicationId, userId], enabled: !!userId && !!applicationId, queryFn: async (): Promise<ApplicationTask[]> => { const { data, error } = await supabase.from("opportunity_application_tasks").select("*").eq("application_id", applicationId).eq("user_id", userId as string).order("done").order("created_at"); if (error) throw error; return (data ?? []) as ApplicationTask[]; } });
}

export function useAddApplicationTask(applicationId: string) {
  const { userId } = useAuth(); const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ label, dueAt }: { label: string; dueAt?: string | null }) => { if (!userId) throw new Error("Sign in to update your checklist."); const clean = label.trim(); if (!clean) throw new Error("Add a checklist item first."); const { data, error } = await supabase.from("opportunity_application_tasks").insert({ application_id: applicationId, user_id: userId, label: clean.slice(0,240), due_at: dueAt ?? null }).select("*").single(); if (error) throw error; return data as ApplicationTask; }, onSuccess: () => qc.invalidateQueries({ queryKey: ["application-tasks", applicationId] }) });
}

export function useToggleApplicationTask(applicationId: string) {
  const { userId } = useAuth(); const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ id, done }: { id: string; done: boolean }) => { if (!userId) throw new Error("Sign in to update your checklist."); const { error } = await supabase.from("opportunity_application_tasks").update({ done, updated_at: new Date().toISOString() }).eq("id", id).eq("application_id", applicationId).eq("user_id", userId); if (error) throw error; }, onSuccess: () => qc.invalidateQueries({ queryKey: ["application-tasks", applicationId] }) });
}

export function useDeleteApplicationTask(applicationId: string) {
  const { userId } = useAuth(); const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => { if (!userId) throw new Error("Sign in to update your checklist."); const { error } = await supabase.from("opportunity_application_tasks").delete().eq("id", id).eq("application_id", applicationId).eq("user_id", userId); if (error) throw error; }, onSuccess: () => qc.invalidateQueries({ queryKey: ["application-tasks", applicationId] }) });
}

export function useGrowthPassport(userIdOverride?: string) {
  const { userId } = useAuth(); const target = userIdOverride ?? userId; const own = !userIdOverride || userIdOverride === userId;
  return useQuery({ queryKey: ["growth-passport", target, own], enabled: !!target, queryFn: async (): Promise<GrowthPassportItem[]> => { let query = supabase.from("growth_passport_items").select("*").eq("user_id", target as string).order("occurred_on", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }); if (!own) query = query.eq("visibility", "public"); const { data, error } = await query; if (error) throw error; return (data ?? []) as GrowthPassportItem[]; } });
}

export function useAddGrowthPassportItem() {
  const { userId } = useAuth(); const qc = useQueryClient();
  return useMutation({ mutationFn: async (input: { kind: GrowthPassportKind; title: string; issuer?: string | null; description?: string | null; evidenceUrl?: string | null; occurredOn?: string | null; visibility?: "private" | "public" }) => { if (!userId) throw new Error("Sign in to update your Growth Passport."); const { data, error } = await supabase.from("growth_passport_items").insert({ user_id: userId, kind: input.kind, title: input.title.trim(), issuer: input.issuer?.trim() || null, description: input.description?.trim() || null, evidence_url: input.evidenceUrl?.trim() || null, occurred_on: input.occurredOn || null, visibility: input.visibility ?? "private" }).select("*").single(); if (error) throw error; return data as GrowthPassportItem; }, onSuccess: () => qc.invalidateQueries({ queryKey: ["growth-passport"] }) });
}

export function useUpdateGrowthPassportVisibility() {
  const { userId } = useAuth(); const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ id, visibility }: { id: string; visibility: "private" | "public" }) => { if (!userId) throw new Error("Sign in to update your Growth Passport."); const { error } = await supabase.from("growth_passport_items").update({ visibility, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId); if (error) throw error; }, onSuccess: () => qc.invalidateQueries({ queryKey: ["growth-passport"] }) });
}
