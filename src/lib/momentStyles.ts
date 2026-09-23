import type { MomentBackground } from "../hooks/useStories";

export const BACKGROUNDS: Record<MomentBackground, string> = {
  midnight: "bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900",
  plum: "bg-gradient-to-br from-fuchsia-950 via-purple-800 to-indigo-950",
  sunset: "bg-gradient-to-br from-orange-500 via-rose-600 to-purple-900",
  ocean: "bg-gradient-to-br from-cyan-700 via-blue-800 to-slate-950",
  emerald: "bg-gradient-to-br from-emerald-600 via-teal-800 to-slate-950",
  gold: "bg-gradient-to-br from-amber-400 via-orange-600 to-stone-950",
};

export const BACKGROUND_OPTIONS: { value: MomentBackground; label: string }[] = [
  { value: "midnight", label: "Midnight" }, { value: "plum", label: "Plum" },
  { value: "sunset", label: "Sunset" }, { value: "ocean", label: "Ocean" },
  { value: "emerald", label: "Emerald" }, { value: "gold", label: "Gold" },
];

