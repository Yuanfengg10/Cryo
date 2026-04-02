create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  business_type text not null check (
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
  ),
  city text not null,
  phone text not null,
  contact_name text,
  status text not null default 'new' check (
    status in ('new', 'contacted', 'followup_due', 'warm', 'ready_to_close', 'closed', 'dead')
  ),
  lead_type text not null default 'cold' check (lead_type in ('cold', 'warm')),
  notes text not null default '',
  intent_score text check (intent_score in ('interested', 'neutral', 'not_interested')),
  probability numeric(5,2) not null default 0,
  projected_commission_eur numeric(12,2) not null default 0,
  first_contacted_at timestamptz,
  last_contacted_at timestamptz,
  follow_up_due_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists leads_business_name_city_phone_idx
  on public.leads (business_name, city, phone);

create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_follow_up_due_at_idx on public.leads (follow_up_due_at);
create index if not exists leads_business_type_idx on public.leads (business_type);
create index if not exists leads_city_idx on public.leads (city);

create table if not exists public.conversation_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  direction text not null check (direction in ('outbound', 'inbound')),
  channel text not null default 'whatsapp' check (channel in ('whatsapp')),
  message text not null,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists conversation_events_lead_id_idx
  on public.conversation_events (lead_id, occurred_at desc);

create table if not exists public.follow_up_tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  sequence_number integer not null,
  cadence_type text not null check (cadence_type in ('cold', 'warm')),
  due_at timestamptz not null,
  completed_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  message_generation_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists follow_up_tasks_due_idx
  on public.follow_up_tasks (status, due_at);

create table if not exists public.message_generations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  message_kind text not null check (message_kind in ('cold_open', 'follow_up', 'reply_assist')),
  model_name text,
  prompt_snapshot text not null,
  generated_message text not null,
  edited_message text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.follow_up_tasks
  drop constraint if exists follow_up_tasks_message_generation_id_fkey;

alter table public.follow_up_tasks
  add constraint follow_up_tasks_message_generation_id_fkey
  foreign key (message_generation_id) references public.message_generations(id) on delete set null;

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  activity_type text not null check (
    activity_type in (
      'lead_created',
      'message_generated',
      'message_sent',
      'reply_logged',
      'follow_up_scheduled',
      'status_changed',
      'lead_archived'
    )
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lead_import_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'google_places',
  query_scope jsonb not null default '{}'::jsonb,
  imported_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists leads_set_updated_at on public.leads;

create trigger leads_set_updated_at
before update on public.leads
for each row
execute function public.set_updated_at();
