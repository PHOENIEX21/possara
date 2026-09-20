alter table public.job_postings add column if not exists cover_letter_required boolean not null default false;

create or replace function public.normalize_literal_newlines()
returns trigger language plpgsql as $$
begin
  if tg_table_name='posts' then new.content:=replace(new.content,E'\\n',E'\n'); end if;
  if tg_table_name='comments' then new.content:=replace(new.content,E'\\n',E'\n'); end if;
  if tg_table_name='notifications' then new.title:=replace(new.title,E'\\n',' '); new.message:=replace(new.message,E'\\n',E'\n'); end if;
  if tg_table_name='opportunities' then new.title:=replace(new.title,E'\\n',' '); new.description:=replace(new.description,E'\\n',E'\n'); new.eligibility:=replace(new.eligibility,E'\\n',E'\n'); end if;
  if tg_table_name='job_postings' then new.title:=replace(new.title,E'\\n',' '); new.description:=replace(new.description,E'\\n',E'\n'); end if;
  if tg_table_name='screening_questions' then new.question_text:=replace(new.question_text,E'\\n',' '); end if;
  return new;
end $$;

drop trigger if exists normalize_literal_newlines_posts on public.posts;
create trigger normalize_literal_newlines_posts before insert or update on public.posts for each row execute function public.normalize_literal_newlines();
drop trigger if exists normalize_literal_newlines_comments on public.comments;
create trigger normalize_literal_newlines_comments before insert or update on public.comments for each row execute function public.normalize_literal_newlines();
drop trigger if exists normalize_literal_newlines_notifications on public.notifications;
create trigger normalize_literal_newlines_notifications before insert or update on public.notifications for each row execute function public.normalize_literal_newlines();
drop trigger if exists normalize_literal_newlines_opportunities on public.opportunities;
create trigger normalize_literal_newlines_opportunities before insert or update on public.opportunities for each row execute function public.normalize_literal_newlines();
drop trigger if exists normalize_literal_newlines_jobs on public.job_postings;
create trigger normalize_literal_newlines_jobs before insert or update on public.job_postings for each row execute function public.normalize_literal_newlines();
drop trigger if exists normalize_literal_newlines_screening on public.screening_questions;
create trigger normalize_literal_newlines_screening before insert or update on public.screening_questions for each row execute function public.normalize_literal_newlines();

update public.posts set content=replace(content,E'\\n',E'\n') where position(E'\\n' in content)>0;
update public.comments set content=replace(content,E'\\n',E'\n') where position(E'\\n' in content)>0;
update public.notifications set title=replace(title,E'\\n',' '),message=replace(message,E'\\n',E'\n') where position(E'\\n' in title)>0 or position(E'\\n' in coalesce(message,''))>0;
update public.opportunities set title=replace(title,E'\\n',' '),description=replace(description,E'\\n',E'\n'),eligibility=replace(eligibility,E'\\n',E'\n') where position(E'\\n' in title)>0 or position(E'\\n' in coalesce(description,''))>0 or position(E'\\n' in coalesce(eligibility,''))>0;
update public.job_postings set title=replace(title,E'\\n',' '),description=replace(description,E'\\n',E'\n') where position(E'\\n' in title)>0 or position(E'\\n' in description)>0;
update public.screening_questions set question_text=replace(question_text,E'\\n',' ') where position(E'\\n' in question_text)>0;
