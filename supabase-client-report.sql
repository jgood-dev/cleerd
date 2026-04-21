ALTER TABLE inspections ADD COLUMN IF NOT EXISTS client_note text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS review_link text;
