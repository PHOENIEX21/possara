import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const PRESENCE_CHANNEL = "online-members";
const HEARTBEAT_INTERVAL_MS = 60_000;

export function usePresence() {
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  useEffect(() => {
    let isMounted = true;
    const channel = supabase.channel(PRESENCE_CHANNEL, { config: { presence: { key: crypto.randomUUID() } } });
    channel.on("presence", { event: "sync" }, () => { if (!isMounted) return; setOnlineCount(Object.keys(channel.presenceState()).length); }).subscribe(async (status) => { if (status === "SUBSCRIBED") await channel.track({ online_at: new Date().toISOString() }); });
    async function heartbeat() { const { data } = await supabase.auth.getUser(); if (!data.user) return; await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", data.user.id); }
    heartbeat();
    heartbeatRef.current = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
    return () => { isMounted = false; clearInterval(heartbeatRef.current); supabase.removeChannel(channel); };
  }, []);
  return { onlineCount };
}
