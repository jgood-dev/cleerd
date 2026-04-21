-- Fix circular RLS dependency introduced by supabase-new-features.sql
-- The org_members_read_org policy on organizations queries org_members,
-- and org_members_select queries back into organizations — infinite loop.

-- Step 1: Drop the circular policy on organizations
DROP POLICY IF EXISTS "org_members_read_org" ON organizations;

-- Step 2: Fix org_members SELECT policy to not be circular.
-- Use user_id = auth.uid() (direct check, no cross-table reference)
-- OR owner lookup via organizations — which only uses the simple "org owner" policy (no org_members ref).
DROP POLICY IF EXISTS "org_members_select" ON org_members;

CREATE POLICY "org_members_select" ON org_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );

-- Step 3: Fix org_members INSERT — owners only
DROP POLICY IF EXISTS "org_members_insert" ON org_members;

CREATE POLICY "org_members_insert" ON org_members
  FOR INSERT WITH CHECK (
    org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );

-- Step 4: Fix org_members DELETE — owners only
DROP POLICY IF EXISTS "org_members_delete" ON org_members;

CREATE POLICY "org_members_delete" ON org_members
  FOR DELETE USING (
    org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );

-- Step 5: Allow org members to UPDATE their own invite record (to accept invite)
DROP POLICY IF EXISTS "org_members_update" ON org_members;

CREATE POLICY "org_members_update" ON org_members
  FOR UPDATE USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (true);

-- Note: org members reading the organizations table is handled in app code
-- via getOrgForUser — no extra organizations policy needed for now.
