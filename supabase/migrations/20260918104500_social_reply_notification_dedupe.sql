-- Remove the temporary duplicate reply notification path.
-- POSSARA's existing notify_new_comment() trigger already sends reply notifications
-- and respects each member's social notification preference.
drop trigger if exists comments_notify_reply on public.comments;
drop function if exists public.notify_comment_reply();
