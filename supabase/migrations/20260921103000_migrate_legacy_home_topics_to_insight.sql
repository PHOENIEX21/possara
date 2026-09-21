-- Bring legacy purposeful Home posts into the current five-topic Home model.
-- Places remain excluded from Home and stay in the dedicated Places experience.

update public.posts
set topic='insight',
    classification_status='accepted',
    classification_reason=null
where deleted_at is null
  and status='published'
  and visibility='public'
  and category_id is null
  and (topic is null or topic in ('uplifting','motivation','encouragement','advice'))
  and coalesce((public.classify_home_post(content,'insight')->>'aligned')::boolean,false)=true;
