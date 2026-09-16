import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { getCategoryIcon } from "../lib/categoryIcon";
import type { OpportunityCategory } from "../types/database";

export function useOpportunityCategories() {
  return useQuery({
    queryKey: ["opportunity_categories"],
    queryFn: async (): Promise<OpportunityCategory[]> => {
      const { data, error } = await supabase.from("opportunity_categories").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

interface CategoryChipsProps {
  activeSlug?: string;
  onSelect: (slug: string | undefined) => void;
  excludeSlugs?: string[];
}

export function CategoryChips({ activeSlug, onSelect, excludeSlugs }: CategoryChipsProps) {
  const { data: allCategories } = useOpportunityCategories();
  const categories = excludeSlugs ? allCategories?.filter((c) => !excludeSlugs.includes(c.slug)) : allCategories;

  return (
    <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      <button onClick={() => onSelect(undefined)} className={"whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition " + (!activeSlug ? "border-ink bg-ink text-paper" : "border-ink-faint/30 text-ink-light hover:border-ink")}>All</button>
      {categories?.map((cat) => {
        const Icon = getCategoryIcon(cat.icon);
        const isActive = activeSlug === cat.slug;
        return <button key={cat.id} onClick={() => onSelect(cat.slug)} style={isActive && cat.color ? { borderColor: cat.color, backgroundColor: cat.color, color: "white" } : undefined} className={"inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition " + (isActive ? "" : "border-ink-faint/30 text-ink-light hover:border-ink")}><Icon size={14} strokeWidth={2} />{cat.name}</button>;
      })}
    </div>
  );
}
