/* Force times to 09:15–15:55 with 50m lunch (12:35–13:25) for Sep 16 .. today */

-- Ensure unique indexes exist for UPSERT logic
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_user_date_unique ON attendance(user_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_holidays_date_unique ON holidays(date);

DO $$
DECLARE
  v_user uuid;
BEGIN
  SELECT id INTO v_user
  FROM users
  WHERE lower(email) IN ('0404abhisheksaini@techmahindra.com','004abhisheksaini@techmahindra.com')
     OR emp_id='TM-182006'
  ORDER BY email
  LIMIT 1;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;

  -- Holiday row for Gandhi Jayanti (already past, do not show in upcoming fetch now)
  INSERT INTO holidays(date, name, type)
  VALUES (date '2025-10-02', 'Gandhi Jayanti', 'public')
  ON CONFLICT (date) DO NOTHING;

  -- Build payload for all weekdays excluding Gandhi Jayanti
  WITH days AS (
    SELECT gs::date AS d
    FROM generate_series(date '2025-09-16', CURRENT_DATE, interval '1 day') gs
    WHERE EXTRACT(DOW FROM gs) NOT IN (0,6) AND gs::date <> date '2025-10-02'
  ),
  payload AS (
    SELECT
      v_user AS user_id,
      d AS date,
      (d::timestamptz + time '09:15') AS check_in_time,
      (d::timestamptz + time '15:55') AS check_out_time,
      'present'::text AS status,
      ROUND(((EXTRACT(EPOCH FROM ((d::timestamptz + time '15:55') - (d::timestamptz + time '09:15'))) -
              EXTRACT(EPOCH FROM ((d::timestamptz + time '13:25') - (d::timestamptz + time '12:35')))) / 3600.0)::numeric, 2) AS total_hours,
      'fix-times'::text AS source
    FROM days
  )
  INSERT INTO attendance (user_id, date, check_in_time, check_out_time, status, total_hours, source)
  SELECT * FROM payload
  ON CONFLICT (user_id, date) DO UPDATE
    SET check_in_time = EXCLUDED.check_in_time,
        check_out_time= EXCLUDED.check_out_time,
        status       = CASE WHEN attendance.status = 'absent' THEN attendance.status ELSE EXCLUDED.status END,
        total_hours  = CASE WHEN attendance.status = 'absent' THEN attendance.total_hours ELSE EXCLUDED.total_hours END,
        source       = 'fix-times',
        updated_at   = now();

  -- Ensure Gandhi Jayanti is onLeave
  INSERT INTO attendance (user_id, date, status, total_hours, source)
  VALUES (v_user, date '2025-10-02', 'onLeave', 0, 'fix-times')
  ON CONFLICT (user_id, date) DO UPDATE
    SET status='onLeave', total_hours=0, source='fix-times', updated_at=now();
END $$;

-- Reload
NOTIFY pgrst, 'reload schema';


