-- Organization Job-category posts may announce upcoming hiring.
-- Formal vacancies and applications remain in public.job_postings.

create or replace function public.enforce_home_post_classification()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  verdict jsonb;
  reason text;
  normalized text;
begin
  if new.category_id is null
     and new.shared_from_post_id is null
     and lower(coalesce(new.topic, '')) in ('insight','job','scholarship','competition','talent') then
    normalized := lower(regexp_replace(trim(coalesce(new.content, '')), '[[:space:]]+', ' ', 'g'));

    if new.organization_id is not null
       and lower(new.topic) = 'job'
       and length(normalized) >= 20
       and normalized ~ '(job|hiring|hire|recruit|career|role|vacanc|employment|opportunit|join our team|opening|coming soon)' then
      new.classification_status := 'accepted';
      new.classification_reason := null;
      return new;
    end if;

    verdict := public.classify_home_post(new.content, new.topic);

    if coalesce((verdict->>'aligned')::boolean, false) = false then
      reason := coalesce(verdict->>'reason', 'This post does not match the selected Home section.');
      new.classification_status := 'flagged';
      new.classification_reason := reason;
      raise exception using
        errcode = '22023',
        message = reason;
    end if;

    new.classification_status := 'accepted';
    new.classification_reason := null;
  end if;

  return new;
end
$$;
