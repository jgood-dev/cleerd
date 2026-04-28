-- Cleerd billing migration: Stripe subscription sync fields.
-- Run this once in Supabase SQL Editor after rotating credentials and before enabling live checkout.

alter table organizations
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text unique,
  add column if not exists subscription_status text default 'trialing',
  add column if not exists subscription_current_period_end timestamptz;

create index if not exists organizations_stripe_customer_id_idx on organizations(stripe_customer_id);
create index if not exists organizations_subscription_status_idx on organizations(subscription_status);
