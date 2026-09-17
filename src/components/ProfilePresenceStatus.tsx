import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useProfileByUsername } from "../hooks/useProfile";
import { useUserPresence } from "../hooks/useSocialPrivacy";
import { useAuth } from "../store/auth";

function presenceLabel(lastSeenAt: string | null, online: boolean) {
  if (online) return "Active now";
  if (!lastSeenAt) return null;

  const elapsed = Math.max(0, Date.now() - new Date(lastSeenAt).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 5) return "Active a few minutes ago";
  if (minutes < 60) return `Active ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Active ${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `Active ${days}d ago`;

  return `Last active ${new Date(lastSeenAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export function ProfilePresenceStatus() {
  const { username, id } = useParams<{ username?: string; id?: string }>();
  const { userId } = useAuth();
  const lookupUsername = !id && username && username !== "me" ? username : undefined;
  const { data: profile } = useProfileByUsername(lookupUsername);
  const targetUserId = id ?? (username === "me" ? userId ?? undefined : profile?.id);
  const { data: presence } = useUserPresence(userId ? targetUserId : undefined);

  const label = useMemo(
    () => presence ? presenceLabel(presence.lastSeenAt, presence.online) : null,
    [presence],
  );

  if (!presence?.visible || !label) return null;

  return (
    <div className="max-w-2xl px-1">
      <div className="flex justify-end">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm ${
            presence.online
              ? "border-trust/25 bg-trust-light text-trust-dark"
              : "border-paper-dim bg-white text-ink-light"
          }`}
          aria-label={label}
          title={label}
        >
          <span className={`h-2 w-2 rounded-full ${presence.online ? "bg-trust" : "bg-ink-faint/50"}`} aria-hidden="true" />
          {label}
        </span>
      </div>
    </div>
  );
}
