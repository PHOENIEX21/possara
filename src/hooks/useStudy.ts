import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/auth";

export type StudyProfile = {
  user_id: string;
  education_stage: string;
  class_level: string | null;
  exam_targets: string[];
  subjects: string[];
  study_discoverable: boolean;
};

export type StudyTopic = {
  id: string;
  class_level: string;
  subject: string;
  title: string;
  slug: string;
  summary: string;
  reading_body: string;
  exam_targets: string[];
};

export type StudyQuestion = {
  id: string;
  topic_id: string;
  stem: string;
  options: string[];
  correct_option: number;
  explanation: string;
  difficulty: string;
  exam_targets: string[];
  source_label: string;
};

export type StudyThread = {
  id: string;
  author_id: string;
  class_level: string;
  subject: string;
  topic_id: string | null;
  title: string;
  body: string;
  accepted_answer_id: string | null;
  created_at: string;
  profiles: { full_name: string | null; username: string | null; avatar_url: string | null } | null;
};

export type StudyAnswer = {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles: { full_name: string | null; username: string | null; avatar_url: string | null } | null;
};

export function useStudyProfile() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["study-profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<StudyProfile | null> => {
      const { data, error } = await supabase.from("study_profiles").select("*").eq("user_id", userId as string).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveStudyProfile() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<StudyProfile, "user_id">) => {
      if (!userId) throw new Error("Sign in to set up Study.");
      const { error } = await supabase.from("study_profiles").upsert({ user_id: userId, ...input, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study-profile"] }),
  });
}

export function useStudyTopics(classLevel?: string | null, subjects?: string[]) {
  return useQuery({
    queryKey: ["study-topics", classLevel, subjects],
    queryFn: async (): Promise<StudyTopic[]> => {
      let query = supabase.from("study_topics").select("*").eq("is_published", true).order("subject").order("title");
      if (classLevel) query = query.eq("class_level", classLevel);
      if (subjects?.length) query = query.in("subject", subjects);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useStudyTopic(id?: string) {
  return useQuery({
    queryKey: ["study-topic", id],
    enabled: !!id,
    queryFn: async (): Promise<StudyTopic> => {
      const { data, error } = await supabase.from("study_topics").select("*").eq("id", id as string).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useStudyQuestions(topicId?: string) {
  return useQuery({
    queryKey: ["study-questions", topicId],
    enabled: !!topicId,
    queryFn: async (): Promise<StudyQuestion[]> => {
      const { data, error } = await supabase.from("study_questions").select("*").eq("topic_id", topicId as string).order("created_at");
      if (error) throw error;
      return (data ?? []).map((q) => ({ ...q, options: Array.isArray(q.options) ? q.options : [] })) as StudyQuestion[];
    },
  });
}

export function useRecordStudyAttempt() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId, selectedOption, isCorrect }: { questionId: string; selectedOption: number; isCorrect: boolean }) => {
      if (!userId) return;
      const { error } = await supabase.from("study_attempts").insert({ user_id: userId, question_id: questionId, selected_option: selectedOption, is_correct: isCorrect });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study-progress"] }),
  });
}

export function useStudyProgress() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["study-progress", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("study_attempts").select("is_correct, question_id, study_questions(topic_id, study_topics(title, subject))").eq("user_id", userId as string).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useStudyThreads(classLevel?: string | null) {
  return useQuery({
    queryKey: ["study-threads", classLevel],
    queryFn: async (): Promise<StudyThread[]> => {
      let query = supabase.from("study_threads").select("*, profiles(full_name, username, avatar_url)").order("created_at", { ascending: false }).limit(50);
      if (classLevel) query = query.eq("class_level", classLevel);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as StudyThread[];
    },
  });
}

export function useCreateStudyThread() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { class_level: string; subject: string; topic_id?: string | null; title: string; body: string }) => {
      if (!userId) throw new Error("Sign in to ask a study question.");
      const { error } = await supabase.from("study_threads").insert({ author_id: userId, ...input });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study-threads"] }),
  });
}

export function useStudyThread(id?: string) {
  return useQuery({
    queryKey: ["study-thread", id],
    enabled: !!id,
    queryFn: async (): Promise<StudyThread> => {
      const { data, error } = await supabase.from("study_threads").select("*, profiles(full_name, username, avatar_url)").eq("id", id as string).single();
      if (error) throw error;
      return data as StudyThread;
    },
  });
}

export function useStudyAnswers(threadId?: string) {
  return useQuery({
    queryKey: ["study-answers", threadId],
    enabled: !!threadId,
    queryFn: async (): Promise<StudyAnswer[]> => {
      const { data, error } = await supabase.from("study_answers").select("*, profiles(full_name, username, avatar_url)").eq("thread_id", threadId as string).order("created_at");
      if (error) throw error;
      return (data ?? []) as StudyAnswer[];
    },
  });
}

export function useCreateStudyAnswer(threadId: string) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!userId) throw new Error("Sign in to answer.");
      const { error } = await supabase.from("study_answers").insert({ thread_id: threadId, author_id: userId, body });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study-answers", threadId] }),
  });
}

export function useMarkStudySolved(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (answerId: string) => {
      const { error } = await supabase.from("study_threads").update({ accepted_answer_id: answerId, updated_at: new Date().toISOString() }).eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["study-thread", threadId] }); qc.invalidateQueries({ queryKey: ["study-threads"] }); },
  });
}
