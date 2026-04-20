-- Run this in Supabase SQL Editor

-- Organizations (one per cleaning business)
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id) on delete cascade not null,
  plan text not null default 'solo', -- solo, growth, pro
  created_at timestamptz default now()
);

-- Teams within an org
create table teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

-- Team members
create table team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text,
  role text not null default 'cleaner', -- cleaner, supervisor
  created_at timestamptz default now()
);

-- Properties / locations being cleaned
create table properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  address text,
  client_email text,
  created_at timestamptz default now()
);

-- Inspection jobs
create table inspections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  property_id uuid references properties(id) on delete set null,
  team_id uuid references teams(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  status text not null default 'in_progress', -- in_progress, completed, report_sent
  notes text,
  ai_report text,
  overall_score integer, -- 1-100
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Photos attached to inspections
create table inspection_photos (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid references inspections(id) on delete cascade not null,
  storage_path text not null,
  caption text,
  photo_type text not null default 'during', -- before, during, after, issue
  ai_notes text,
  created_at timestamptz default now()
);

-- Checklist items for inspections
create table checklist_items (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid references inspections(id) on delete cascade not null,
  label text not null,
  completed boolean default false,
  created_at timestamptz default now()
);

-- RLS policies
alter table organizations enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table properties enable row level security;
alter table inspections enable row level security;
alter table inspection_photos enable row level security;
alter table checklist_items enable row level security;

-- Organizations: owner can do everything
create policy "org owner" on organizations for all using (owner_id = auth.uid());

-- Teams: org owner
create policy "teams org owner" on teams for all using (
  org_id in (select id from organizations where owner_id = auth.uid())
);

-- Team members
create policy "team_members org owner" on team_members for all using (
  team_id in (
    select t.id from teams t
    join organizations o on o.id = t.org_id
    where o.owner_id = auth.uid()
  )
);

-- Properties
create policy "properties org owner" on properties for all using (
  org_id in (select id from organizations where owner_id = auth.uid())
);

-- Inspections
create policy "inspections org owner" on inspections for all using (
  org_id in (select id from organizations where owner_id = auth.uid())
);

-- Inspection photos
create policy "photos org owner" on inspection_photos for all using (
  inspection_id in (
    select i.id from inspections i
    join organizations o on o.id = i.org_id
    where o.owner_id = auth.uid()
  )
);

-- Checklist items
create policy "checklist org owner" on checklist_items for all using (
  inspection_id in (
    select i.id from inspections i
    join organizations o on o.id = i.org_id
    where o.owner_id = auth.uid()
  )
);

-- Storage bucket for inspection photos
insert into storage.buckets (id, name, public) values ('inspection-photos', 'inspection-photos', false);

create policy "photos upload" on storage.objects for insert with check (
  bucket_id = 'inspection-photos' and auth.role() = 'authenticated'
);

create policy "photos read" on storage.objects for select using (
  bucket_id = 'inspection-photos' and auth.role() = 'authenticated'
);
