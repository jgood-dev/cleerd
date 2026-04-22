-- Add name and phone to org_members so invitees can identify themselves on join
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS phone text;
