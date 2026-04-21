-- Package duration settings
ALTER TABLE packages ADD COLUMN IF NOT EXISTS base_duration_minutes int DEFAULT 120;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS size_multipliers jsonb DEFAULT '{"small": 0.75, "medium": 1.0, "large": 1.5, "xl": 2.0}'::jsonb;

-- Property size
ALTER TABLE properties ADD COLUMN IF NOT EXISTS size text DEFAULT 'medium';

-- Job duration (computed or manual override)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS duration_minutes int;
