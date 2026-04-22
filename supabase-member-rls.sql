-- Allow org members to read all org data
-- Uses a SECURITY DEFINER helper to avoid circular RLS with organizations table

CREATE OR REPLACE FUNCTION is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND invite_accepted_at IS NOT NULL
  )
$$;

-- packages
DROP POLICY IF EXISTS "members_select_packages" ON packages;
CREATE POLICY "members_select_packages" ON packages
  FOR SELECT USING (is_org_member(org_id));

-- teams
DROP POLICY IF EXISTS "members_select_teams" ON teams;
CREATE POLICY "members_select_teams" ON teams
  FOR SELECT USING (is_org_member(org_id));

-- properties
DROP POLICY IF EXISTS "members_select_properties" ON properties;
CREATE POLICY "members_select_properties" ON properties
  FOR SELECT USING (is_org_member(org_id));

-- jobs
DROP POLICY IF EXISTS "members_select_jobs" ON jobs;
CREATE POLICY "members_select_jobs" ON jobs
  FOR SELECT USING (is_org_member(org_id));

-- inspections
DROP POLICY IF EXISTS "members_select_inspections" ON inspections;
CREATE POLICY "members_select_inspections" ON inspections
  FOR SELECT USING (is_org_member(org_id));

-- team_members (via team's org_id)
DROP POLICY IF EXISTS "members_select_team_members" ON team_members;
CREATE POLICY "members_select_team_members" ON team_members
  FOR SELECT USING (
    team_id IN (SELECT id FROM teams WHERE is_org_member(org_id))
  );

-- package_items (via package's org_id)
DROP POLICY IF EXISTS "members_select_package_items" ON package_items;
CREATE POLICY "members_select_package_items" ON package_items
  FOR SELECT USING (
    package_id IN (SELECT id FROM packages WHERE is_org_member(org_id))
  );

-- checklist_items (via inspection's org_id)
DROP POLICY IF EXISTS "members_select_checklist_items" ON checklist_items;
CREATE POLICY "members_select_checklist_items" ON checklist_items
  FOR SELECT USING (
    inspection_id IN (SELECT id FROM inspections WHERE is_org_member(org_id))
  );

-- inspection_photos
DROP POLICY IF EXISTS "members_select_inspection_photos" ON inspection_photos;
CREATE POLICY "members_select_inspection_photos" ON inspection_photos
  FOR SELECT USING (
    inspection_id IN (SELECT id FROM inspections WHERE is_org_member(org_id))
  );
