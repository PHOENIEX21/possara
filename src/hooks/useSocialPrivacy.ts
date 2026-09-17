import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export type SocialPrivacy = {
  show_online_status: boolean;
  send_read_receipts: boolean;
  show_story_views: boolean;
};

export const DEFAULT_SOCIAL_PRIVACY: SocialPrivacy = {
  show_online_status: true,
  send_read_receipts: true,
  show_story_views: true,
};

export function useSocialPrivacy() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["social-privacy", userId],
    enabled: !!userId,
    queryFn: async (): Promise<SocialPrivacy> => {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("show_online_status, send_read_receipts, show_story_views")
        .eq("user_id", userId as string)
        .maybeSingle();
      if (error) throw error;
      return data ? { ...DEFAULT_SOCIAL_PRIVACY, ...data } : DEFAULT_SOCIAL_PRIVACY;
    },
  });
}

export function useUpdateSocialPrivacy() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (privacy: SocialPrivacy) => {
      if (!userId) throw new Error("Sign in to update privacy settings.");
      const { error } = await supabase.from("user_preferences").upsert(
        { user_id: userId, ...privacy, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["social-privacy", userId] }),
  });
}

export function usePresenceHeartbeat() {
  const { userId } = useAuth();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const ping = async () => {
      if (cancelled) return;
      await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", userId);
    };

    void ping();
    const timer = window.setInterval(() => void ping(), 45_000);
    const onVisibility = () => { if (document.visibilityState === "visible") void ping(); };
    const onFocus = () => void ping();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [userId]);
}

export function useUserPresence(otherUserId: string | undefined) {
  return useQuery({
    queryKey: ["user-presence", otherUserId],
    enabled: !!otherUserId,
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_social_status", { target_user_id: otherUserId as string });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const visible = row?.show_online_status ?? true;
      const sendReadReceipts = row?.send_read_receipts ?? true;
      const lastSeenAt = visible ? row?.last_seen_at ?? null : null;
      const online = !!lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < 120_000;
      return { visible, online, lastSeenAt, sendReadReceipts };
    },
  });
}
