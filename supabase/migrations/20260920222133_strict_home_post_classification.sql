-- Reconstructed from the production migration recorded as strict_home_post_classification.
-- This keeps repository migration history aligned with the live Supabase project.

alter table public.posts
  add column if not exists classification_status text,
  add column if not exists classification_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.posts'::regclass
      and conname='posts_classification_status_check'
  ) then
    alter table public.posts
      add constraint posts_classification_status_check
      check (classification_status is null or classification_status in ('accepted','flagged'));
  end if;
end $$;

create or replace function public.classify_home_post(p_content text, p_topic text)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  c text:=lower(coalesce(p_content,''));
  t text:=lower(coalesce(p_topic,''));
  suggested text:=null;
  aligned boolean:=true;
  reason text:=null;
begin
  if t not in ('insight','job','scholarship','competition','talent') then
    return jsonb_build_object('aligned',false,'suggested_topic',null,'reason','Choose the section that accurately describes this post.');
  end if;

  if c ~ '(scholarship|bursary|tuition|fully funded|partially funded|financial aid|study grant)' then suggested:='scholarship';
  elsif c ~ '(job vacancy|vacancy|hiring|we are hiring|job opening|employment opportunity|apply for the role|position available|recruiting)' then suggested:='job';
  elsif c ~ '(competition|contest|challenge|quiz competition|prize|entries open)' then suggested:='competition';
  elsif c ~ '(audition|talent show|showcase|casting call|performer|creative call)' then suggested:='talent';
  end if;

  if suggested is not null and suggested<>t then
    aligned:=false;
    reason:='This content appears to belong in '||initcap(suggested)||', not '||initcap(t)||'.';
  elsif t='insight' and length(trim(c))<35 then
    aligned:=false;
    reason:='Insight is for useful knowledge, education, motivation, practical advice or an uplifting story. Add enough context to make the post useful to readers.';
  elsif t in ('job','scholarship','competition','talent') and length(trim(c))<25 then
    aligned:=false;
    reason:=initcap(t)||' posts need enough real details for readers to understand the opportunity.';
  end if;

  return jsonb_build_object('aligned',aligned,'suggested_topic',suggested,'reason',reason);
end
$$;

create or replace function public.enforce_home_post_classification()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare verdict jsonb;
begin
  if new.category_id is null and new.shared_from_post_id is null then
    verdict:=public.classify_home_post(new.content,new.topic);
    if coalesce((verdict->>'aligned')::boolean,false)=false then
      new.classification_status:='flagged';
      new.classification_reason:=verdict->>'reason';
    else
      new.classification_status:='accepted';
      new.classification_reason:=null;
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists enforce_home_post_classification on public.posts;
create trigger enforce_home_post_classification
before insert or update of content, topic
on public.posts
for each row
execute function public.enforce_home_post_classification();
