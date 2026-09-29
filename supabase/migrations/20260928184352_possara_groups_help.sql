-- Groups: membership is enforced in the database, including private attachments.
create table public.community_groups (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
 name text not null check(length(trim(name)) between 2 and 80), description text not null default '' check(length(description)<=2000),
 privacy text not null check(privacy in ('public','private')), approval_required boolean not null default false,
 rules text not null default '' check(length(rules)<=2000), created_at timestamptz not null default now(), last_message_at timestamptz
);
create table public.community_members (
 group_id uuid not null references public.community_groups(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 role text not null default 'member' check(role in ('owner','admin','member')),
 status text not null default 'active' check(status in ('active','pending','banned')),
 muted boolean not null default false, last_read_at timestamptz not null default now(),
 primary key(group_id,user_id)
);
create index community_members_user_idx on public.community_members(user_id, status);
create table public.community_messages (
 id uuid primary key default gen_random_uuid(), group_id uuid not null references public.community_groups(id) on delete cascade,
 author_id uuid not null references public.profiles(id), body text not null default '' check(length(body)<=6000),
 kind text not null default 'chat' check(kind in ('chat','request','offer')),
 resolved boolean not null default false, pinned boolean not null default false,
 reply_to_id uuid, file_path text, file_name text, created_at timestamptz not null default now(),
 unique(group_id,id), foreign key(group_id,reply_to_id) references public.community_messages(group_id,id),
 check(length(trim(body))>0 or file_path is not null)
);
create index community_messages_group_idx on public.community_messages(group_id,created_at desc);
create index community_messages_author_idx on public.community_messages(author_id);
create index community_messages_reply_idx on public.community_messages(group_id,reply_to_id);
alter table public.reports add column community_message_id uuid references public.community_messages(id) on delete cascade;
alter table public.reports drop constraint reports_exactly_one_target;
alter table public.reports add constraint reports_exactly_one_target check(num_nonnulls(post_id,opportunity_id,community_message_id)=1);
create index reports_community_message_idx on public.reports(community_message_id);
create table public.community_reactions (
 message_id uuid not null references public.community_messages(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 reaction text not null check(reaction in ('love','thanks','support')),
 primary key(message_id,user_id)
);
create index community_reactions_user_idx on public.community_reactions(user_id);
create schema if not exists private;
create table private.community_invites(group_id uuid primary key references public.community_groups(id) on delete cascade, token uuid not null unique default gen_random_uuid());
alter table private.community_invites enable row level security;
revoke all on private.community_invites from public,anon,authenticated;

create function private.community_member(gid uuid, managing boolean default false) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.community_members where group_id=gid and user_id=auth.uid() and status='active' and (not managing or role in ('owner','admin')))
$$;
revoke all on function private.community_member(uuid,boolean) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.community_member(uuid,boolean) to authenticated;
alter table public.community_groups enable row level security;
alter table public.community_members enable row level security;
alter table public.community_messages enable row level security;
alter table public.community_reactions enable row level security;
revoke all on public.community_groups,public.community_members,public.community_messages,public.community_reactions from anon,authenticated;
grant select on public.community_groups,public.community_members,public.community_messages,public.community_reactions to authenticated;
create policy groups_read on public.community_groups for select to authenticated using (privacy='public' or exists(select 1 from public.community_members m where m.group_id=id and m.user_id=(select auth.uid()) and m.status<>'banned'));
create policy members_read on public.community_members for select to authenticated using(user_id=(select auth.uid()) or private.community_member(group_id));
create policy messages_read on public.community_messages for select to authenticated using(private.community_member(group_id));
create policy reactions_read on public.community_reactions for select to authenticated using(exists(select 1 from public.community_messages m where m.id=message_id));

-- All membership-changing writes have one audited authorization boundary.
create function private.community_action(action text, gid uuid default null, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); g public.community_groups; m public.community_members; msg public.community_messages; target uuid; result_id uuid; token uuid;
begin
 if uid is null then raise exception 'Sign in to use groups.'; end if;
 if action='create' then
  if (select count(*) from public.community_groups where owner_id=uid)>=30 then raise exception 'You can manage up to 30 groups.'; end if;
  insert into public.community_groups(owner_id,name,description,privacy,approval_required,rules)
  values(uid,trim(payload->>'name'),coalesce(payload->>'description',''),coalesce(payload->>'privacy','public'),coalesce((payload->>'approval_required')::boolean,false),coalesce(payload->>'rules','')) returning id into result_id;
  insert into public.community_members(group_id,user_id,role) values(result_id,uid,'owner');
  insert into private.community_invites(group_id) values(result_id);
  return jsonb_build_object('id',result_id);
 end if;
 if action='join_invite' then
  select group_id into gid from private.community_invites where community_invites.token=(payload->>'token')::uuid;
  if gid is null then raise exception 'This invitation is no longer available.'; end if;
 end if;
 select * into g from public.community_groups where id=gid for update;
 if not found then raise exception 'Group unavailable.'; end if;
 select * into m from public.community_members where group_id=gid and user_id=uid;
 if action in ('join','join_invite') then
  if m.status='banned' then raise exception 'You cannot join this group.'; end if;
  if action='join' and g.privacy<>'public' then raise exception 'An invitation is required.'; end if;
  insert into public.community_members(group_id,user_id,status) values(gid,uid,case when g.approval_required then 'pending' else 'active' end) on conflict do nothing;
  return jsonb_build_object('id',gid);
 end if;
 if m.status is distinct from 'active' then raise exception 'Active membership required.'; end if;
 if action='preferences' then
  update public.community_members set muted=coalesce((payload->>'muted')::boolean,muted),last_read_at=case when payload->>'read'='true' then now() else last_read_at end where group_id=gid and user_id=uid;
 elsif action='leave' then
  if m.role='owner' then raise exception 'The owner must remain in the group.'; end if;
  delete from public.community_members where group_id=gid and user_id=uid;
 elsif action in ('approve','remove','promote','invite','rotate_invite','settings') then
  if m.role not in ('owner','admin') then raise exception 'Only group admins can do this.'; end if;
  if action in ('invite','rotate_invite') then
   if action='rotate_invite' then update private.community_invites set token=gen_random_uuid() where group_id=gid; end if;
   select i.token into token from private.community_invites i where i.group_id=gid;
   return jsonb_build_object('token',token);
  elsif action='settings' then
   update public.community_groups set rules=coalesce(payload->>'rules',rules),approval_required=coalesce((payload->>'approval_required')::boolean,approval_required) where id=gid;
  else
   target:=(payload->>'user_id')::uuid;
   if target=g.owner_id then raise exception 'The group owner cannot be removed or demoted.'; end if;
   if action='promote' and m.role<>'owner' then raise exception 'Only the owner can appoint admins.'; end if;
   if m.role<>'owner' and exists(select 1 from public.community_members where group_id=gid and user_id=target and role='admin') then raise exception 'Only the owner can manage admins.'; end if;
   update public.community_members set status=case when action='remove' then 'banned' else 'active' end,role=case when action='promote' then 'admin' else role end where group_id=gid and user_id=target;
  end if;
 elsif action='send' then
  result_id:=coalesce((payload->>'client_message_id')::uuid,gen_random_uuid());
  select * into msg from public.community_messages where id=result_id;
  if found then
   if msg.author_id<>uid or msg.group_id<>gid then raise exception 'Message identifier already used.'; end if;
   return jsonb_build_object('id',msg.id,'file_path',msg.file_path);
  end if;
  if exists(select 1 from public.community_messages where author_id=uid and created_at>now()-interval '2 seconds') then raise exception 'Please wait a moment before sending again.'; end if;
  if payload->>'file_path' is not null and not exists(select 1 from storage.objects where bucket_id='community-files' and name=payload->>'file_path' and split_part(name,'/',1)=gid::text and split_part(name,'/',2)=uid::text) then raise exception 'Upload the attachment before sending.'; end if;
  insert into public.community_messages(id,group_id,author_id,body,kind,reply_to_id,file_path,file_name)
  values(result_id,gid,uid,trim(coalesce(payload->>'body','')),coalesce(payload->>'kind','chat'),(payload->>'reply_to_id')::uuid,payload->>'file_path',left(payload->>'file_name',200));
  update public.community_groups set last_message_at=now() where id=gid;
  update public.community_members set last_read_at=now() where group_id=gid and user_id=uid;
  insert into public.notifications(user_id,type,title,message,link,actor_id,actor_name)
  select cm.user_id,'group_message',g.name,left(coalesce(nullif(payload->>'body',''),'Shared an attachment'),180),'/groups/'||gid::text||'?message='||result_id::text,uid,(select full_name from public.profiles where id=uid)
  from public.community_members cm where cm.group_id=gid and cm.status='active' and cm.user_id<>uid and not cm.muted
  and public.social_notifications_enabled(cm.user_id)
  and not exists(select 1 from public.notifications n where n.user_id=cm.user_id and n.type='group_message' and n.link like '/groups/'||gid::text||'%' and n.created_at>now()-interval '5 minutes');
  return jsonb_build_object('id',result_id,'file_path',payload->>'file_path');
 elsif action in ('resolve','pin','delete','react','report') then
  select * into msg from public.community_messages where id=(payload->>'message_id')::uuid and group_id=gid;
  if not found then raise exception 'Message unavailable.'; end if;
  if action='react' then
   if exists(select 1 from public.community_reactions where message_id=msg.id and user_id=uid and reaction=payload->>'reaction') then
    delete from public.community_reactions where message_id=msg.id and user_id=uid;
   else insert into public.community_reactions values(msg.id,uid,payload->>'reaction') on conflict(message_id,user_id) do update set reaction=excluded.reaction; end if;
  elsif action='report' then
   if length(trim(coalesce(payload->>'reason','')))<5 then raise exception 'Please describe the problem.'; end if;
   insert into public.reports(reporter_id,community_message_id,reason) values(uid,msg.id,'Group: '||g.name|| E'\nReported: '||left(payload->>'reason',1500)|| E'\nContent: '||left(msg.body,2000));
  else
   if action='pin' and m.role not in ('owner','admin') then raise exception 'Only admins can pin messages.'; end if;
   if action<>'pin' and msg.author_id<>uid and m.role not in ('owner','admin') then raise exception 'You cannot change this message.'; end if;
   if action='resolve' then update public.community_messages set resolved=not resolved where id=msg.id and kind<>'chat';
   elsif action='pin' then update public.community_messages set pinned=not pinned where id=msg.id;
   else update public.community_messages set body='Message removed',file_path=null,file_name=null,pinned=false where id=msg.id; end if;
  end if;
 else raise exception 'Unknown group action.';
 end if;
 return jsonb_build_object('id',gid);
end $$;
revoke all on function private.community_action(text,uuid,jsonb) from public,anon;
grant execute on function private.community_action(text,uuid,jsonb) to authenticated;
create function public.community_action(action text,gid uuid default null,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.community_action(action,gid,payload) $$;
revoke all on function public.community_action(text,uuid,jsonb) from public,anon;
grant execute on function public.community_action(text,uuid,jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('community-files','community-files',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','audio/webm','audio/ogg','audio/mpeg','audio/mp4']);
create policy community_file_read on storage.objects for select to authenticated using(bucket_id='community-files' and exists(select 1 from public.community_members where group_id::text=split_part(name,'/',1) and user_id=(select auth.uid()) and status='active'));
create policy community_file_upload on storage.objects for insert to authenticated with check(bucket_id='community-files' and split_part(name,'/',2)=(select auth.uid())::text and exists(select 1 from public.community_members where group_id::text=split_part(name,'/',1) and user_id=(select auth.uid()) and status='active'));
create policy community_file_delete on storage.objects for delete to authenticated using(bucket_id='community-files' and split_part(name,'/',2)=(select auth.uid())::text);
