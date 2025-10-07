/* Presence logs for live tracking and optional user verification flag */

-- Add verification flag (optional for future use)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT true;

-- Presence logs table
CREATE TABLE IF NOT EXISTS presence_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_at timestamptz DEFAULT now(),
  page text,
  user_agent text
);
CREATE INDEX IF NOT EXISTS idx_presence_logs_user_time ON presence_logs(user_id, logged_at DESC);

ALTER TABLE presence_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert presence" ON presence_logs;
CREATE POLICY "Public insert presence" ON presence_logs FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Public view presence" ON presence_logs;
CREATE POLICY "Public view presence" ON presence_logs FOR SELECT TO public USING (true);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';


