import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

type MentionProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

function activeQuery(value: string) {
  const match = value.match(/(?:^|\s)@([A-Za-z0-9_]{0,24})$/);
  return match?.[1]?.toLowerCase() ?? null;
}

export function useMentionSuggestions(value: string) {
  const query = useMemo(() => activeQuery(value), [value]);
  const result = useQuery({
    queryKey: ["mention-suggestions", query],
    enabled: query !== null,
    staleTime: 60_000,
    queryFn: async (): Promise<MentionProfile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url")
        .not("username", "is", null)
        .ilike("username", `${query ?? ""}%`)
        .order("username")
        .limit(6);
      if (error) throw error;
      return (data ?? []) as MentionProfile[];
    },
  });
  return { ...result, mentionQuery: query };
}

export function applyMention(value: string, username: string) {
  return value.replace(/(?:^|\s)@[A-Za-z0-9_]{0,24}$/, (match) => {
    const leading = match.startsWith(" ") ? " " : "";
    return `${leading}@${username} `;
  });
}

export function MentionSuggestions({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { data, mentionQuery } = useMentionSuggestions(value);
  if (mentionQuery === null || !data?.length) return null;

  return (
    <div className="mt-1 overflow-hidden rounded-2xl border border-paper-dim bg-white shadow-lg">
      {data.map((person) => (
        <button
          key={person.id}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => person.username && onChange(applyMention(value, person.username))}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-paper"
        >
          {person.avatar_url ? (
            <img src={person.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-trust-light text-xs font-semibold text-trust-dark">
              {(person.full_name ?? person.username ?? "?").charAt(0).toUpperCase()}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{person.full_name ?? person.username}</span>
            <span className="block truncate text-xs text-ink-faint">@{person.username}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
