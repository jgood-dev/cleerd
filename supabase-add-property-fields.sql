-- Add owner_name and phone to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_name text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS phone text;
