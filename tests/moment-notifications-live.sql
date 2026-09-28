begin;
select set_config('test.actor',(select id::text from public.profiles order by created_at limit 1),true);
select set_config('test.viewer',(select id::text from public.profiles order by created_at offset 1 limit 1),true);
select set_config('test.moment',gen_random_uuid()::text,true);
select set_config('test.post',gen_random_uuid()::text,true);
select set_config('test.comment',gen_random_uuid()::text,true);
select set_config('test.interaction',gen_random_uuid()::text,true);
insert into public.user_preferences(user_id,notify_social,notify_opportunity_matches)
values(current_setting('test.actor')::uuid,true,true),(current_setting('test.viewer')::uuid,true,true)
on conflict(user_id) do update set notify_social=true,notify_opportunity_matches=true;
insert into public.follows(follower_id,following_id)
values(current_setting('test.viewer')::uuid,current_setting('test.actor')::uuid) on conflict do nothing;
insert into public.stories(id,author_id,story_type,text_body,expires_at)
values(current_setting('test.moment')::uuid,current_setting('test.actor')::uuid,'text','Moment verification fixture',now()+interval '1 day');
insert into public.posts(id,author_id,content)
values(current_setting('test.post')::uuid,current_setting('test.actor')::uuid,'Notification verification fixture');
insert into public.comments(id,post_id,author_id,content)
values(current_setting('test.comment')::uuid,current_setting('test.post')::uuid,current_setting('test.viewer')::uuid,'Comment verification fixture');
insert into public.story_interactions(id,story_id,user_id,kind,body)
values(current_setting('test.interaction')::uuid,current_setting('test.moment')::uuid,current_setting('test.viewer')::uuid,'reply','Reply verification fixture');
do $$ begin
 if not exists(select 1 from public.notifications where user_id=current_setting('test.viewer')::uuid and link='/moments/'||current_setting('test.moment') and actor_id=current_setting('test.actor')::uuid)
 then raise exception 'Moment notification destination failed'; end if;
 if not exists(select 1 from public.notifications where user_id=current_setting('test.actor')::uuid and link='/post/'||current_setting('test.post')||'?comment='||current_setting('test.comment'))
 then raise exception 'Comment notification destination failed'; end if;
 if not exists(select 1 from public.notifications where user_id=current_setting('test.actor')::uuid and link='/moments/'||current_setting('test.moment')||'?interaction='||current_setting('test.interaction'))
 then raise exception 'Moment interaction destination failed'; end if;
end $$;
update public.profiles set goal_categories='{}' where id=current_setting('test.viewer')::uuid;
delete from public.notifications where user_id=current_setting('test.viewer')::uuid and type='profile_opportunity_setup';
select set_config('request.jwt.claim.sub',current_setting('test.viewer'),true);
set local role authenticated;
select public.refresh_opportunity_notifications();
select public.refresh_opportunity_notifications();
reset role;
do $$ begin
 if (select count(*) from public.notifications where user_id=current_setting('test.viewer')::uuid and type='profile_opportunity_setup' and link='/profile/me?edit=1')<>1
 then raise exception 'Profile reminder or deduplication failed'; end if;
end $$;
select 'PASS: live Moment, comment, reply destinations and authenticated profile reminder deduplication; all test writes rolled back' as result;
rollback;
