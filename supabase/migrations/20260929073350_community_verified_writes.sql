-- Match the rest of POSSARA: email verification is enforced on the server.
create trigger community_groups_verified before insert or update on public.community_groups
for each row execute function public.require_verified_member_write();
create trigger community_members_verified before insert or update on public.community_members
for each row execute function public.require_verified_member_write();
create trigger community_messages_verified before insert or update on public.community_messages
for each row execute function public.require_verified_member_write();
create trigger community_reactions_verified before insert or update on public.community_reactions
for each row execute function public.require_verified_member_write();
-- Invitations are accessed only through the authorized private function.
create policy community_invites_no_direct_access on private.community_invites
for all to authenticated using(false) with check(false);
