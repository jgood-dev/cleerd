-- Checklist packages
CREATE TABLE packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid REFERENCES packages(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Optional default package per property
ALTER TABLE properties ADD COLUMN IF NOT EXISTS default_package_id uuid REFERENCES packages(id) ON DELETE SET NULL;

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packages org owner" ON packages FOR ALL USING (
  org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
);

CREATE POLICY "package_items org owner" ON package_items FOR ALL USING (
  package_id IN (
    SELECT p.id FROM packages p
    JOIN organizations o ON o.id = p.org_id
    WHERE o.owner_id = auth.uid()
  )
);

-- Seed three starter packages for existing orgs
-- (replace the org_id below with your actual org id after running, or skip and create via UI)
