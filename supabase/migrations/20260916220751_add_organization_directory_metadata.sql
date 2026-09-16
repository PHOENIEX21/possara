alter table public.organizations
  add column if not exists industry text,
  add column if not exists country text,
  add column if not exists state text,
  add column if not exists headquarters text;

create index if not exists organizations_industry_idx on public.organizations (industry);
create index if not exists organizations_state_idx on public.organizations (state);
create index if not exists organizations_country_idx on public.organizations (country);

update public.organizations
set industry = coalesce(industry, 'Education & Scholarships'),
    country = coalesce(country, 'United Kingdom')
where slug = 'chevening-fcdo';

update public.organizations
set industry = coalesce(industry, 'Construction & Engineering'),
    country = coalesce(country, 'Nigeria'),
    state = coalesce(state, 'Federal Capital Territory'),
    headquarters = coalesce(headquarters, 'Abuja')
where slug = 'julius-berger-nigeria';

update public.organizations
set industry = coalesce(industry, 'NGO & Foundation'),
    country = coalesce(country, 'International')
where slug = 'mastercard-foundation';

update public.organizations
set industry = coalesce(industry, 'NGO & Foundation'),
    country = coalesce(country, 'Nigeria'),
    state = coalesce(state, 'Lagos'),
    headquarters = coalesce(headquarters, 'Lagos')
where slug = 'tony-elumelu-foundation';
