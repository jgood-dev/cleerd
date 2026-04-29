-- Analytics event capture for activation, checkout, and first-value milestones.
-- Run this once in Supabase SQL editor before relying on persisted analytics.

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  event_source text not null default 'server',
  dedupe_key text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_org_created_idx on analytics_events(org_id, created_at desc);
create index if not exists analytics_events_name_created_idx on analytics_events(event_name, created_at desc);
create unique index if not exists analytics_events_dedupe_idx
  on analytics_events(org_id, user_id, dedupe_key)
  where dedupe_key is not null;

alter table analytics_events enable row level security;

drop policy if exists "Owners can read org analytics events" on analytics_events;
create policy "Owners can read org analytics events" on analytics_events
  for select using (
    exists (
      select 1 from organizations
      where organizations.id = analytics_events.org_id
      and organizations.owner_id = auth.uid()
    )
  );

-- Inserts are performed by trusted server routes with the service role key.
