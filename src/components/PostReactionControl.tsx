import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useTogglePostReaction } from "../hooks/useFeedPosts";
import type { PostReactionType, PostWithAuthor } from "../hooks/useFeedPosts";

const REACTIONS: { type: PostReactionType; emoji: string; label: string }[] = [
  { type: "spark", emoji: "✨", label: "Spark" },
  { type: "like", emoji: "❤️", label: "Love" },
  { type: "insightful", emoji: "💡", label: "Insightful" },
  { type: "useful", emoji: "👍", label: "Useful" },
];

const HOLD_MS = 480;
const PEOPLE_PREVIEW_LIMIT = 100;

type ReactionPerson = {
  user_id: string;
  type: PostReactionType;
  profile: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    headline: string | null;
  } | null;
};

function usePostReactionPeople(postId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["post-reaction-people", postId],
    enabled,
    queryFn: async (): Promise<ReactionPerson[]> => {
      const { data: rows, error } = await supabase
        .from("reactions")
        .select("user_id,type,created_at")
        .eq("post_id", postId)
        .in("type", REACTIONS.map((item) => item.type))
        .order("created_at", { ascending: false })
        .limit(PEOPLE_PREVIEW_LIMIT);
      if (error) throw error;

      const ids = [...new Set((rows ?? []).map((row) => row.user_id).filter(Boolean))];
      if (!ids.length) return [];

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id,full_name,username,avatar_url,headline")
        .in("id", ids);
      if (profileError) throw profileError;

      const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      return (rows ?? []).map((row) => ({
        user_id: row.user_id,
        type: row.type as PostReactionType,
        profile: profileById.get(row.user_id) ?? null,
      }));
    },
  });
}

function profilePath(person: ReactionPerson) {
  return person.profile?.username ? `/profile/${person.profile.username}` : `/profile/id/${person.user_id}`;
}

function formatCompactCount(value: number) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function PostReactionControl({ post }: { post: PostWithAuthor }) {
  const toggleReaction = useTogglePostReaction();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const { data: people, isLoading, error } = usePostReactionPeople(post.id, peopleOpen);
  const timerRef = useRef<number | null>(null);
  const longPressOpened = useRef(false);
  const selected = REACTIONS.find((reaction) => reaction.type === post.viewer_reaction) ?? null;
  const visibleReaction = selected ?? REACTIONS[0];
  const onlyLikes = Boolean(people?.length) && people!.every((person) => person.type === "like");
  const remainingPeople = Math.max(0, post.reaction_count - (people?.length ?? 0));

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function startHold() {
    clearTimer();
    longPressOpened.current = false;
    timerRef.current = window.setTimeout(() => {
      longPressOpened.current = true;
      setPickerOpen(true);
      timerRef.current = null;
    }, HOLD_MS);
  }

  function toggleVisibleReaction() {
    toggleReaction.mutate({
      postId: post.id,
      reaction: visibleReaction.type,
      currentReaction: post.viewer_reaction,
    });
  }

  function finishPress() {
    const wasLongPress = longPressOpened.current;
    clearTimer();
    if (!wasLongPress && !pickerOpen) toggleVisibleReaction();
    longPressOpened.current = false;
  }

  function chooseReaction(reaction: PostReactionType) {
    toggleReaction.mutate({ postId: post.id, reaction, currentReaction: post.viewer_reaction });
    setPickerOpen(false);
  }

  return (
    <>
      <div className="relative inline-flex items-center gap-1">
        {pickerOpen && (
          <div className="absolute bottom-full left-0 z-30 mb-2 flex gap-1 rounded-2xl border border-black/[.06] bg-white p-2 shadow-xl" role="menu" aria-label="Choose a reaction">
            {REACTIONS.map((reaction) => {
              const active = post.viewer_reaction === reaction.type;
              return (
                <button
                  key={reaction.type}
                  type="button"
                  role="menuitem"
                  onClick={() => chooseReaction(reaction.type)}
                  className={`flex min-w-[62px] flex-col items-center rounded-xl px-2 py-2 text-xs font-medium transition hover:bg-paper ${active ? "bg-brand-light text-brand-dark" : "text-ink-light"}`}
                  title={reaction.label}
                >
                  <span className="text-xl leading-none">{reaction.emoji}</span>
                  <span className="mt-1">{reaction.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={pickerOpen}
          title={selected ? `Your reaction: ${selected.label} · press and hold to change` : "Tap to Spark · press and hold for more reactions"}
          onPointerDown={startHold}
          onPointerUp={finishPress}
          onPointerCancel={clearTimer}
          onPointerLeave={clearTimer}
          onContextMenu={(event) => {
            event.preventDefault();
            clearTimer();
            setPickerOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              toggleVisibleReaction();
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setPickerOpen(true);
            }
            if (event.key === "Escape") setPickerOpen(false);
          }}
          disabled={toggleReaction.isPending}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${post.viewer_reaction ? "bg-brand-light text-brand-dark" : "text-ink-light hover:bg-paper-dim"}`}
        >
          <span className="text-base leading-none">{visibleReaction.emoji}</span>
          <span>{visibleReaction.label}</span>
        </button>

        {post.reaction_count > 0 && (
          <button
            type="button"
            onClick={() => setPeopleOpen(true)}
            className="rounded-full px-2 py-1 text-xs font-semibold text-ink-faint hover:bg-paper-dim hover:text-ink"
            aria-label={`See ${post.reaction_count} reactions`}
          >
            {formatCompactCount(post.reaction_count)}
          </button>
        )}
        {pickerOpen && <button type="button" aria-label="Close reaction picker" onClick={() => setPickerOpen(false)} className="fixed inset-0 z-20 cursor-default bg-transparent" />}
      </div>

      {peopleOpen && (
        <div className="fixed inset-0 z-[85] flex items-end bg-ink/45 sm:items-center sm:justify-center sm:p-4" onClick={() => setPeopleOpen(false)}>
          <div className="max-h-[78vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="People who reacted">
            <div className="pt-2 sm:hidden">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-paper-dim" />
            </div>
            <div className="flex items-center justify-between border-b border-paper-dim px-5 py-4">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-ink">{onlyLikes ? "Liked by" : "Reacted by"}</h2>
                <p className="mt-0.5 text-xs text-ink-faint">{formatCompactCount(post.reaction_count)} {post.reaction_count === 1 ? "person" : "people"}</p>
              </div>
              <button type="button" onClick={() => setPeopleOpen(false)} className="rounded-full p-2 text-ink-light hover:bg-paper" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="max-h-[64vh] overflow-y-auto px-2 py-2 overscroll-contain">
              {isLoading && <p className="p-4 text-sm text-ink-light">Loading reactions…</p>}
              {error && <p className="p-4 text-sm text-flag">Couldn&apos;t load reactions.</p>}
              {people?.map((person) => {
                const reaction = REACTIONS.find((item) => item.type === person.type);
                const name = person.profile?.full_name ?? person.profile?.username ?? "POSSARA member";
                return (
                  <Link key={`${person.user_id}-${person.type}`} to={profilePath(person)} onClick={() => setPeopleOpen(false)} className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-paper">
                    {person.profile?.avatar_url ? (
                      <img src={person.profile.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-trust-light font-serif text-base font-semibold text-trust-dark">{name.charAt(0).toUpperCase()}</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-[17px] font-semibold text-ink">{name}</p>
                      {person.profile?.username && <p className="truncate text-xs text-ink-faint">@{person.profile.username}</p>}
                      {person.profile?.headline && <p className="truncate text-xs text-ink-light">{person.profile.headline}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1 rounded-full bg-paper-dim px-2.5 py-1 text-xs">
                      <span>{reaction?.emoji}</span>
                      <span className="hidden sm:inline">{reaction?.label}</span>
                    </div>
                  </Link>
                );
              })}
              {!isLoading && !error && people?.length === 0 && <p className="p-5 text-center text-sm text-ink-faint">No reactions yet.</p>}
              {remainingPeople > 0 && <p className="px-4 pb-5 pt-3 text-sm font-medium text-ink-light">and {formatCompactCount(remainingPeople)} others</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
