import { useMemo, useState } from "react";
import { Clock3, Share2 } from "lucide-react";
import { useUserPresence } from "../hooks/useSocialPrivacy";
import { useMemberTrustRank } from "../hooks/useTrustRank";
import type { Profile } from "../types/database";
import { InAppShareDialog } from "./InAppShareDialog";
import { TrustRankBadge } from "./TrustRankBadge";

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

export function ProfileSharePresence({ profile }: { profile: Profile }) {
  const [shareOpen, setShareOpen] = useState(false);
  const { data: presence } = useUserPresence(profile.id);
  const { data: trustRank } = useMemberTrustRank(profile.id);
  const label = useMemo(
    () => presence?.visible ? presenceLabel(presence.lastSeenAt, presence.online) : null,
    [presence],
  );
  const path = profile.username ? `/profile/${encodeURIComponent(profile.username)}` : `/profile/id/${profile.id}`;
  const name = profile.full_name?.trim() || profile.username?.trim() || "POSSARA member";

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TrustRankBadge rank={trustRank} />
        {label && (
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${presence?.online ? "border-trust/25 bg-trust-light text-trust-dark" : "border-paper-dim bg-paper/60 text-ink-light"}`} title={label}>
            <span className={`h-2 w-2 rounded-full ${presence?.online ? "bg-trust" : "bg-ink-faint/50"}`} aria-hidden="true" />
            {label}
          </span>
        )}
        <button type="button" onClick={() => setShareOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-paper-dim bg-white px-3 py-1.5 text-xs font-semibold text-ink-light shadow-sm hover:bg-paper" aria-label={`Share ${name}'s profile`}>
          <Share2 size={14}/>Share profile
        </button>
        {!label && presence?.visible === false && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint"><Clock3 size={12}/>Activity hidden</span>
        )}
      </div>
      <InAppShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={`${name} on POSSARA`}
        preview={profile.headline || profile.profession || "Follow this profile on POSSARA."}
        path={path}
      />
    </>
  );
}
