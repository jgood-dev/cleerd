-- Add package_id to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES packages(id) ON DELETE SET NULL;
