import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";
import type { Profile } from "../types/database";

export type FriendSuggestion = Pick<
  Profile,
  "id" | "username" | "full_name" | "avatar_url" | "headline" | "profession" | "skills" | "goal_categories" | "location" | "country" | "created_at"
> & {
  reason: string;
};

function normalized(values: string[] | null | undefined) {
  return new Set((values ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean));
}

function tokens(value: string | null | undefined) {
  return new Set((value ?? "").toLowerCase().split(/[^a-z0-9+#.]+/).filter((token) => token.length > 2));
}

export function useFriendSuggestions() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ["friend-suggestions", userId],
    enabled: !!userId,
    staleTime: 45_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<FriendSuggestion[]> => {
      if (!userId) return [];

      const [{ data: me, error: meError }, { data: following, error: followingError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,profession,headline,skills,goal_categories,location,country")
          .eq("id", userId)
          .single(),
        supabase.from("follows").select("following_id").eq("follower_id", userId),
      ]);
      if (meError) throw meError;
      if (followingError) throw followingError;

      const excluded = new Set<string>([userId, ...(following ?? []).map((row) => row.following_id)]);
      const { data: people, error } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url,headline,profession,skills,goal_categories,location,country,created_at")
        .not("username", "is", null)
        .order("created_at", { ascending: false })
        .limit(120);
      if (error) throw error;

      const mySkills = normalized(me.skills);
      const myGoals = normalized(me.goal_categories);
      const myTokens = new Set([...tokens(me.profession), ...tokens(me.headline)]);
      const myLocation = (me.location ?? "").trim().toLowerCase();
      const myCountry = (me.country ?? "").trim().toLowerCase();

      return (people ?? [])
        .filter((person) => !excluded.has(person.id))
        .map((person) => {
          const personSkills = normalized(person.skills);
          const personGoals = normalized(person.goal_categories);
          const personTokens = new Set([...tokens(person.profession), ...tokens(person.headline)]);
          const sharedSkills = [...personSkills].filter((skill) => mySkills.has(skill));
          const sharedGoals = [...personGoals].filter((goal) => myGoals.has(goal));
          const sharedTokens = [...personTokens].filter((token) => myTokens.has(token));
          const sameLocation = !!myLocation && (person.location ?? "").trim().toLowerCase() === myLocation;
          const sameCountry = !!myCountry && (person.country ?? "").trim().toLowerCase() === myCountry;

          let score = sharedSkills.length * 5 + sharedGoals.length * 3 + sharedTokens.length * 2;
          if (sameLocation) score += 3;
          else if (sameCountry) score += 1;

          const reason = sharedSkills.length
            ? `Shared skill: ${sharedSkills[0]}`
            : sharedGoals.length
              ? "Similar opportunity interests"
              : sharedTokens.length
                ? "Similar field"
                : sameLocation
                  ? "Near your location"
                  : sameCountry
                    ? "In your country"
                    : "New on POSSARA";

          return { ...person, score, reason };
        })
        .sort((a, b) => b.score - a.score || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 18)
        .map((person) => person as FriendSuggestion);
    },
  });
}
