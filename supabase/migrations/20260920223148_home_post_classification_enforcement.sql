alter table public.posts
  add column if not exists classification_status text,
  add column if not exists classification_reason text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.posts'::regclass
      and conname = 'posts_classification_status_check'
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
  c text := lower(regexp_replace(trim(coalesce(p_content, '')), '[[:space:]]+', ' ', 'g'));
  t text := lower(trim(coalesce(p_topic, '')));
  job_score integer := 0;
  scholarship_score integer := 0;
  competition_score integer := 0;
  talent_score integer := 0;
  insight_score integer := 0;
  suggested text := null;
  random_status boolean := false;
  gossip_status boolean := false;
begin
  if t not in ('insight','job','scholarship','competition','talent') then
    return jsonb_build_object('aligned', false, 'suggested_topic', null, 'reason', 'Choose one clear Home section: Insight, Job, Scholarship, Competition or Talent.');
  end if;

  if length(c) < 12 then
    return jsonb_build_object('aligned', false, 'suggested_topic', null, 'reason', 'Add enough context for readers to understand what you are sharing.');
  end if;

  job_score :=
    (c ~ '(job|vacanc|hiring|recruit|employment|position available|role available|opening|career opportunit|internship|full[- ]?time|part[- ]?time)')::int +
    (c ~ '(apply|application|cv|resume|salary|employer|company|work style|remote|onsite|on-site|hybrid|qualification|requirement)')::int +
    (c ~ '(needed|wanted|seeking candidates|join our team)')::int;

  scholarship_score :=
    (c ~ '(scholarship|bursary|financial aid|study grant|education grant|tuition support|fully funded|partially funded)')::int +
    (c ~ '(eligib|study level|undergraduate|postgraduate|masters|phd|tuition|stipend|funding)')::int +
    (c ~ '(scholarship application|application deadline|award amount)')::int;

  competition_score :=
    (c ~ '(competition|contest|challenge|quiz competition|hackathon|pitch contest|essay contest|entries open)')::int +
    (c ~ '(prize|winner|entry deadline|submit your entry|who can enter|registration closes)')::int;

  talent_score :=
    (c ~ '(audition|casting call|talent show|talent call|showcase|performer|acting role|model call|dance audition|music audition)')::int +
    (c ~ '(creative call|artists wanted|singers wanted|actors wanted|dancers wanted|submit portfolio|demo reel)')::int;

  insight_score :=
    (c ~ '(motivat|encourag|lesson|what i learned|i learned|advice|practical tip|useful tip|guide|reflection|mindset|growth|discipline|consistency|purpose)')::int +
    (c ~ '(knowledge|educat|explain|how to|steps to|remember that|experience taught me|story taught me|mistake i made|what helped me)')::int +
    (c ~ '(hope|keep going|do not give up|don''t give up|believe|improve|wisdom|principle|habit|strategy)')::int;

  random_status := c ~ '(i have not eaten|i haven''t eaten|i havent eaten|i am hungry|i''m hungry|im hungry|just woke up|i am bored|i''m bored|im bored|watching (a )?(movie|tv)|going out|at the mall|good morning everyone|good night everyone|what''s up everyone|whats up everyone|anyone online|feeling sleepy|i am tired|i''m tired|im tired)';
  gossip_status := c ~ '(celebrity gossip|gossip update|celebrity drama|dating rumor|dating rumour|breakup rumor|breakup rumour|scandal|viral celebrity|trending celebrity)';

  if t = 'insight' then
    if job_score > 0 and insight_score = 0 then suggested := 'job';
    elsif scholarship_score > 0 and insight_score = 0 then suggested := 'scholarship';
    elsif competition_score > 0 and insight_score = 0 then suggested := 'competition';
    elsif talent_score > 0 and insight_score = 0 then suggested := 'talent';
    end if;

    if suggested is not null then
      return jsonb_build_object('aligned', false, 'suggested_topic', suggested, 'reason', 'This appears to be a ' || initcap(suggested) || ' post, not an Insight. Change the section to ' || initcap(suggested) || ' to continue.');
    end if;
    if random_status and insight_score = 0 then
      return jsonb_build_object('aligned', false, 'suggested_topic', null, 'reason', 'Insight is for motivation, encouragement, useful knowledge, practical advice, lessons or constructive experiences—not an ordinary status update. Rewrite it with a useful takeaway to continue.');
    end if;
    if gossip_status and insight_score = 0 then
      return jsonb_build_object('aligned', false, 'suggested_topic', null, 'reason', 'Celebrity gossip or reposts without a useful lesson do not belong in Insight. Add meaningful context or a constructive takeaway.');
    end if;
    if length(c) < 35 then
      return jsonb_build_object('aligned', false, 'suggested_topic', null, 'reason', 'Insight needs enough context to be useful: share the lesson, advice, knowledge, encouragement or constructive experience.');
    end if;
    return jsonb_build_object('aligned', true, 'suggested_topic', null, 'reason', null);
  end if;

  if t = 'job' then
    if scholarship_score > 0 and job_score = 0 then suggested := 'scholarship';
    elsif competition_score > 0 and job_score = 0 then suggested := 'competition';
    elsif talent_score > 0 and job_score = 0 then suggested := 'talent';
    end if;
    if suggested is not null then return jsonb_build_object('aligned', false, 'suggested_topic', suggested, 'reason', 'This appears to be a ' || initcap(suggested) || ', not a Job. Change the section to ' || initcap(suggested) || ' to continue.'); end if;
    if job_score = 0 then return jsonb_build_object('aligned', false, 'suggested_topic', null, 'reason', 'Job is for a genuine vacancy or employment opportunity. Include a role or vacancy plus useful details such as employer/source, location, requirements or how to apply.'); end if;
  elsif t = 'scholarship' then
    if job_score > 0 and scholarship_score = 0 then suggested := 'job';
    elsif competition_score > 0 and scholarship_score = 0 then suggested := 'competition';
    elsif talent_score > 0 and scholarship_score = 0 then suggested := 'talent';
    end if;
    if suggested is not null then return jsonb_build_object('aligned', false, 'suggested_topic', suggested, 'reason', 'This appears to be a ' || initcap(suggested) || ', not a Scholarship. Change the section to ' || initcap(suggested) || ' to continue.'); end if;
    if scholarship_score = 0 then return jsonb_build_object('aligned', false, 'suggested_topic', null, 'reason', 'Scholarship is for real education funding or bursary information. Include the scholarship/funding purpose and useful eligibility, study level, deadline or application details.'); end if;
  elsif t = 'competition' then
    if job_score > 0 and competition_score = 0 then suggested := 'job';
    elsif scholarship_score > 0 and competition_score = 0 then suggested := 'scholarship';
    elsif talent_score > 0 and competition_score = 0 then suggested := 'talent';
    end if;
    if suggested is not null then return jsonb_build_object('aligned', false, 'suggested_topic', suggested, 'reason', 'This appears to be a ' || initcap(suggested) || ', not a Competition. Change the section to ' || initcap(suggested) || ' to continue.'); end if;
    if competition_score = 0 then return jsonb_build_object('aligned', false, 'suggested_topic', null, 'reason', 'Competition is for a real contest, challenge or competition. Include what people can enter, the purpose/prize and useful entry or deadline details.'); end if;
  elsif t = 'talent' then
    if job_score > 0 and talent_score = 0 then suggested := 'job';
    elsif scholarship_score > 0 and talent_score = 0 then suggested := 'scholarship';
    elsif competition_score > 0 and talent_score = 0 then suggested := 'competition';
    end if;
    if suggested is not null then return jsonb_build_object('aligned', false, 'suggested_topic', suggested, 'reason', 'This appears to be a ' || initcap(suggested) || ', not a Talent opportunity. Change the section to ' || initcap(suggested) || ' to continue.'); end if;
    if talent_score = 0 then return jsonb_build_object('aligned', false, 'suggested_topic', null, 'reason', 'Talent is for auditions, casting, showcases or genuine calls for people to present or develop a talent. Add enough opportunity details to continue.'); end if;
  end if;

  if length(c) < 25 then
    return jsonb_build_object('aligned', false, 'suggested_topic', null, 'reason', initcap(t) || ' posts need enough real details for readers to understand the opportunity.');
  end if;

  return jsonb_build_object('aligned', true, 'suggested_topic', null, 'reason', null);
end
$$;

revoke execute on function public.classify_home_post(text, text) from public, anon;
grant execute on function public.classify_home_post(text, text) to authenticated, service_role;

create or replace function public.enforce_home_post_classification()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  verdict jsonb;
  reason text;
begin
  if new.category_id is null
     and new.shared_from_post_id is null
     and lower(coalesce(new.topic, '')) in ('insight','job','scholarship','competition','talent') then
    verdict := public.classify_home_post(new.content, new.topic);

    if coalesce((verdict->>'aligned')::boolean, false) = false then
      reason := coalesce(verdict->>'reason', 'This post does not match the selected Home section.');
      new.classification_status := 'flagged';
      new.classification_reason := reason;
      raise exception using errcode = '22023', message = reason;
    end if;

    new.classification_status := 'accepted';
    new.classification_reason := null;
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

create index if not exists idx_posts_home_topic_classification_created
  on public.posts (topic, classification_status, created_at desc)
  where category_id is null
    and deleted_at is null
    and status = 'published';
