alter table public.organizations alter column application_defaults set default '{"labels":["CV / resume"],"accept":["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","image/jpeg","image/png","image/webp"],"required":true}'::jsonb;
update public.organizations set application_defaults=jsonb_set(application_defaults,'{labels}','["CV / resume"]'::jsonb)
where application_defaults->'labels'=jsonb_build_array('CV / rÃ©sumÃ©');
