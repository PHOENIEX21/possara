-- Keep the pre-existing social notification trigger as the single source of reply notifications.
drop trigger if exists comments_notify_reply on public.comments;
drop function if exists public.notify_comment_reply();