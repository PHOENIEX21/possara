import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export function useFollowStatus(targetUserId: string | undefined) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["follow-status", userId, targetUserId],
    enabled: !!userId && !!targetUserId && userId !== targetUserId,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", userId as string)
        .eq("following_id", targetUserId as string)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

export function useToggleFollow(targetUserId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const key = ["follow-status", userId, targetUserId];

  return useMutation({
    mutationFn: async (currentlyFollowing: boolean) => {
      if (!userId) throw new Error("Sign in to follow members.");
      if (!targetUserId || userId === targetUserId) return;

      if (currentlyFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", userId)
          .eq("following_id", targetUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("follows")
          .upsert({ follower_id: userId, following_id: targetUserId }, { onConflict: "follower_id,following_id" });
        if (error) throw error;
      }
    },
    onMutate: async (currentlyFollowing) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<boolean>(key);
      queryClient.setQueryData<boolean>(key, !currentlyFollowing);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ["follow-counts"] });
      queryClient.invalidateQueries({ queryKey: ["member-directory"] });
      queryClient.invalidateQueries({ queryKey: ["friend-suggestions"] });
    },
  });
}

export function useFollowCounts(userId: string | undefined) {
  return useQuery({
    queryKey: ["follow-counts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId as string),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId as string),
      ]);
      return { followers: followers ?? 0, following: following ?? 0 };
    },
  });
}
