import { GraduationCap, HandCoins, Briefcase, Building2, Award, BookOpen, TrendingUp, Users, HeartHandshake, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  "graduation-cap": GraduationCap,
  "hand-coins": HandCoins,
  briefcase: Briefcase,
  "building-2": Building2,
  award: Award,
  "book-open": BookOpen,
  "trending-up": TrendingUp,
  users: Users,
  "heart-handshake": HeartHandshake,
};
export function getCategoryIcon(iconName: string | null): LucideIcon { if (!iconName) return Tag; return ICON_MAP[iconName] ?? Tag; }
