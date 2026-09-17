revoke all on function public.get_message_directory(text, integer) from public;
revoke execute on function public.get_message_directory(text, integer) from anon;
grant execute on function public.get_message_directory(text, integer) to authenticated;

revoke all on function public.get_online_member_count() from public;
revoke execute on function public.get_online_member_count() from anon;
grant execute on function public.get_online_member_count() to authenticated;

revoke all on function public.protect_passport_verification() from public;
revoke execute on function public.protect_passport_verification() from anon;
revoke execute on function public.protect_passport_verification() from authenticated;
