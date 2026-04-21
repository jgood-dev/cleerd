-- Run this ONCE in Supabase SQL Editor to fix your existing account.
-- Replace the email below with the one you signed up with.

INSERT INTO organizations (name, owner_id, plan)
SELECT
  COALESCE(raw_user_meta_data->>'business_name', 'My Business'),
  id,
  'solo'
FROM auth.users
WHERE email = 'goodwinj47@gmail.com'
  AND id NOT IN (SELECT owner_id FROM organizations);
