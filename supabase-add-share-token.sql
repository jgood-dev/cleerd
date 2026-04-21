-- Run this in the Supabase SQL editor
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS share_token uuid UNIQUE DEFAULT NULL;

-- Allow public (unauthenticated) read of inspections via share token
-- This policy lets the report page work without login
CREATE POLICY "Public read via share token" ON inspections
  FOR SELECT USING (share_token IS NOT NULL);

-- Allow public read of related data for the report page
CREATE POLICY "Public read via inspection" ON inspection_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_photos.inspection_id
      AND inspections.share_token IS NOT NULL
    )
  );

CREATE POLICY "Public read via inspection" ON checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = checklist_items.inspection_id
      AND inspections.share_token IS NOT NULL
    )
  );

CREATE POLICY "Public read via inspection" ON properties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.property_id = properties.id
      AND inspections.share_token IS NOT NULL
    )
  );

CREATE POLICY "Public read via inspection" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.org_id = organizations.id
      AND inspections.share_token IS NOT NULL
    )
  );
