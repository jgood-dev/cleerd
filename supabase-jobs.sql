-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'done')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their org jobs" ON jobs;
CREATE POLICY "Users manage their org jobs" ON jobs
  FOR ALL USING (org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));

-- Link inspections to jobs
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES jobs(id) ON DELETE SET NULL;
