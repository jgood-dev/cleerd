-- Admin member role: gives invited members full owner-equivalent access
-- Run this in Supabase SQL Editor

-- Helper function: is the current user an admin member of this org?
CREATE OR REPLACE FUNCTION is_org_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND role = 'admin'
      AND invite_accepted_at IS NOT NULL
  )
$$;

-- Properties: admin members can INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "admin_members_manage_properties" ON properties;
CREATE POLICY "admin_members_manage_properties" ON properties
  FOR ALL USING (is_org_admin(org_id));

-- Teams: admin members can manage
DROP POLICY IF EXISTS "admin_members_manage_teams" ON teams;
CREATE POLICY "admin_members_manage_teams" ON teams
  FOR ALL USING (is_org_admin(org_id));

-- Jobs: admin members can manage
DROP POLICY IF EXISTS "admin_members_manage_jobs" ON jobs;
CREATE POLICY "admin_members_manage_jobs" ON jobs
  FOR ALL USING (is_org_admin(org_id));

-- Inspections: admin members can manage
DROP POLICY IF EXISTS "admin_members_manage_inspections" ON inspections;
CREATE POLICY "admin_members_manage_inspections" ON inspections
  FOR ALL USING (is_org_admin(org_id));

-- team_members: admin can manage
DROP POLICY IF EXISTS "admin_members_manage_team_members" ON team_members;
CREATE POLICY "admin_members_manage_team_members" ON team_members
  FOR ALL USING (
    team_id IN (SELECT id FROM teams WHERE is_org_admin(org_id))
  );

-- packages: admin can manage
DROP POLICY IF EXISTS "admin_members_manage_packages" ON packages;
CREATE POLICY "admin_members_manage_packages" ON packages
  FOR ALL USING (is_org_admin(org_id));

-- package_items: admin can manage
DROP POLICY IF EXISTS "admin_members_manage_package_items" ON package_items;
CREATE POLICY "admin_members_manage_package_items" ON package_items
  FOR ALL USING (
    package_id IN (SELECT id FROM packages WHERE is_org_admin(org_id))
  );

-- checklist_items: admin can manage
DROP POLICY IF EXISTS "admin_members_manage_checklist_items" ON checklist_items;
CREATE POLICY "admin_members_manage_checklist_items" ON checklist_items
  FOR ALL USING (
    inspection_id IN (SELECT id FROM inspections WHERE is_org_admin(org_id))
  );

-- inspection_photos: admin can manage
DROP POLICY IF EXISTS "admin_members_manage_inspection_photos" ON inspection_photos;
CREATE POLICY "admin_members_manage_inspection_photos" ON inspection_photos
  FOR ALL USING (
    inspection_id IN (SELECT id FROM inspections WHERE is_org_admin(org_id))
  );
