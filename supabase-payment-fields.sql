ALTER TABLE packages ADD COLUMN IF NOT EXISTS base_price numeric(10,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS price numeric(10,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS payment_method text;
