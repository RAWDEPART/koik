/* Seed attendance for Oct 1 to current date for Abhishek (exclude Sat/Sun). */

DO $$
DECLARE
  v_user uuid;
  d date := date '2025-10-01';
  last date := CURRENT_DATE;
  dow int;
  cin timestamptz;
  cout timestamptz;
  hours numeric(4,2);
BEGIN
  SELECT id INTO v_user FROM users WHERE lower(email) IN ('0404abhisheksaini@techmahindra.com','004abhisheksaini@techmahindra.com') OR emp_id='TM-182006' ORDER BY email LIMIT 1;
  IF v_user IS NULL THEN RAISE NOTICE 'Employee not found'; RETURN; END IF;

  WHILE d <= last LOOP
    dow := EXTRACT(DOW FROM d);
    IF dow NOT IN (0,6) THEN -- Mon-Fri
      cin := d::timestamptz + time '09:15';
      cout := d::timestamptz + time '15:55';
      hours := EXTRACT(EPOCH FROM (cout - cin))/3600.0;
      INSERT INTO attendance (user_id, date, check_in_time, check_out_time, status, total_hours, source)
      VALUES (v_user, d, cin, cout, 'present', ROUND(hours::numeric,2), 'seed')
      ON CONFLICT (user_id, date) DO UPDATE SET check_in_time=EXCLUDED.check_in_time, check_out_time=EXCLUDED.check_out_time, status=EXCLUDED.status, total_hours=EXCLUDED.total_hours, source='seed', updated_at=now();
    END IF;
    d := d + interval '1 day';
  END LOOP;
END $$;

-- Refresh PostgREST
NOTIFY pgrst, 'reload schema';


