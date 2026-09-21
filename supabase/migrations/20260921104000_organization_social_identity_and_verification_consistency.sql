-- Organization social identity and verification consistency.

create or replace function public.sync_organization_verification_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verified is true or new.verification_status = 'verified' then
    new.verified := true;
    new.verification_status := 'verified';
  elsif new.verified is false and new.verification_status = 'verified' then
    new.verification_status := 'pending';
  end if;
  return new;
end
$$;

drop trigger if exists sync_organization_verification_state on public.organizations;
create trigger sync_organization_verification_state
before insert or update of verified,verification_status on public.organizations
for each row execute function public.sync_organization_verification_state();

create or replace function public.verify_org_on_opportunity_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' and old.status is distinct from 'active' and new.organization_id is not null then
    update public.organizations
    set verified = true, verification_status = 'verified'
    where id = new.organization_id and (verified is false or verification_status is distinct from 'verified');
  end if;
  return new;
end
$$;

alter table public.comments add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.reactions add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.comment_reactions add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

create index if not exists comments_organization_idx on public.comments(organization_id,created_at desc) where organization_id is not null;
create index if not exists reactions_organization_idx on public.reactions(organization_id,created_at desc) where organization_id is not null;
create index if not exists comment_reactions_organization_idx on public.comment_reactions(organization_id,created_at desc) where organization_id is not null;

drop index if exists public.reactions_unique_post;
create unique index if not exists reactions_unique_personal_post_actor on public.reactions(user_id,post_id) where post_id is not null and organization_id is null;
create unique index if not exists reactions_unique_organization_post_actor on public.reactions(organization_id,post_id) where post_id is not null and organization_id is not null;

alter table public.comment_reactions drop constraint if exists comment_reactions_comment_id_user_id_key;
drop index if exists public.comment_reactions_comment_id_user_id_key;
create unique index if not exists comment_reactions_unique_personal_actor on public.comment_reactions(comment_id,user_id) where organization_id is null;
create unique index if not exists comment_reactions_unique_organization_actor on public.comment_reactions(comment_id,organization_id) where organization_id is not null;

drop policy if exists "Users can create comments" on public.comments;
create policy "Users can create comments" on public.comments for insert to authenticated
with check (
  auth.uid() = author_id and not public.is_banned() and
  (organization_id is null or exists (
    select 1 from public.organization_members om
    where om.organization_id=comments.organization_id and om.user_id=auth.uid() and om.role in ('owner','recruiter')
  ))
);

drop policy if exists "Users can update/delete own comments" on public.comments;
create policy "Members manage personal or organization comments" on public.comments for update to authenticated
using (
  auth.uid()=author_id or (
    organization_id is not null and exists (
      select 1 from public.organization_members om
      where om.organization_id=comments.organization_id and om.user_id=auth.uid() and om.role in ('owner','recruiter')
    )
  )
)
with check (
  not public.is_banned() and (
    auth.uid()=author_id or (
      organization_id is not null and exists (
        select 1 from public.organization_members om
        where om.organization_id=comments.organization_id and om.user_id=auth.uid() and om.role in ('owner','recruiter')
      )
    )
  )
);

create or replace function public.guard_comment_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.author_id is distinct from old.author_id
     or new.organization_id is distinct from old.organization_id
     or new.post_id is distinct from old.post_id
     or new.parent_id is distinct from old.parent_id then
    raise exception 'Comment identity cannot be changed after publishing';
  end if;
  return new;
end
$$;

drop trigger if exists guard_comment_identity on public.comments;
create trigger guard_comment_identity before update on public.comments for each row execute function public.guard_comment_identity();

drop policy if exists "Users can create own reactions" on public.reactions;
create policy "Members create personal or organization reactions" on public.reactions for insert to authenticated
with check (
  auth.uid()=user_id and not public.is_banned() and
  (organization_id is null or (
    post_id is not null and exists (
      select 1 from public.organization_members om
      where om.organization_id=reactions.organization_id and om.user_id=auth.uid() and om.role in ('owner','recruiter')
    )
  ))
);

drop policy if exists "Users can delete own reactions" on public.reactions;
create policy "Members remove personal or organization reactions" on public.reactions for delete to authenticated
using (
  (organization_id is null and auth.uid()=user_id) or
  (organization_id is not null and exists (
    select 1 from public.organization_members om
    where om.organization_id=reactions.organization_id and om.user_id=auth.uid() and om.role in ('owner','recruiter')
  ))
);

drop policy if exists "Members react to comments as themselves" on public.comment_reactions;
create policy "Members create personal or organization comment reactions" on public.comment_reactions for insert to authenticated
with check (
  auth.uid()=user_id and not public.is_banned() and
  (organization_id is null or exists (
    select 1 from public.organization_members om
    where om.organization_id=comment_reactions.organization_id and om.user_id=auth.uid() and om.role in ('owner','recruiter')
  ))
);

drop policy if exists "Members change own comment reactions" on public.comment_reactions;
create policy "Members change personal or organization comment reactions" on public.comment_reactions for update to authenticated
using (
  (organization_id is null and auth.uid()=user_id) or
  (organization_id is not null and exists (
    select 1 from public.organization_members om
    where om.organization_id=comment_reactions.organization_id and om.user_id=auth.uid() and om.role in ('owner','recruiter')
  ))
)
with check (
  auth.uid()=user_id and not public.is_banned() and
  (organization_id is null or exists (
    select 1 from public.organization_members om
    where om.organization_id=comment_reactions.organization_id and om.user_id=auth.uid() and om.role in ('owner','recruiter')
  ))
);

drop policy if exists "Members remove own comment reactions" on public.comment_reactions;
create policy "Members remove personal or organization comment reactions" on public.comment_reactions for delete to authenticated
using (
  (organization_id is null and auth.uid()=user_id) or
  (organization_id is not null and exists (
    select 1 from public.organization_members om
    where om.organization_id=comment_reactions.organization_id and om.user_id=auth.uid() and om.role in ('owner','recruiter')
  ))
);

create or replace function public.notify_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
  post_org uuid;
  reply_author uuid;
  actor_name text;
begin
  if new.organization_id is not null then
    select name into actor_name from public.organizations where id=new.organization_id;
  else
    select coalesce(full_name,username,'Someone') into actor_name from public.profiles where id=new.author_id;
  end if;

  if new.parent_id is not null then
    select author_id into reply_author from public.comments where id=new.parent_id;
    if reply_author is not null and reply_author is distinct from new.author_id and public.social_notifications_enabled(reply_author) then
      insert into public.notifications(user_id,type,title,message,link)
      values(reply_author,'comment_reply',coalesce(actor_name,'Someone')||' replied to your comment',left(new.content,140),'/post/'||new.post_id::text);
    end if;
  end if;

  select author_id,organization_id into post_author,post_org from public.posts where id=new.post_id;

  if post_org is not null then
    insert into public.notifications(user_id,type,title,message,link)
    select om.user_id,'new_comment',coalesce(actor_name,'Someone')||' commented on your organization post',left(new.content,140),'/post/'||new.post_id::text
    from public.organization_members om
    where om.organization_id=post_org and om.role in ('owner','recruiter')
      and om.user_id is distinct from new.author_id and om.user_id is distinct from reply_author
      and public.social_notifications_enabled(om.user_id);
  elsif post_author is not null and post_author is distinct from new.author_id and post_author is distinct from reply_author and public.social_notifications_enabled(post_author) then
    insert into public.notifications(user_id,type,title,message,link)
    values(post_author,'new_comment',coalesce(actor_name,'Someone')||' commented on your post',left(new.content,140),'/post/'||new.post_id::text);
  end if;
  return new;
end
$$;

create or replace function public.notify_new_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
  post_org uuid;
  actor_name text;
  reaction_message text;
begin
  if new.post_id is null then return new; end if;
  if new.organization_id is not null then
    select name into actor_name from public.organizations where id=new.organization_id;
  else
    select coalesce(full_name,username,'Someone') into actor_name from public.profiles where id=new.user_id;
  end if;
  reaction_message := case new.type when 'like' then '❤️ Like' when 'spark' then '✨ Spark' when 'insightful' then '💡 Insightful' when 'useful' then '👍 Useful' else 'New reaction' end;
  select author_id,organization_id into post_author,post_org from public.posts where id=new.post_id;
  if post_org is not null then
    insert into public.notifications(user_id,type,title,message,link)
    select om.user_id,'post_reaction',coalesce(actor_name,'Someone')||' reacted to your organization post',reaction_message,'/post/'||new.post_id::text
    from public.organization_members om
    where om.organization_id=post_org and om.role in ('owner','recruiter')
      and om.user_id is distinct from new.user_id and public.social_notifications_enabled(om.user_id);
  elsif post_author is not null and post_author is distinct from new.user_id and public.social_notifications_enabled(post_author) then
    insert into public.notifications(user_id,type,title,message,link)
    values(post_author,'post_reaction',coalesce(actor_name,'Someone')||' reacted to your post',reaction_message,'/post/'||new.post_id::text);
  end if;
  return new;
end
$$;

create or replace function public.notify_comment_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_post uuid;
  actor_name text;
begin
  select author_id,post_id into v_author,v_post from public.comments where id=new.comment_id and deleted_at is null;
  if new.organization_id is not null then
    select name into actor_name from public.organizations where id=new.organization_id;
  else
    select coalesce(full_name,username,'Someone') into actor_name from public.profiles where id=new.user_id;
  end if;
  if v_author is not null and v_author<>new.user_id then
    insert into public.notifications(user_id,type,title,message,link)
    values(v_author,'comment_reaction',coalesce(actor_name,'Someone')||' reacted to your comment','Someone reacted to your comment.','/post/'||v_post::text);
  end if;
  return new;
end
$$;

revoke execute on function public.sync_organization_verification_state() from public,anon,authenticated;
revoke execute on function public.guard_comment_identity() from public,anon,authenticated;
revoke execute on function public.notify_new_comment() from public,anon,authenticated;
revoke execute on function public.notify_new_reaction() from public,anon,authenticated;
revoke execute on function public.notify_comment_reaction() from public,anon,authenticated;
