import { useLayoutEffect, useRef, useState, type SetStateAction } from "react";

function read<T>(key: string | null): T | undefined {
  if (!key) return undefined;
  try { const raw = localStorage.getItem(key); return raw === null ? undefined : JSON.parse(raw) as T; }
  catch { return undefined; }
}

// Write on the input event, not a delayed effect: refreshing immediately after
// typing cannot replace a restored draft with an empty initial render.
export function usePersistentDraft<T>(key: string | null, initial: T) {
  const [stored, setStored] = useState<{key: string | null; value: T | undefined}>(() => ({key, value: read<T>(key)}));
  const [storageError, setStorageError] = useState("");
  let current = stored;
  if (stored.key !== key) {
    current = {key, value: read<T>(key)};
    setStored(current);
  }
  const value = current.value === undefined ? initial : current.value;
  const latest = useRef(value);
  useLayoutEffect(() => { latest.current = value; }, [value]);
  function setValue(next: SetStateAction<T>) {
    const resolved = typeof next === "function" ? (next as (previous: T) => T)(latest.current) : next;
    latest.current = resolved;
    if (key) {
      try { localStorage.setItem(key, JSON.stringify(resolved)); setStorageError(""); }
      catch { setStorageError("This browser could not save your draft. Keep this page open until you submit."); }
    }
    setStored({key, value: resolved});
  }
  function clearDraft() {
    if (key) { try { localStorage.removeItem(key); } catch { /* Keep the form usable. */ } }
    setStored({key, value: undefined});
  }
  return [value, setValue, clearDraft, storageError] as const;
}
