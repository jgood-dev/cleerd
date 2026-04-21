-- Store the finalized checklist items on the job
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS custom_items jsonb;
