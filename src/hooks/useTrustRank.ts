import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export type TrustRankKey = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "official" | "restricted";

export type MemberTrustRank = {
  userId: string;
  rankKey: TrustRankKey;
  label: string;
  score: number;
  official: boolean;
  profileScore: number;
  ageScore: number;
  participationScore: number;
  contributionScore: number;
  communityScore: number;
  safetyScore: number;
};

type TrustRankRow = {
  user_id: string;
  rank_key: TrustRankKey;
  label: string;
  score: number;
  official: boolean;
  profile_score: number;
  age_score: number;
  participation_score: number;
  contribution_score: number;
  community_score: number;
  safety_score: number;
};

function mapRow(row: TrustRankRow): MemberTrustRank {
  return {
    userId: row.user_id,
    rankKey: row.rank_key,
    label: row.label,
    score: row.score,
    official: row.official,
    profileScore: row.profile_score,
    ageScore: row.age_score,
    participationScore: row.participation_score,
    contributionScore: row.contribution_score,
    communityScore: row.community_score,
    safetyScore: row.safety_score,
  };
}

export async function fetchMemberTrustRanks(userIds: string[]): Promise<MemberTrustRank[]> {
  const unique = [...new Set(userIds.filter(Boolean))].slice(0, 100);
  if (!unique.length) return [];
  const { data, error } = await supabase.rpc("get_member_trust_ranks", { p_user_ids: unique });
  if (error) throw error;
  return ((data ?? []) as TrustRankRow[]).map(mapRow);
}

export function useMemberTrustRank(targetUserId: string | null | undefined) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["member-trust-rank", targetUserId, userId],
    enabled: !!userId && !!targetUserId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<MemberTrustRank | null> => {
      if (!targetUserId) return null;
      const rows = await fetchMemberTrustRanks([targetUserId]);
      return rows[0] ?? null;
    },
  });
}
