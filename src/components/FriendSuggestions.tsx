import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useFriendSuggestions } from "../hooks/useFriendSuggestions";
import { MemberFollowButton } from "./MemberFollowButton";

export function FriendSuggestions() {
  const { data, isLoading, error } = useFriendSuggestions();
  const suggestions = data ?? [];

  if (!isLoading && !error && suggestions.length === 0) return null;

  return (
    <section className="rounded-[1.75rem] border border-black/[.05] bg-white p-4 shadow-sm sm:p-5" aria-label="People you may want to follow">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.12em] text-brand-dark">
            <Sparkles size={14}/>People to discover
          </p>
          <h2 className="mt-1 text-xl font-semibold">New connections that may fit you</h2>
          <p className="mt-1 text-sm text-ink-light">Suggestions use shared skills, interests and context — not follower popularity.</p>
        </div>
        <Link to="/connect" className="shrink-0 text-sm font-semibold text-brand-dark hover:underline">See more</Link>
      </div>

      {isLoading && <div className="feed-skeleton"/>}
      {error && <p className="text-sm text-flag">Couldn&apos;t load people suggestions right now.</p>}

      {!isLoading && !error && (
        <div className="scrollbar-none -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          {suggestions.map((person) => {
            const name = person.full_name ?? person.username ?? "POSSARA member";
            const path = person.username ? `/profile/${person.username}` : `/profile/id/${person.id}`;
            return (
              <article key={person.id} className="w-[220px] shrink-0 rounded-2xl border border-paper-dim bg-paper/35 p-3">
                <div className="flex items-start gap-3">
                  <Link to={path} className="shrink-0">
                    {person.avatar_url ? (
                      <img src={person.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover"/>
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-trust-light font-semibold text-trust-dark">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </Link>
                  <Link to={path} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink hover:underline">{name}</p>
                    {person.username && <p className="truncate text-[11px] text-ink-faint">@{person.username}</p>}
                    {(person.headline || person.profession) && <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-ink-light">{person.headline || person.profession}</p>}
                  </Link>
                </div>
                <p className="mt-3 truncate text-[11px] font-medium text-brand-dark">{person.reason}</p>
                <div className="mt-2"><MemberFollowButton targetUserId={person.id} compact/></div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
