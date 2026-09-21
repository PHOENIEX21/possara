drop policy if exists "Admins and moderators can delete moments" on public.stories;
create policy "Admins and moderators can delete moments"
on public.stories for delete
to authenticated
using (public.is_admin_or_mod());

drop policy if exists "Admins and moderators delete moment files" on storage.objects;
create policy "Admins and moderators delete moment files"
on storage.objects for delete
to authenticated
using (
  bucket_id in ('moments','moment-music')
  and public.is_admin_or_mod()
);
