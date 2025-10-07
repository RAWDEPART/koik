/* Views for realtime-style analytics */

-- Average in/out time per day
CREATE OR REPLACE VIEW daily_average_in_out AS
SELECT
  date,
  to_char((timestamp 'epoch' + (avg(EXTRACT(EPOCH FROM check_in_time::time)) * interval '1 second')), 'HH24:MI') AS avg_in_time,
  to_char((timestamp 'epoch' + (avg(EXTRACT(EPOCH FROM check_out_time::time)) * interval '1 second')), 'HH24:MI') AS avg_out_time,
  count(*) AS records
FROM attendance
WHERE check_in_time IS NOT NULL AND check_out_time IS NOT NULL
GROUP BY date
ORDER BY date DESC;

-- Users online now: last 3 minutes heartbeat
CREATE OR REPLACE VIEW online_users_now AS
SELECT user_id, max(logged_at) AS last_seen
FROM presence_logs
WHERE logged_at >= now() - interval '3 minutes'
GROUP BY user_id;

-- Today's in-time buckets
CREATE OR REPLACE VIEW today_in_time_buckets AS
WITH base AS (
  SELECT check_in_time::time AS t
  FROM attendance
  WHERE date = CURRENT_DATE AND check_in_time IS NOT NULL
)
SELECT
  sum(CASE WHEN t <  time '09:00' THEN 1 ELSE 0 END) AS before_9,
  sum(CASE WHEN t >= time '09:00' AND t < time '09:30' THEN 1 ELSE 0 END) AS between_9_930,
  sum(CASE WHEN t >= time '09:30' AND t < time '10:00' THEN 1 ELSE 0 END) AS between_930_10,
  sum(CASE WHEN t >= time '10:00' AND t < time '11:00' THEN 1 ELSE 0 END) AS between_10_11,
  sum(CASE WHEN t >= time '11:00' THEN 1 ELSE 0 END) AS after_11
FROM base;

-- Reload cache
NOTIFY pgrst, 'reload schema';


