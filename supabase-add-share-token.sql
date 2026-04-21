-- Run this in the Supabase SQL editor
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS share_token uuid UNIQUE DEFAULT NULL;

-- Drop existing public read policies if they exist, then recreate
DROP POLICY IF EXISTS "Public read via inspection" ON inspection_photos;
CREATE POLICY "Public read via inspection" ON inspection_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_photos.inspection_id
      AND inspections.share_token IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Public read via inspection" ON checklist_items;
CREATE POLICY "Public read via inspection" ON checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = checklist_items.inspection_id
      AND inspections.share_token IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Public read via inspection" ON properties;
CREATE POLICY "Public read via inspection" ON properties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.property_id = properties.id
      AND inspections.share_token IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Public read via inspection" ON organizations;
CREATE POLICY "Public read via inspection" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.org_id = organizations.id
      AND inspections.share_token IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Public read via share token" ON inspections;
CREATE POLICY "Public read via share token" ON inspections
  FOR SELECT USING (share_token IS NOT NULL);
