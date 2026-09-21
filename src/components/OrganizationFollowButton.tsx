import { useAuth } from "../store/auth";
import { useOrganizationFollow, useToggleOrganizationFollow } from "../hooks/useOrganizationFollow";

export function OrganizationFollowButton({
  organizationId,
  isMember = false,
  compact = false,
}: {
  organizationId: string;
  isMember?: boolean;
  compact?: boolean;
}) {
  const { userId } = useAuth();
  const { data: followState } = useOrganizationFollow(organizationId);
  const toggle = useToggleOrganizationFollow(organizationId);

  if (isMember) return null;

  return (
    <button
      type="button"
      disabled={toggle.isPending}
      onClick={() => {
        if (!userId) {
          window.location.assign("/signin");
          return;
        }
        toggle.mutate(!!followState?.following);
      }}
      className={
        compact
          ? `rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${followState?.following ? "border border-ink-faint/25 bg-white text-ink" : "bg-ink text-white"}`
          : `rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50 ${followState?.following ? "border border-ink-faint/30 bg-white text-ink" : "bg-ink text-white"}`
      }
    >
      {toggle.isPending ? "Saving…" : followState?.following ? "Following" : "Follow"}
    </button>
  );
}
