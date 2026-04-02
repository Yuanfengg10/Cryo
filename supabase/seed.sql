insert into public.leads (
  business_name,
  business_type,
  city,
  phone,
  contact_name,
  status,
  lead_type,
  notes,
  intent_score,
  probability,
  projected_commission_eur,
  first_contacted_at,
  last_contacted_at,
  follow_up_due_at
)
values
  (
    'Ultimate Performance Singapore',
    'gym',
    'Singapore',
    '6598765432',
    'Operations Team',
    'followup_due',
    'warm',
    'Premium positioning. Recovery upsell angle is strong.',
    'interested',
    0.65,
    4200,
    timezone('utc', now()) - interval '8 days',
    timezone('utc', now()) - interval '2 days',
    timezone('utc', now())
  ),
  (
    'Hammam Spa Bangsar',
    'spa',
    'Bangsar',
    '601122334455',
    'Spa Director',
    'new',
    'cold',
    'Luxury concept and strong treatment-menu storytelling.',
    null,
    0.25,
    2800,
    null,
    null,
    null
  ),
  (
    'Convergy Physio & Rehab',
    'clinic',
    'Singapore',
    '6562620566',
    'Clinical Director',
    'ready_to_close',
    'warm',
    'Reply mentioned interest in patient recovery speed and revenue per room.',
    'interested',
    0.82,
    5000,
    timezone('utc', now()) - interval '12 days',
    timezone('utc', now()) - interval '1 day',
    timezone('utc', now()) + interval '1 day'
  ),
  (
    'Chi Fitness KLCC',
    'gym',
    'Kuala Lumpur',
    '60321622366',
    'General Manager',
    'contacted',
    'cold',
    'Need a second touch on recovery zone monetisation.',
    null,
    0.35,
    3200,
    timezone('utc', now()) - interval '4 days',
    timezone('utc', now()) - interval '4 days',
    timezone('utc', now())
  ),
  (
    'Porcelain Skin',
    'wellness_studio',
    'Singapore',
    '6562279692',
    'Studio Team',
    'warm',
    'warm',
    'Interested in premium facial and client experience differentiation.',
    'neutral',
    0.54,
    2600,
    timezone('utc', now()) - interval '10 days',
    timezone('utc', now()) - interval '2 days',
    timezone('utc', now()) + interval '2 days'
  ),
  (
    'Vital Age Longevity Clinic',
    'longevity_clinic',
    'Singapore',
    '6569001122',
    'Founder',
    'new',
    'cold',
    'Longevity-focused clinic. HaloX capsule and Antarctica chamber could fit premium bio-optimisation offers.',
    null,
    0.42,
    4800,
    null,
    null,
    null
  ),
  (
    'Kuala Lumpur Biohacking Lab',
    'biohacking_centre',
    'Kuala Lumpur',
    '60376543210',
    'Programme Director',
    'contacted',
    'cold',
    'Strong fit for longevity and performance positioning. Likely interested in flagship hardware.',
    null,
    0.46,
    5300,
    timezone('utc', now()) - interval '3 days',
    timezone('utc', now()) - interval '3 days',
    timezone('utc', now()) + interval '1 day'
  )
on conflict do nothing;

insert into public.conversation_events (lead_id, direction, channel, message, occurred_at)
select id, 'outbound', 'whatsapp', 'Reached out with performance recovery angle.', timezone('utc', now()) - interval '8 days'
from public.leads
where business_name = 'Ultimate Performance Singapore'
on conflict do nothing;

insert into public.conversation_events (lead_id, direction, channel, message, occurred_at)
select id, 'inbound', 'whatsapp', 'Asked whether the equipment fits compact urban clubs.', timezone('utc', now()) - interval '5 days'
from public.leads
where business_name = 'Ultimate Performance Singapore'
on conflict do nothing;

insert into public.conversation_events (lead_id, direction, channel, message, occurred_at)
select id, 'outbound', 'whatsapp', 'Introduced clinical outcomes angle.', timezone('utc', now()) - interval '12 days'
from public.leads
where business_name = 'Convergy Physio & Rehab'
on conflict do nothing;

insert into public.conversation_events (lead_id, direction, channel, message, occurred_at)
select id, 'inbound', 'whatsapp', 'Asked for footprint, support, and treatment ROI.', timezone('utc', now()) - interval '1 day'
from public.leads
where business_name = 'Convergy Physio & Rehab'
on conflict do nothing;

insert into public.conversation_events (lead_id, direction, channel, message, occurred_at)
select id, 'outbound', 'whatsapp', 'Initial outbound sent.', timezone('utc', now()) - interval '4 days'
from public.leads
where business_name = 'Chi Fitness KLCC'
on conflict do nothing;

insert into public.conversation_events (lead_id, direction, channel, message, occurred_at)
select id, 'inbound', 'whatsapp', 'Asked if cryo facial equipment fits existing treatment rooms.', timezone('utc', now()) - interval '2 days'
from public.leads
where business_name = 'Porcelain Skin'
on conflict do nothing;

insert into public.conversation_events (lead_id, direction, channel, message, occurred_at)
select id, 'outbound', 'whatsapp', 'Initial longevity and flagship hardware outreach sent.', timezone('utc', now()) - interval '3 days'
from public.leads
where business_name = 'Kuala Lumpur Biohacking Lab'
on conflict do nothing;
