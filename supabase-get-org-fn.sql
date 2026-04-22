-- SECURITY DEFINER runs as the function owner (bypasses RLS)
-- Allows invitees to fetch the org they belong to without circular RLS
CREATE OR REPLACE FUNCTION get_org_by_id(p_org_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT row_to_json(o) INTO result
  FROM organizations o
  WHERE o.id = p_org_id;
  RETURN result;
END;
$$;
