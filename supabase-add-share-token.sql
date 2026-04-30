-- Run this in the Supabase SQL editor.
--
-- Public client reports are rendered by the Next.js /report/[token] server route using
-- the service role and an exact share_token match. Do not add broad RLS SELECT policies
-- for rows where share_token IS NOT NULL; those policies let public Supabase API
-- clients enumerate every shared report row.

ALTER TABLE inspections ADD COLUMN IF NOT EXISTS share_token uuid UNIQUE DEFAULT NULL;

-- If an older copy of this migration was run, remove its broad public-read policies.
DROP POLICY IF EXISTS "Public read via inspection" ON inspection_photos;
DROP POLICY IF EXISTS "Public read via inspection" ON checklist_items;
DROP POLICY IF EXISTS "Public read via inspection" ON properties;
DROP POLICY IF EXISTS "Public read via inspection" ON organizations;
DROP POLICY IF EXISTS "Public read via share token" ON inspections;
