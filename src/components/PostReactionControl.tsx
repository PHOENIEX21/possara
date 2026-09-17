import { useRef, useState } from "react";
import { useTogglePostReaction } from "../hooks/useFeedPosts";
import type { PostReactionType, PostWithAuthor } from "../hooks/useFeedPosts";

const REACTIONS: { type: PostReactionType; emoji: string; label: string }[] = [
  { type: "spark", emoji: "✨", label: "Spark" },
  { type: "like", emoji: "❤️", label: "Love" },
  { type: "insightful", emoji: "💡", label: "Insightful" },
  { type: "useful", emoji: "👍", label: "Useful" },
];

const HOLD_MS = 480;

export function PostReactionControl({ post }: { post: PostWithAuthor }) {
  const toggleReaction = useTogglePostReaction();
  const [pickerOpen, setPickerOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const longPressOpened = useRef(false);
  const selected = REACTIONS.find((reaction) => reaction.type === post.viewer_reaction) ?? null;

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

  function finishPress() {
    const wasLongPress = longPressOpened.current;
    clearTimer();
    if (!wasLongPress && !pickerOpen) {
      toggleReaction.mutate({ postId: post.id, reaction: "spark", currentReaction: post.viewer_reaction });
    }
    longPressOpened.current = false;
  }

  function chooseReaction(reaction: PostReactionType) {
    toggleReaction.mutate({ postId: post.id, reaction, currentReaction: post.viewer_reaction });
    setPickerOpen(false);
  }

  return (
    <div className="relative inline-flex">
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
        title="Tap to Spark · press and hold for more reactions"
        onPointerDown={startHold}
        onPointerUp={finishPress}
        onPointerCancel={clearTimer}
        onPointerLeave={clearTimer}
        onContextMenu={(event) => { event.preventDefault(); clearTimer(); setPickerOpen(true); }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleReaction.mutate({ postId: post.id, reaction: "spark", currentReaction: post.viewer_reaction });
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
        <span className="text-base leading-none">✨</span>
        <span>Spark</span>
        {post.reaction_count > 0 && <span className="text-xs opacity-75">{post.reaction_count}</span>}
        {selected && selected.type !== "spark" && <span className="ml-0.5 text-sm" aria-label={`Your reaction: ${selected.label}`}>{selected.emoji}</span>}
      </button>

      {pickerOpen && <button type="button" aria-label="Close reaction picker" onClick={() => setPickerOpen(false)} className="fixed inset-0 z-20 cursor-default bg-transparent" />}
    </div>
  );
}
