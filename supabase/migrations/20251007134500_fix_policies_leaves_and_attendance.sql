/* Fix RLS policies so admin actions (approve/reject) work without Supabase Auth */

-- Enable RLS (safe)
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Leaves: allow public select/insert/update (demo/dev). Drop old restrictive ones if present.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update leaves' AND tablename = 'leaves') THEN
    DROP POLICY "Admins can update leaves" ON leaves;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own leaves' AND tablename = 'leaves') THEN
    DROP POLICY "Users can view own leaves" ON leaves;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all leaves' AND tablename = 'leaves') THEN
    DROP POLICY "Admins can view all leaves" ON leaves;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own leaves' AND tablename = 'leaves') THEN
    DROP POLICY "Users can insert own leaves" ON leaves;
  END IF;
END $$;

DROP POLICY IF EXISTS "Public view leaves" ON leaves;
CREATE POLICY "Public view leaves" ON leaves FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Public insert leaves" ON leaves;
CREATE POLICY "Public insert leaves" ON leaves FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Public update leaves" ON leaves;
CREATE POLICY "Public update leaves" ON leaves FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Attendance (admin corrections)
DROP POLICY IF EXISTS "Public view attendance" ON attendance;
CREATE POLICY "Public view attendance" ON attendance FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Public insert attendance" ON attendance;
CREATE POLICY "Public insert attendance" ON attendance FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Public update attendance" ON attendance;
CREATE POLICY "Public update attendance" ON attendance FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Notifications / Audit logs insert
DROP POLICY IF EXISTS "Public insert notifications" ON notifications;
CREATE POLICY "Public insert notifications" ON notifications FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Public insert audit logs" ON audit_logs;
CREATE POLICY "Public insert audit logs" ON audit_logs FOR INSERT TO public WITH CHECK (true);

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';


