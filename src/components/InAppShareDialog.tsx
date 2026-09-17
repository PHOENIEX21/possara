import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Send, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

type ShareProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  path: string;
  preview?: string;
};

export function InAppShareDialog({ open, onClose, title, path, preview }: Props) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const people = useQuery({
    queryKey: ["share-people", userId],
    enabled: open && !!userId,
    queryFn: async (): Promise<ShareProfile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,username,avatar_url")
        .neq("id", userId as string)
        .order("full_name", { ascending: true, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ShareProfile[];
    },
  });

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return people.data ?? [];
    return (people.data ?? []).filter((person) =>
      `${person.full_name ?? ""} ${person.username ?? ""}`.toLowerCase().includes(needle),
    );
  }, [people.data, search]);

  const send = useMutation({
    mutationFn: async (recipientId: string) => {
      if (!userId) throw new Error("Sign in to share inside POSSARA.");
      const cleanPreview = preview?.trim();
      const content = `${title}${cleanPreview ? `\n${cleanPreview}` : ""}\n${window.location.origin}${path}`.slice(0, 4000);
      const { error } = await supabase.from("messages").insert({
        sender_id: userId,
        recipient_id: recipientId,
        content,
      });
      if (error) throw error;
      return recipientId;
    },
    onSuccess: (recipientId) => {
      setSentTo(recipientId);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      window.setTimeout(() => setSentTo(null), 1600);
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-end bg-ink/45 sm:items-center sm:justify-center sm:p-4" onClick={onClose}>
      <div className="max-h-[82vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-paper-dim px-4 py-3">
          <div><p className="font-semibold">Share inside POSSARA</p><p className="text-xs text-ink-faint">Send this directly to another member.</p></div>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-paper" aria-label="Close"><X size={18}/></button>
        </div>

        {!userId ? (
          <p className="p-5 text-sm text-ink-light">Sign in to share with people inside POSSARA.</p>
        ) : (
          <>
            <div className="p-3">
              <label className="flex items-center gap-2 rounded-xl border border-paper-dim bg-paper/50 px-3 py-2">
                <Search size={15} className="text-ink-faint"/>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/>
              </label>
            </div>
            <div className="max-h-[58vh] overflow-y-auto px-2 pb-3">
              {people.isLoading && <p className="p-4 text-sm text-ink-light">Loading people…</p>}
              {people.error && <p className="p-4 text-sm text-flag">Couldn&apos;t load people to share with.</p>}
              {!people.isLoading && !people.error && filtered.map((person) => {
                const name = person.full_name ?? person.username ?? "POSSARA member";
                const sent = sentTo === person.id;
                return (
                  <div key={person.id} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-paper">
                    {person.avatar_url ? <img src={person.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover"/> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-trust-light text-sm font-semibold text-trust-dark">{name.charAt(0).toUpperCase()}</div>}
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{name}</p>{person.username && <p className="truncate text-xs text-ink-faint">@{person.username}</p>}</div>
                    <button type="button" onClick={() => send.mutate(person.id)} disabled={send.isPending && !sent} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${sent ? "bg-trust-light text-trust-dark" : "bg-ink text-white"}`}>
                      <Send size={13}/>{sent ? "Sent" : "Send"}
                    </button>
                  </div>
                );
              })}
              {!people.isLoading && !people.error && filtered.length === 0 && <p className="p-5 text-center text-sm text-ink-faint">No member matches that search.</p>}
              {send.error && <p className="px-3 pb-2 text-sm text-flag">{(send.error as Error).message}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
