-- Harden public client reports before production launch.
--
-- Reports are rendered by the Next.js /report/[token] server page using the service role
-- and a token-scoped `.eq('share_token', token)` lookup. Broad anon/authenticated
-- SELECT policies are therefore unnecessary and can expose every inspection that has
-- any share_token through the public Supabase API.
--
-- Run this once in the Supabase SQL editor after any earlier share-token migration.

DROP POLICY IF EXISTS "Public read via inspection" ON inspection_photos;
DROP POLICY IF EXISTS "Public read via inspection" ON checklist_items;
DROP POLICY IF EXISTS "Public read via inspection" ON properties;
DROP POLICY IF EXISTS "Public read via inspection" ON organizations;
DROP POLICY IF EXISTS "Public read via share token" ON inspections;

ALTER TABLE inspections ADD COLUMN IF NOT EXISTS share_token uuid UNIQUE DEFAULT NULL;
