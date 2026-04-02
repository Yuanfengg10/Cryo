alter table public.leads
  drop constraint if exists leads_business_type_check;

alter table public.leads
  add constraint leads_business_type_check
  check (
    business_type in (
      'gym',
      'clinic',
      'spa',
      'wellness_studio',
      'sports_centre',
      'longevity_clinic',
      'biohacking_centre',
      'other'
    )
  );
