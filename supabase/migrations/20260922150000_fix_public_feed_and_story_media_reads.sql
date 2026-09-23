-- Public reads must not evaluate moderator-only functions for signed-out users.
-- Keep moderator access in an authenticated-only policy.
alter policy "Published posts are viewable by everyone" on public.posts
  using (status = 'published' or (select auth.uid()) = author_id);

create policy "Moderators read all posts" on public.posts
  for select to authenticated using (public.is_admin_or_mod());

-- This policy participates in every storage read, including story URL signing.
alter policy "Only admins and moderators can view verification docs" on storage.objects
  to authenticated;
