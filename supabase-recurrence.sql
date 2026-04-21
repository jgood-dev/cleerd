-- Recurrence on jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS recurrence text; -- 'weekly' | 'biweekly' | 'monthly' | null
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid references jobs(id) on delete set null;

-- Reminder tracking
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

-- Org-level reminder lead time
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS reminder_lead_hours int DEFAULT 48;
