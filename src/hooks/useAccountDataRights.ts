import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export type DeletionRequest = {
  id: string;
  status: "requested" | "canceled" | "processing" | "completed" | "rejected";
  requested_at: string;
  canceled_at: string | null;
  processed_at: string | null;
};

export function useDeletionRequest() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["account-deletion-request", userId],
    enabled: !!userId,
    queryFn: async (): Promise<DeletionRequest | null> => {
      const { data, error } = await supabase
        .from("account_deletion_requests")
        .select("id,status,requested_at,canceled_at,processed_at")
        .eq("user_id", userId as string)
        .maybeSingle();
      if (error) throw error;
      return data as DeletionRequest | null;
    },
  });
}

export function useRequestAccountDeletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("request_account_deletion");
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["account-deletion-request"] }),
  });
}

export function useCancelAccountDeletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("cancel_account_deletion");
      if (error) throw error;
      return data === true;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["account-deletion-request"] }),
  });
}

export function useExportMyData() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("account-data-export", { body: {} });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "POSSARA could not prepare your data export.");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `possara-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      return data;
    },
  });
}
