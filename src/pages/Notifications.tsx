import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

function useNotifications(userId: string | null) {
  return useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useMarkAllNotificationsRead(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);
      if (error) throw error;
    },
    onMutate: async () => {
      queryClient.setQueryData(["unread-notification-count", userId], 0);
    },
    onSuccess: () => {
      queryClient.setQueryData(["unread-notification-count", userId], 0);
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count", userId] });
    },
  });
}

export function Notifications() {
  const { userId } = useAuth();
  const { data: notifications, isLoading } = useNotifications(userId);
  const markAllRead = useMarkAllNotificationsRead(userId);
  const navigate = useNavigate();

  const hasUnread = !!notifications?.some((notification) => !notification.read);

  useEffect(() => {
    if (!userId || !hasUnread || markAllRead.isPending) return;
    markAllRead.mutate();
  }, [userId, hasUnread]);

  function handleClick(notification: { link: string | null }) {
    if (notification.link) navigate(notification.link);
  }

  return (
    <div className="max-w-prose">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Notifications</h1>
          <p className="mt-1 text-ink-light">Opportunity, organization and social updates in one place.</p>
        </div>
        {!isLoading && notifications?.length ? <span className="text-xs text-ink-faint">All caught up</span> : null}
      </div>

      {isLoading && <p className="mt-4 text-ink-light">Loading…</p>}
      {!isLoading && notifications?.length === 0 && (
        <div className="mt-8 flex flex-col items-center py-12 text-center">
          <Bell size={28} className="text-ink-faint" />
          <p className="mt-3 text-ink-light">You're all caught up.</p>
        </div>
      )}

      <div className="mt-4 divide-y divide-paper-dim overflow-hidden rounded-2xl border border-paper-dim bg-white">
        {notifications?.map((notification) => (
          <button
            key={notification.id}
            type="button"
            onClick={() => handleClick(notification)}
            className="block w-full px-4 py-3 text-left transition hover:bg-paper-dim/40"
          >
            <p className="font-medium text-ink">{notification.title}</p>
            {notification.message && <p className="mt-0.5 text-sm font-normal text-ink-light">{notification.message}</p>}
            <p className="mt-1 text-xs font-normal text-ink-faint">{new Date(notification.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
