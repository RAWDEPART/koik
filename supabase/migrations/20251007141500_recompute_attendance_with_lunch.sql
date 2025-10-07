/*
  Recompute attendance for Abhishek from 2025-09-16 to today
  - Check-in 09:15, Check-out 15:55
  - Fixed lunch break 12:35–13:25 (50 minutes) deducted from total_hours
  - Skip Saturdays/Sundays
  - 2025-10-02 set to onLeave (Gandhi Jayanti)
  - Do NOT change rows already marked absent
  - Upsert others to 'present' with the fixed times/hours
*/

DO $$
DECLARE
  v_user uuid;
  d date := date '2025-09-16';
  last date := CURRENT_DATE;
  dow int;
  cin timestamptz;
  cout timestamptz;
  lunch_start timestamptz;
  lunch_end timestamptz;
  hours numeric(5,2);
  existing_status text;
BEGIN
  SELECT id INTO v_user
  FROM users
  WHERE lower(email) IN ('0404abhisheksaini@techmahindra.com','004abhisheksaini@techmahindra.com')
     OR emp_id = 'TM-182006'
  ORDER BY email
  LIMIT 1;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;

  WHILE d <= last LOOP
    dow := EXTRACT(DOW FROM d);

    -- Gandhi Jayanti
    IF d = date '2025-10-02' THEN
      INSERT INTO attendance (user_id, date, status, total_hours, source)
      VALUES (v_user, d, 'onLeave', 0, 'recompute')
      ON CONFLICT (user_id, date) DO UPDATE SET status='onLeave', total_hours=0, source='recompute', updated_at=now();
      d := d + interval '1 day';
      CONTINUE;
    END IF;

    -- Skip weekends
    IF dow IN (0,6) THEN
      d := d + interval '1 day';
      CONTINUE;
    END IF;

    -- Respect existing absences
    SELECT status INTO existing_status FROM attendance WHERE user_id=v_user AND date=d;
    IF existing_status = 'absent' THEN
      d := d + interval '1 day';
      CONTINUE;
    END IF;

    cin := d::timestamptz + time '09:15';
    cout := d::timestamptz + time '15:55';
    lunch_start := d::timestamptz + time '12:35';
    lunch_end := d::timestamptz + time '13:25';
    hours := ROUND(((EXTRACT(EPOCH FROM (cout - cin)) - EXTRACT(EPOCH FROM (lunch_end - lunch_start))) / 3600.0)::numeric, 2);

    INSERT INTO attendance (user_id, date, check_in_time, check_out_time, status, total_hours, source)
    VALUES (v_user, d, cin, cout, 'present', hours, 'recompute')
    ON CONFLICT (user_id, date)
    DO UPDATE SET check_in_time=EXCLUDED.check_in_time,
                  check_out_time=EXCLUDED.check_out_time,
                  status=CASE WHEN attendance.status='absent' THEN attendance.status ELSE EXCLUDED.status END,
                  total_hours=CASE WHEN attendance.status='absent' THEN attendance.total_hours ELSE EXCLUDED.total_hours END,
                  source='recompute',
                  updated_at=now();

    d := d + interval '1 day';
  END LOOP;
END $$;

-- Ensure holiday also in holidays table (optional)
INSERT INTO holidays (date, name, type)
VALUES (date '2025-10-02', 'Gandhi Jayanti', 'public')
ON CONFLICT (date) DO NOTHING;

-- Refresh PostgREST
NOTIFY pgrst, 'reload schema';


