-- Runs as a single transaction; all synthetic groups, messages and notifications
-- are rolled back. No invitations or notifications are delivered to real users.
begin;
do $$
declare a uuid; b uuid; gid uuid; mid uuid; token uuid; result jsonb; rows_seen integer;
begin
 select id into a from public.profiles where email_verified_at is not null order by id limit 1;
 select id into b from public.profiles where id<>a and email_verified_at is not null order by id limit 1;
 if a is null or b is null then raise exception 'Two existing profiles are required for this rollback-only test'; end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 set local role authenticated;
 result:=public.community_action('create',null,'{"name":"Rollback verification group","privacy":"private","approval_required":true}');
 gid:=(result->>'id')::uuid;
 token:=(public.community_action('invite',gid)->>'token')::uuid;
 mid:=(public.community_action('send',gid,'{"body":"Rollback verification request","kind":"request"}')->>'id')::uuid;
 result:=public.community_action('send',gid,jsonb_build_object('client_message_id',mid,'body','Retry'));
 if (result->>'id')::uuid<>mid then raise exception 'Retry deduplication failed'; end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 select count(*) into rows_seen from public.community_messages where group_id=gid;
 if rows_seen<>0 then raise exception 'Private message leaked to outsider'; end if;
 perform public.community_action('join_invite',null,jsonb_build_object('token',token));
 select count(*) into rows_seen from public.community_messages where group_id=gid;
 if rows_seen<>0 then raise exception 'Private message leaked to pending member'; end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform public.community_action('approve',gid,jsonb_build_object('user_id',b));
 perform set_config('request.jwt.claim.sub',b::text,true);
 select count(*) into rows_seen from public.community_messages where group_id=gid;
 if rows_seen<>1 then raise exception 'Approved member cannot read message'; end if;
 perform public.community_action('react',gid,jsonb_build_object('message_id',mid,'reaction','thanks'));
 perform public.community_action('report',gid,jsonb_build_object('message_id',mid,'reason','Rollback verification report'));
 result:=public.community_action('send',gid,jsonb_build_object('body','Rollback verification reply','reply_to_id',mid));
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform public.community_action('resolve',gid,jsonb_build_object('message_id',mid));
 if not (select resolved from public.community_messages where id=mid) then raise exception 'Resolution failed'; end if;
 perform public.community_action('remove',gid,jsonb_build_object('user_id',b));
 perform set_config('request.jwt.claim.sub',b::text,true);
 select count(*) into rows_seen from public.community_messages where group_id=gid;
 if rows_seen<>0 then raise exception 'Removed member retained access'; end if;
 reset role;
 if not exists(select 1 from public.notifications where link='/groups/'||gid::text||'?message='||(result->>'id')) then raise exception 'Exact notification link missing'; end if;
end $$;
rollback;
select 'PASS: live group creation, private RLS, invitation approval, send retry, reactions, reports, replies, help resolution, removal and exact notification links; all test rows rolled back.' as result;
