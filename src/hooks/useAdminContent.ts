import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export function useAdminRecentPosts() {
  return useQuery({
    queryKey: ["admin", "recent-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id,author_id,content,topic,status,created_at,profiles(full_name,username)")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminSetPostStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "published" | "removed" }) => {
      const { data, error } = await supabase.from("posts").update({ status }).eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Post moderation did not update anything.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "recent-posts"] });
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}

export function useAdminActiveMoments() {
  return useQuery({
    queryKey: ["admin", "active-moments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("id,author_id,caption,storage_path,music_path,created_at,expires_at,profiles(full_name,username)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminDeleteMoment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, storagePath, musicPath }: { id: string; storagePath?: string | null; musicPath?: string | null }) => {
      const { error } = await supabase.from("stories").delete().eq("id", id);
      if (error) throw error;
      const cleanup = [];
      if (storagePath) cleanup.push(supabase.storage.from("moments").remove([storagePath]));
      if (musicPath) cleanup.push(supabase.storage.from("moment-music").remove([musicPath]));
      const results = await Promise.all(cleanup);
      const cleanupError = results.find((result)=>result.error)?.error;
      if (cleanupError) throw cleanupError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "active-moments"] });
      qc.invalidateQueries({ queryKey: ["active-stories"] });
    },
  });
}

export function useAdminStudyOverview() {
  return useQuery({
    queryKey: ["admin", "study-overview"],
    queryFn: async () => {
      const [topics, questions, learners, threads, attempts] = await Promise.all([
        supabase.from("study_topics").select("id", { count: "exact", head: true }),
        supabase.from("study_questions").select("id", { count: "exact", head: true }),
        supabase.from("study_profiles").select("user_id", { count: "exact", head: true }),
        supabase.from("study_threads").select("id", { count: "exact", head: true }),
        supabase.from("study_attempts").select("id", { count: "exact", head: true }),
      ]);
      const firstError = topics.error || questions.error || learners.error || threads.error || attempts.error;
      if (firstError) throw firstError;
      return {
        topics: topics.count ?? 0,
        questions: questions.count ?? 0,
        learners: learners.count ?? 0,
        discussions: threads.count ?? 0,
        attempts: attempts.count ?? 0,
      };
    },
  });
}
