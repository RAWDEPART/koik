/*
  Relink Abhishek Saini attendance to the canonical employee user id.
  This fixes cases where seed used a different user row (e.g., 004 vs 0404 email variant).
*/

DO $$
DECLARE
  u_004 uuid;
  u_0404 uuid;
  u_emp uuid;
  u_final uuid;
BEGIN
  SELECT id INTO u_004 FROM users WHERE lower(email) = '004abhisheksaini@techmahindra.com' LIMIT 1;
  SELECT id INTO u_0404 FROM users WHERE lower(email) = '0404abhisheksaini@techmahindra.com' LIMIT 1;
  SELECT id INTO u_emp FROM users WHERE emp_id = 'TM-182006' LIMIT 1;

  -- prefer the 0404 email if exists, else 004, else emp_id row
  u_final := COALESCE(u_0404, u_004, u_emp);
  IF u_final IS NULL THEN
    RAISE NOTICE 'No employee row found to relink.';
    RETURN;
  END IF;

  -- Update any attendance rows pointing to the other ids
  UPDATE attendance
  SET user_id = u_final
  WHERE user_id <> u_final
    AND user_id IN (COALESCE(u_004, u_final), COALESCE(u_0404, u_final), COALESCE(u_emp, u_final));
END $$;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';


