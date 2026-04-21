-- Property entry notes
ALTER TABLE properties ADD COLUMN IF NOT EXISTS entry_notes text;

-- Booking confirmation tracking
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz;

-- Payment / invoice tracking
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS invoice_sent_at timestamptz;

-- Multi-user: org members table
CREATE TABLE IF NOT EXISTS org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  invite_token text UNIQUE,
  invite_accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS for org_members
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select" ON org_members
  FOR SELECT USING (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org_members_insert" ON org_members
  FOR INSERT WITH CHECK (
    org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );

CREATE POLICY "org_members_delete" ON org_members
  FOR DELETE USING (
    org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );

-- Allow org members to read organizations they belong to
CREATE POLICY "org_members_read_org" ON organizations
  FOR SELECT USING (
    owner_id = auth.uid()
    OR id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );
