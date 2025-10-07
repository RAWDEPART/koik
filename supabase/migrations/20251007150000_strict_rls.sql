/* Strict RLS policies replacing permissive demo policies */

-- Helper: check admin by users.role
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS(SELECT 1 FROM users WHERE id = uid AND role = 'admin' AND is_active = true);
$$;

-- USERS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Drop permissive policies
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users') THEN
    EXECUTE string_agg(format('DROP POLICY IF EXISTS %I ON users;', policyname), ' ') FROM pg_policies WHERE tablename='users';
  END IF;
END $$;
-- Owner can select/update self
CREATE POLICY users_owner_select ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY users_owner_update ON users FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
-- Admins full access
CREATE POLICY users_admin_select ON users FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY users_admin_insert ON users FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY users_admin_update ON users FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- ATTENDANCE
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='attendance') THEN
    EXECUTE string_agg(format('DROP POLICY IF EXISTS %I ON attendance;', policyname), ' ') FROM pg_policies WHERE tablename='attendance';
  END IF;
END $$;
CREATE POLICY attendance_owner_select ON attendance FOR SELECT USING (user_id = auth.uid());
CREATE POLICY attendance_owner_modify ON attendance FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY attendance_owner_update ON attendance FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY attendance_admin_select ON attendance FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY attendance_admin_modify ON attendance FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY attendance_admin_update ON attendance FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- LEAVES
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leaves') THEN
    EXECUTE string_agg(format('DROP POLICY IF EXISTS %I ON leaves;', policyname), ' ') FROM pg_policies WHERE tablename='leaves';
  END IF;
END $$;
CREATE POLICY leaves_owner_select ON leaves FOR SELECT USING (user_id = auth.uid());
CREATE POLICY leaves_owner_insert ON leaves FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY leaves_admin_select ON leaves FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY leaves_admin_update ON leaves FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (true);

-- NOTIFICATIONS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications') THEN
    EXECUTE string_agg(format('DROP POLICY IF EXISTS %I ON notifications;', policyname), ' ') FROM pg_policies WHERE tablename='notifications';
  END IF;
END $$;
CREATE POLICY notifications_owner_select ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notifications_owner_update ON notifications FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY notifications_admin_insert ON notifications FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- EXPENSES
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='expenses') THEN
    EXECUTE string_agg(format('DROP POLICY IF EXISTS %I ON expenses;', policyname), ' ') FROM pg_policies WHERE tablename='expenses';
  END IF;
END $$;
CREATE POLICY expenses_owner_select ON expenses FOR SELECT USING (user_id = auth.uid());
CREATE POLICY expenses_owner_insert ON expenses FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY expenses_admin_update ON expenses FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (true);
CREATE POLICY expenses_admin_select ON expenses FOR SELECT USING (is_admin(auth.uid()));

-- SHIFTS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='shifts') THEN
    EXECUTE string_agg(format('DROP POLICY IF EXISTS %I ON shifts;', policyname), ' ') FROM pg_policies WHERE tablename='shifts';
  END IF;
END $$;
CREATE POLICY shifts_owner_select ON shifts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY shifts_admin_insert ON shifts FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY shifts_admin_update ON shifts FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (true);
CREATE POLICY shifts_admin_select ON shifts FOR SELECT USING (is_admin(auth.uid()));

-- REGULARIZATIONS
ALTER TABLE regularizations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='regularizations') THEN
    EXECUTE string_agg(format('DROP POLICY IF EXISTS %I ON regularizations;', policyname), ' ') FROM pg_policies WHERE tablename='regularizations';
  END IF;
END $$;
CREATE POLICY regs_owner_select ON regularizations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY regs_owner_insert ON regularizations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY regs_admin_update ON regularizations FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (true);
CREATE POLICY regs_admin_select ON regularizations FOR SELECT USING (is_admin(auth.uid()));

-- TICKETS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tickets') THEN
    EXECUTE string_agg(format('DROP POLICY IF EXISTS %I ON tickets;', policyname), ' ') FROM pg_policies WHERE tablename='tickets';
  END IF;
END $$;
CREATE POLICY tickets_owner_select ON tickets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY tickets_owner_insert ON tickets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY tickets_admin_update ON tickets FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (true);
CREATE POLICY tickets_admin_select ON tickets FOR SELECT USING (is_admin(auth.uid()));

-- AUDIT LOGS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs') THEN
    EXECUTE string_agg(format('DROP POLICY IF EXISTS %I ON audit_logs;', policyname), ' ') FROM pg_policies WHERE tablename='audit_logs';
  END IF;
END $$;
CREATE POLICY audit_logs_admin_select ON audit_logs FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY audit_logs_admin_insert ON audit_logs FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- presence_logs (allow insert by any authenticated user for heartbeat, admin select)
ALTER TABLE presence_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='presence_logs') THEN
    EXECUTE string_agg(format('DROP POLICY IF EXISTS %I ON presence_logs;', policyname), ' ') FROM pg_policies WHERE tablename='presence_logs';
  END IF;
END $$;
CREATE POLICY presence_insert ON presence_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY presence_admin_select ON presence_logs FOR SELECT USING (is_admin(auth.uid()));

-- Reload PostgREST
NOTIFY pgrst, 'reload schema';


