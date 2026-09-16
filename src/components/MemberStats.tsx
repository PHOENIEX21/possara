import { Users, Circle } from "lucide-react";
import { usePresence } from "../hooks/usePresence";
import { useMemberStats } from "../hooks/useMemberStats";

export function MemberStats() {
  const { onlineCount } = usePresence();
  const { data: stats, isLoading } = useMemberStats();
  const displayedOnline = onlineCount ?? stats?.online_now;
  if (isLoading && !stats) return <div className="text-sm text-ink-faint">Loading community stats…</div>;
  return <div className="flex flex-col gap-1.5 px-3 text-sm text-ink-light"><span className="inline-flex items-center gap-1.5"><Users size={15} />{stats?.total_members?.toLocaleString() ?? "—"} members</span>{displayedOnline !== undefined && displayedOnline !== null && <span className="inline-flex items-center gap-1.5"><Circle size={8} className="fill-trust text-trust" />{displayedOnline.toLocaleString()} online now</span>}</div>;
}
