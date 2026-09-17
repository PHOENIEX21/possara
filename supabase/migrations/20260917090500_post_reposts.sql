alter table public.posts
  add column if not exists shared_from_post_id uuid null references public.posts(id) on delete set null;

create index if not exists idx_posts_shared_from_post_id on public.posts(shared_from_post_id);

comment on column public.posts.shared_from_post_id is 'Original POSSARA post referenced when this row is a repost/share to a member profile.';
