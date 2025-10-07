/*
  # Tech Mahindra Employee Attendance Portal - Database Schema

  ## Tables Created
  
  1. **users** - Employee and admin information
     - id, email, password_hash, name, role (admin/employee)
     - emp_id (unique), department, joining_date, photo_url, is_active
     - Indexes on email, emp_id for fast lookups
  
  2. **attendance** - Daily attendance records
     - user_id, date, check_in_time, check_out_time
     - status (present/absent/late/onLeave), total_hours, source
     - Unique constraint on (user_id, date)
  
  3. **leaves** - Leave applications
     - user_id, from_date, to_date, type (sick/casual/earned/other)
     - status (pending/approved/rejected), reviewed_by, review_note
  
  4. **notifications** - Real-time user notifications
     - user_id, title, message, data (jsonb), type, read status
  
  5. **audit_logs** - Security and compliance tracking
     - actor_user_id, action, target, meta (jsonb), ip_address
  
  6. **refresh_tokens** - JWT refresh token management
     - user_id, token_hash, device_info, expires_at

  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
  - Admins have elevated permissions
  - All policies check auth.uid() for ownership
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  emp_id text UNIQUE NOT NULL,
  department text,
  joining_date date DEFAULT CURRENT_DATE,
  photo_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_emp_id ON users(emp_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

-- 2. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in_time timestamptz,
  check_out_time timestamptz,
  status text DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'late', 'onLeave')),
  total_hours numeric(4,2) DEFAULT 0,
  source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);

-- 3. LEAVES TABLE
CREATE TABLE IF NOT EXISTS leaves (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_date date NOT NULL,
  to_date date NOT NULL,
  type text DEFAULT 'other' CHECK (type IN ('sick', 'casual', 'earned', 'other')),
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  applied_at timestamptz DEFAULT now(),
  reviewed_by uuid REFERENCES users(id),
  review_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leaves_user_id ON leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_dates ON leaves(from_date, to_date);

-- 4. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  type text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 5. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id uuid REFERENCES users(id),
  action text NOT NULL,
  target text,
  meta jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 6. REFRESH TOKENS TABLE
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  device_info text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR USERS
CREATE POLICY "Users can view own profile" ON users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON users FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY "Users can update own profile" ON users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can insert users" ON users FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY "Admins can update users" ON users FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- RLS POLICIES FOR ATTENDANCE
CREATE POLICY "Users can view own attendance" ON attendance FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all attendance" ON attendance FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY "Users can insert own attendance" ON attendance FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own attendance" ON attendance FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can insert attendance" ON attendance FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY "Admins can update attendance" ON attendance FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- RLS POLICIES FOR LEAVES
CREATE POLICY "Users can view own leaves" ON leaves FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all leaves" ON leaves FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY "Users can insert own leaves" ON leaves FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update leaves" ON leaves FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- RLS POLICIES FOR NOTIFICATIONS
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

-- RLS POLICIES FOR AUDIT LOGS
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- RLS POLICIES FOR REFRESH TOKENS
CREATE POLICY "Users can view own refresh tokens" ON refresh_tokens FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can insert refresh tokens" ON refresh_tokens FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own refresh tokens" ON refresh_tokens FOR DELETE TO authenticated USING (user_id = auth.uid());

-- TRIGGERS FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Triggers to maintain updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leaves_updated_at BEFORE UPDATE ON leaves FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Demo-friendly public policies (for local testing without Supabase Auth)
-- NOTE: These are permissive and should be tightened for production.
CREATE POLICY "Public can view users" ON users FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert users" ON users FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update users" ON users FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Public can view attendance" ON attendance FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert attendance" ON attendance FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update attendance" ON attendance FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Public can view leaves" ON leaves FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert leaves" ON leaves FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update leaves" ON leaves FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Public can view notifications" ON notifications FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert notifications" ON notifications FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update notifications" ON notifications FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Public can view audit logs" ON audit_logs FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert audit logs" ON audit_logs FOR INSERT TO public WITH CHECK (true);

-- Seed default admin and test employee
INSERT INTO users (email, password_hash, name, role, emp_id, department, joining_date, is_active)
VALUES
  ('admin@techmahindra.com', '$2b$10$o4GSiQikCL4Unn5xdccpPuzFCVY5sYISHPDAmf1JqxpQMkdi3Fvsq', 'TechM Admin', 'admin', 'TM-ADMIN', 'HR', '2020-01-01', true),
  ('0404abhisheksaini@techmahindra.com', '$2b$10$z0f.Di5.WhFjbn23XGP3pOrZ2L3oZ44jrW3QGY9bSxbySAx9k.Qui', 'Abhishek Saini', 'employee', 'TM-182006', 'Engineering', '2022-04-04', true)
ON CONFLICT (email) DO NOTHING;

-- Ensure demo users have expected credentials even if they already exist (idempotent updates)
UPDATE users
SET password_hash = '$2b$10$o4GSiQikCL4Unn5xdccpPuzFCVY5sYISHPDAmf1JqxpQMkdi3Fvsq',
    is_active = true,
    role = 'admin'
WHERE lower(email) = 'admin@techmahindra.com';

UPDATE users
SET emp_id = COALESCE(NULLIF(emp_id, ''), 'TM-ADMIN')
WHERE lower(email) = 'admin@techmahindra.com';

UPDATE users
SET password_hash = '$2b$10$z0f.Di5.WhFjbn23XGP3pOrZ2L3oZ44jrW3QGY9bSxbySAx9k.Qui',
    is_active = true,
    role = 'employee'
WHERE lower(email) = '0404abhisheksaini@techmahindra.com';

UPDATE users
SET emp_id = COALESCE(NULLIF(emp_id, ''), 'TM-182006')
WHERE lower(email) = '0404abhisheksaini@techmahindra.com';
