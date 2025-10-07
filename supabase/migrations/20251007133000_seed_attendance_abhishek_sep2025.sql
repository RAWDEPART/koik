/*
  Seed attendance for Abhishek Saini (Sep 16–30, 2025)
  - Workdays: present, 09:15 to 15:55 (total_hours computed)
  - Weekends (Sat/Sun): onLeave
  - Absent on: 2025-09-18, 2025-09-24, 2025-09-25, 2025-09-26
  Idempotent upsert on (user_id, date)
*/

DO $$
DECLARE
  v_user uuid;
  d date := date '2025-09-16';
  last date := date '2025-09-30';
  is_weekend boolean;
  is_absent boolean;
  cin timestamptz;
  cout timestamptz;
  hours numeric(4,2);
BEGIN
  SELECT id INTO v_user
  FROM users
  WHERE lower(email) IN ('004abhisheksaini@techmahindra.com','0404abhisheksaini@techmahindra.com')
     OR emp_id = 'TM-182006'
  ORDER BY CASE WHEN lower(email) = '004abhisheksaini@techmahindra.com' THEN 1 ELSE 2 END
  LIMIT 1;

  IF v_user IS NULL THEN
    RAISE NOTICE 'Employee not found; seeding a placeholder employee row.';
    INSERT INTO users (email, password_hash, name, role, emp_id, department, is_active)
    VALUES ('004abhisheksaini@techmahindra.com', '$2b$10$z0f.Di5.WhFjbn23XGP3pOrZ2L3oZ44jrW3QGY9bSxbySAx9k.Qui', 'Abhishek Saini', 'employee', 'TM-182006', 'Engineering', true)
    ON CONFLICT (email) DO UPDATE SET is_active = true
    RETURNING id INTO v_user;
  END IF;

  WHILE d <= last LOOP
    -- 0=Sunday, 6=Saturday
    is_weekend := (EXTRACT(DOW FROM d) IN (0,6));
    is_absent := (d IN (date '2025-09-18', date '2025-09-24', date '2025-09-25', date '2025-09-26'));

    IF is_absent THEN
      INSERT INTO attendance (user_id, date, status, total_hours, source)
      VALUES (v_user, d, 'absent', 0, 'seed')
      ON CONFLICT (user_id, date) DO UPDATE SET status = EXCLUDED.status, total_hours = EXCLUDED.total_hours, source = 'seed', updated_at = now();
    ELSIF is_weekend THEN
      INSERT INTO attendance (user_id, date, status, total_hours, source)
      VALUES (v_user, d, 'onLeave', 0, 'seed')
      ON CONFLICT (user_id, date) DO UPDATE SET status = EXCLUDED.status, total_hours = EXCLUDED.total_hours, source = 'seed', updated_at = now();
    ELSE
      cin := d::timestamptz + time '09:15';
      cout := d::timestamptz + time '15:55';
      hours := EXTRACT(EPOCH FROM (cout - cin)) / 3600.0;
      INSERT INTO attendance (user_id, date, check_in_time, check_out_time, status, total_hours, source)
      VALUES (v_user, d, cin, cout, 'present', ROUND(hours::numeric, 2), 'seed')
      ON CONFLICT (user_id, date) DO UPDATE SET check_in_time = EXCLUDED.check_in_time, check_out_time = EXCLUDED.check_out_time, status = EXCLUDED.status, total_hours = EXCLUDED.total_hours, source = 'seed', updated_at = now();
    END IF;

    d := d + interval '1 day';
  END LOOP;
END$$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';


