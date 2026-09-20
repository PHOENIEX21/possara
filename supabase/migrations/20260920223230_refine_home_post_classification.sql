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
  job_strong boolean := false;
  scholarship_strong boolean := false;
  competition_strong boolean := false;
  talent_strong boolean := false;
  insight_signal boolean := false;
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

  job_strong := c ~ '(job|vacanc|hiring|we are hiring|recruit|employment|position( available)?|role( available)?|job opening|career opportunit|internship|join our team|staff needed|workers? needed)';
  scholarship_strong := c ~ '(scholarship|bursary|financial aid|study grant|education grant|tuition support|fully funded|partially funded|student funding)';
  competition_strong := c ~ '(competition|contest|challenge|quiz competition|hackathon|pitch contest|essay contest|entries open|submit your entry)';
  talent_strong := c ~ '(audition|casting call|talent show|talent call|showcase|performer call|model call|dance audition|music audition|artists wanted|singers wanted|actors wanted|dancers wanted|demo reel)';
  insight_signal := c ~ '(motivat|encourag|lesson|what i learned|i learned|advice|practical tip|useful tip|guide|reflection|mindset|growth|discipline|consistency|purpose|knowledge|educat|explain|how to|steps to|remember that|experience taught me|story taught me|mistake i made|what helped me|hope|keep going|do not give up|don''t give up|believe|improve|wisdom|principle|habit|strategy|takeaway)';

  random_status := c ~ '(i have not eaten|i haven''t eaten|i havent eaten|i am hungry|i''m hungry|im hungry|just woke up|i am bored|i''m bored|im bored|watching (a )?(movie|tv)|going out|at the mall|good morning everyone|good night everyone|what''s up everyone|whats up everyone|anyone online|feeling sleepy|i am tired|i''m tired|im tired)';
  gossip_status := c ~ '(celebrity gossip|gossip update|celebrity drama|dating rumor|dating rumour|breakup rumor|breakup rumour|scandal|viral celebrity|trending celebrity)';

  if t = 'insight' then
    if job_strong and not insight_signal then suggested := 'job';
    elsif scholarship_strong and not insight_signal then suggested := 'scholarship';
    elsif competition_strong and not insight_signal then suggested := 'competition';
    elsif talent_strong and not insight_signal then suggested := 'talent';
    end if;

    if suggested is not null then
      return jsonb_build_object('aligned', false, 'suggested_topic', suggested, 'reason', 'This appears to be a ' || initcap(suggested) || ' post, not an Insight. Change the section to ' || initcap(suggested) || ' to continue.');
    end if;
    if random_status and not insight_signal then
      return jsonb_build_object('aligned', false, 'suggested_topic', null, 'reason', 'Insight is for motivation, encouragement, useful knowledge, practical advice, lessons or constructive experiences—not an ordinary status update. Rewrite it with a useful takeaway to continue.');
    end if;
    if gossip_status and not insight_signal then
      return jsonb_build_object('aligned', false, 'suggested_topic', null, 'reason', 'Celebrity gossip or reposts without a useful lesson do not belong in Insight. Add meaningful context or a constructive takeaway.');
    end if;
    if length(c) < 35 then
      return jsonb_build_object('aligned', false, 'suggested_topic', null, 'reason', 'Insight needs enough context to be useful: share the lesson, advice, knowledge, encouragement or constructive experience.');
    end if;
    return jsonb_build_object('aligned', true, 'suggested_topic', null, 'reason', null);
  end if;

  if t = 'job' then
    if scholarship_strong and not job_strong then suggested := 'scholarship';
    elsif competition_strong and not job_strong then suggested := 'competition';
    elsif talent_strong and not job_strong then suggested := 'talent';
    end if;
    if suggested is not null then return jsonb_build_object('aligned', false, 'suggested_topic', suggested, 'reason', 'This appears to be a ' || initcap(suggested) || ', not a Job. Change the section to ' || initcap(suggested) || ' to continue.'); end if;
    if not job_strong then return jsonb_build_object('aligned', false, 'suggested_topic', null, 'reason', 'Job is for a genuine vacancy or employment opportunity. Include a clear role, vacancy, hiring or recruitment detail plus useful employer/source, location, requirements or application information.'); end if;
  elsif t = 'scholarship' then
    if job_strong and not scholarship_strong then suggested := 'job';
    elsif competition_strong and not scholarship_strong then suggested := 'competition';
    elsif talent_strong and not scholarship_strong then suggested := 'talent';
    end if;
    if suggested is not null then return jsonb_build_object('aligned', false, 'suggested_topic', suggested, 'reason', 'This appears to be a ' || initcap(suggested) || ', not a Scholarship. Change the section to ' || initcap(suggested) || ' to continue.'); end if;
    if not scholarship_strong then return jsonb_build_object('aligned', false, 'suggested_topic', null, 'reason', 'Scholarship is for real education funding or bursary information. Clearly identify the scholarship, bursary, grant or funding and add useful eligibility, study level, deadline or application details.'); end if;
  elsif t = 'competition' then
    if job_strong and not competition_strong then suggested := 'job';
    elsif scholarship_strong and not competition_strong then suggested := 'scholarship';
    elsif talent_strong and not competition_strong then suggested := 'talent';
    end if;
    if suggested is not null then return jsonb_build_object('aligned', false, 'suggested_topic', suggested, 'reason', 'This appears to be a ' || initcap(suggested) || ', not a Competition. Change the section to ' || initcap(suggested) || ' to continue.'); end if;
    if not competition_strong then return jsonb_build_object('aligned', false, 'suggested_topic', null, 'reason', 'Competition is for a real contest, challenge or competition. Clearly identify the competition and add useful entry, purpose, prize or deadline details.'); end if;
  elsif t = 'talent' then
    if job_strong and not talent_strong then suggested := 'job';
    elsif scholarship_strong and not talent_strong then suggested := 'scholarship';
    elsif competition_strong and not talent_strong then suggested := 'competition';
    end if;
    if suggested is not null then return jsonb_build_object('aligned', false, 'suggested_topic', suggested, 'reason', 'This appears to be a ' || initcap(suggested) || ', not a Talent opportunity. Change the section to ' || initcap(suggested) || ' to continue.'); end if;
    if not talent_strong then return jsonb_build_object('aligned', false, 'suggested_topic', null, 'reason', 'Talent is for auditions, casting, showcases or genuine calls for people to present or develop a talent. Clearly identify the audition, showcase, casting or talent call and add useful details.'); end if;
  end if;

  if length(c) < 25 then
    return jsonb_build_object('aligned', false, 'suggested_topic', null, 'reason', initcap(t) || ' posts need enough real details for readers to understand the opportunity.');
  end if;

  return jsonb_build_object('aligned', true, 'suggested_topic', null, 'reason', null);
end
$$;

revoke execute on function public.classify_home_post(text, text) from public, anon;
grant execute on function public.classify_home_post(text, text) to authenticated, service_role;
