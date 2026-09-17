import { useMemo, useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { useOwnProfile, useProfileById, useProfileByUsername } from "../hooks/useProfile";
import { useUserPresence } from "../hooks/useSocialPrivacy";
import { useAuth } from "../store/auth";
import { InAppShareDialog } from "./InAppShareDialog";

function statusLabel(lastSeenAt: string | null, online: boolean) {
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

export function ProfileTopActions() {
  const { username, id } = useParams<{ username?: string; id?: string }>();
  const { userId } = useAuth();
  const ownRoute = username === "me" || (!!id && id === userId);
  const own = useOwnProfile();
  const byUsername = useProfileByUsername(!ownRoute && !id ? username : undefined);
  const byId = useProfileById(!ownRoute ? id : undefined);
  const profile = ownRoute ? own.data : id ? byId.data : byUsername.data;
  const targetId = profile?.id;
  const presence = useUserPresence(userId ? targetId : undefined);
  const [sharing, setSharing] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const path = useMemo(() => {
    if (!profile) return "";
    if (profile.username) return `/profile/${profile.username}`;
    return `/profile/id/${profile.id}`;
  }, [profile]);

  const label = presence.data ? statusLabel(presence.data.lastSeenAt, presence.data.online) : null;

  async function copyProfileLink() {
    if (!path) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopyStatus("Link copied");
    } catch {
      setCopyStatus("Copy failed");
    }
    window.setTimeout(() => setCopyStatus(null), 1800);
  }

  if (!profile || !path) return null;

  return (
    <>
      <div className="mb-3 flex max-w-2xl flex-wrap items-center justify-between gap-2 rounded-2xl border border-paper-dim bg-white px-3 py-2.5 shadow-sm">
        <div className="min-h-7">
          {userId && presence.data?.visible && label ? (
            <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${presence.data.online ? "bg-trust-light text-trust-dark" : "bg-paper text-ink-light"}`}>
              <span className={`h-2 w-2 rounded-full ${presence.data.online ? "bg-trust" : "bg-ink-faint/50"}`} aria-hidden="true"/>
              {label}
            </span>
          ) : (
            <span className="text-xs text-ink-faint">Profile</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {userId && <button type="button" onClick={() => setSharing(true)} className="inline-flex items-center gap-1.5 rounded-full border border-paper-dim bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm hover:bg-paper"><Share2 size={14}/>Share in POSSARA</button>}
          <button type="button" onClick={copyProfileLink} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white"><Copy size={14}/>{copyStatus ?? "Copy profile link"}</button>
        </div>
      </div>

      <InAppShareDialog
        open={sharing}
        onClose={() => setSharing(false)}
        title={`${profile.full_name ?? profile.username ?? "POSSARA member"}'s profile`}
        path={path}
        preview={profile.headline ?? profile.profession ?? undefined}
      />
    </>
  );
}
