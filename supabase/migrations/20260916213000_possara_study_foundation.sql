-- POSSARA Study foundation. Applied to the live Supabase project on 2026-09-16.
create table if not exists public.study_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  education_stage text not null default 'secondary',
  class_level text,
  exam_targets text[] not null default '{}',
  subjects text[] not null default '{}',
  study_discoverable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_topics (
  id uuid primary key default gen_random_uuid(),
  class_level text not null,
  subject text not null,
  title text not null,
  slug text not null,
  summary text not null,
  reading_body text not null,
  exam_targets text[] not null default '{}',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  unique (class_level, subject, slug)
);

create table if not exists public.study_questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.study_topics(id) on delete cascade,
  stem text not null,
  options jsonb not null,
  correct_option integer not null,
  explanation text not null,
  difficulty text not null default 'standard',
  exam_targets text[] not null default '{}',
  source_label text not null default 'POSSARA Original',
  created_at timestamptz not null default now(),
  constraint study_questions_options_array check (jsonb_typeof(options)='array' and jsonb_array_length(options)>=2),
  constraint study_questions_correct_option check (correct_option>=0 and correct_option<jsonb_array_length(options)),
  unique(topic_id, stem)
);

create table if not exists public.study_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.study_questions(id) on delete cascade,
  selected_option integer not null,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists study_attempts_user_created_idx on public.study_attempts(user_id, created_at desc);
create index if not exists study_topics_lookup_idx on public.study_topics(class_level, subject, is_published);

create table if not exists public.study_threads (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  class_level text not null,
  subject text not null,
  topic_id uuid references public.study_topics(id) on delete set null,
  title text not null,
  body text not null,
  accepted_answer_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_answers (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.study_threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.study_threads drop constraint if exists study_threads_accepted_answer_fkey;
alter table public.study_threads add constraint study_threads_accepted_answer_fkey foreign key (accepted_answer_id) references public.study_answers(id) on delete set null;

alter table public.study_profiles enable row level security;
alter table public.study_topics enable row level security;
alter table public.study_questions enable row level security;
alter table public.study_attempts enable row level security;
alter table public.study_threads enable row level security;
alter table public.study_answers enable row level security;

create policy "Study profiles visible when discoverable" on public.study_profiles for select using (study_discoverable or auth.uid()=user_id);
create policy "Users manage own study profile" on public.study_profiles for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "Published study topics are readable" on public.study_topics for select using (is_published=true);
create policy "Published study questions are readable" on public.study_questions for select using (exists(select 1 from public.study_topics t where t.id=topic_id and t.is_published=true));
create policy "Users read own study attempts" on public.study_attempts for select using (auth.uid()=user_id);
create policy "Users create own study attempts" on public.study_attempts for insert with check (auth.uid()=user_id);
create policy "Study threads are readable" on public.study_threads for select using (true);
create policy "Members create study threads" on public.study_threads for insert with check (auth.uid()=author_id);
create policy "Authors update own study threads" on public.study_threads for update using (auth.uid()=author_id) with check (auth.uid()=author_id);
create policy "Authors delete own study threads" on public.study_threads for delete using (auth.uid()=author_id);
create policy "Study answers are readable" on public.study_answers for select using (true);
create policy "Members create study answers" on public.study_answers for insert with check (auth.uid()=author_id);
create policy "Authors update own study answers" on public.study_answers for update using (auth.uid()=author_id) with check (auth.uid()=author_id);
create policy "Authors delete own study answers" on public.study_answers for delete using (auth.uid()=author_id);

-- Pilot authored content only. This is deliberately not represented as full curriculum coverage.
insert into public.study_topics(class_level,subject,title,slug,summary,reading_body,exam_targets) values
('JSS3','Mathematics','Linear Equations','linear-equations','Learn how to translate statements into equations and solve one-variable linear equations step by step.','A linear equation in one variable is an equation where the highest power of the unknown is 1. The goal is to isolate the unknown while keeping both sides balanced. Whatever operation you perform on one side must also be performed on the other side. Start by simplifying each side, collect like terms, move variable terms to one side and constants to the other, then divide by the coefficient of the variable. Always check your answer by substituting it into the original equation.','{BECE}'),
('SS3','Mathematics','Quadratic Equations','quadratic-equations','Review the standard form, factorisation and checking roots of quadratic equations.','A quadratic equation can be written in the standard form ax² + bx + c = 0, where a is not zero. One common method is factorisation. First move every term to one side so that the other side is zero. Then find factors whose product and sum fit the quadratic expression. Set each factor equal to zero to obtain the roots. Finally substitute each root into the original equation to confirm it works.','{WAEC,NECO}'),
('SS3','English Language','Subject–Verb Concord','subject-verb-concord','Practise agreement between subjects and verbs in common examination sentences.','Concord means agreement. In subject–verb concord, a singular subject normally takes a singular verb, while a plural subject takes a plural verb. Ignore words that merely come between the subject and the verb. With expressions such as “each”, “every”, “either” and “neither”, the verb is normally singular when the expression is the grammatical subject. Identify the true subject before choosing the verb.','{WAEC,NECO,JAMB}')
on conflict(class_level,subject,slug) do nothing;
