import { useRef, useState } from "react";
import { CheckCircle2, Plus, Trash2, X } from "lucide-react";
import { useActiveStories, useDeleteStory, usePostStory } from "../hooks/useStories";
import { useAuth } from "../store/auth";
import type { AuthorWithStories } from "../hooks/useStories";

function StoryViewer({ group, onClose }: { group: AuthorWithStories; onClose: () => void }) {
  const { userId } = useAuth();
  const deleteStory = useDeleteStory();
  const [index, setIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const story = group.stories[index];
  const ownStory = userId === story.author_id;

  function next() {
    setConfirmDelete(false);
    if (index < group.stories.length - 1) setIndex(index + 1);
    else onClose();
  }

  function prev() {
    setConfirmDelete(false);
    if (index > 0) setIndex(index - 1);
  }

  async function removeCurrent() {
    try {
      await deleteStory.mutateAsync(story);
      onClose();
    } catch {
      // The mutation error is shown below.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 px-4">
      <button onClick={onClose} className="absolute right-4 top-4 text-white hover:text-white/70" aria-label="Close">
        <X size={26} />
      </button>

      <div className="relative w-full max-w-sm">
        <div className="mb-2 flex gap-1">
          {group.stories.map((_, i) => (
            <div key={i} className={"h-1 flex-1 rounded-full " + (i <= index ? "bg-white" : "bg-white/30")} />
          ))}
        </div>

        <div className="mb-2 flex items-center gap-2 text-white">
          {group.author?.avatar_url ? (
            <img src={group.author.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs">
              {(group.author?.full_name ?? "?").charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-medium">{group.author?.full_name ?? "Member"}</span>
          {ownStory && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="ml-auto inline-flex items-center gap-1 text-xs text-white/75 hover:text-white"
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>

        {story.media_url ? (
          <img src={story.media_url} alt="" className="max-h-[70vh] w-full rounded-lg object-cover" />
        ) : (
          <div className="flex h-[60vh] items-center justify-center rounded-lg bg-white/10 text-sm text-white/70">
            Moment unavailable
          </div>
        )}

        {story.caption && <p className="mt-2 text-center text-sm text-white">{story.caption}</p>}

        {confirmDelete && (
          <div className="mt-3 rounded-xl bg-white/10 p-3 text-sm text-white">
            <p>Delete this Moment?</p>
            <div className="mt-2 flex gap-3">
              <button onClick={removeCurrent} disabled={deleteStory.isPending} className="font-medium text-red-200">
                {deleteStory.isPending ? "Deleting…" : "Yes, delete"}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-white/70">Cancel</button>
            </div>
          </div>
        )}
        {deleteStory.error && <p className="mt-2 text-xs text-red-200">{(deleteStory.error as Error).message}</p>}

        <div className="mt-3 flex justify-between">
          <button onClick={prev} disabled={index === 0} className="text-sm text-white/70 disabled:opacity-30">
            Previous
          </button>
          <button onClick={next} className="text-sm text-white/70">
            {index < group.stories.length - 1 ? "Next" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StoriesBar() {
  const { userId } = useAuth();
  const { data: groups } = useActiveStories();
  const postStory = usePostStory();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewingGroup, setViewingGroup] = useState<AuthorWithStories | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const otherGroups = groups?.filter((g) => g.authorId !== userId) ?? [];
  const myGroup = groups?.find((g) => g.authorId === userId);

  async function handleAddStory(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadMessage("Uploading Moment…");
    try {
      await postStory.mutateAsync({ imageFile: file, caption: "" });
      setUploadMessage("Moment uploaded.");
      window.setTimeout(() => setUploadMessage(null), 3000);
    } catch (err) {
      setUploadMessage(null);
      setUploadError((err as Error).message);
    } finally {
      e.target.value = "";
    }
  }

  if (!userId && otherGroups.length === 0) return null;

  return (
    <div>
      <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
        {userId && (
          <div className="flex shrink-0 flex-col items-center gap-1">
            <div className="relative h-14 w-14">
              <button
                type="button"
                onClick={() => (myGroup ? setViewingGroup(myGroup) : fileInputRef.current?.click())}
                className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-brand/40"
                aria-label={myGroup ? "View your Moments" : "Add a Moment"}
              >
                {myGroup ? (
                  <div className="h-full w-full rounded-full border-2 border-brand p-0.5">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-paper text-sm font-medium text-trust-dark">
                      You
                    </div>
                  </div>
                ) : (
                  <Plus size={20} className="text-brand" />
                )}
              </button>

              {myGroup && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={postStory.isPending}
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-brand text-white shadow-sm disabled:opacity-50"
                  aria-label="Add another Moment"
                  title="Add another Moment"
                >
                  <Plus size={14} strokeWidth={3} />
                </button>
              )}
            </div>
            <span className="text-[11px] text-ink-light">Your Moment</span>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAddStory} className="hidden" />

        {otherGroups.map((group) => (
          <button key={group.authorId} onClick={() => setViewingGroup(group)} className="flex shrink-0 flex-col items-center gap-1">
            <div className="h-14 w-14 rounded-full border-2 border-brand p-0.5">
              <div className="h-full w-full rounded-full bg-paper p-0.5">
                {group.author?.avatar_url ? (
                  <img src={group.author.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-trust-light text-sm font-medium text-trust-dark">
                    {(group.author?.full_name ?? "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <span className="max-w-[60px] truncate text-[11px] text-ink-light">
              {group.author?.full_name?.split(" ")[0] ?? "Member"}
            </span>
          </button>
        ))}

        {viewingGroup && <StoryViewer group={viewingGroup} onClose={() => setViewingGroup(null)} />}
      </div>

      {uploadMessage && (
        <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-trust-dark">
          {!postStory.isPending && <CheckCircle2 size={14} />}
          <span>{uploadMessage}</span>
        </div>
      )}
      {uploadError && <p className="mt-2 text-xs text-flag">{uploadError}</p>}
    </div>
  );
}
