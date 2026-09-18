import { UserCheck, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../store/auth";
import { useFollowStatus, useToggleFollow } from "../hooks/useFollow";

export function MemberFollowButton({
  targetUserId,
  compact = false,
  signedOutLink = true,
}: {
  targetUserId: string | null | undefined;
  compact?: boolean;
  signedOutLink?: boolean;
}) {
  const { userId } = useAuth();
  const { data: isFollowing, isLoading } = useFollowStatus(targetUserId ?? undefined);
  const toggle = useToggleFollow(targetUserId ?? "");

  if (!targetUserId || userId === targetUserId) return null;

  const base = compact
    ? "min-h-8 px-2.5 py-1 text-xs"
    : "min-h-10 px-4 py-2 text-sm";

  if (!userId) {
    if (!signedOutLink) return null;
    return (
      <Link
        to="/signin"
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand/25 bg-brand-light font-semibold text-brand-dark ${base}`}
      >
        <UserPlus size={compact ? 13 : 15} />
        Follow
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={isLoading || toggle.isPending}
      onClick={() => toggle.mutate(!!isFollowing)}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold transition disabled:opacity-50 ${base} ${
        isFollowing
          ? "border border-ink-faint/30 bg-white text-ink-light hover:bg-paper"
          : "bg-ink text-white hover:-translate-y-0.5"
      }`}
      aria-label={isFollowing ? "Unfollow this member" : "Follow this member"}
    >
      {isFollowing ? <UserCheck size={compact ? 13 : 15} /> : <UserPlus size={compact ? 13 : 15} />}
      {toggle.isPending ? "Updating…" : isFollowing ? "Following" : "Follow"}
    </button>
  );
}
