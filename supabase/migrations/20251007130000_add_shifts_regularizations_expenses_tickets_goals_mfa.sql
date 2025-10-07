/* Advanced modules: shifts, regularizations, expenses, tickets, goals, MFA fields */

-- MFA fields and manager mapping (idempotent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret text;

-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  assigned_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shifts_user_date ON shifts(user_id, date);

-- Regularization requests (missed punch corrections)
CREATE TABLE IF NOT EXISTS regularizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES users(id),
  review_note text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_regularizations_user_date ON regularizations(user_id, date);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  category text,
  description text,
  receipt_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_user_status ON expenses(user_id, status);

-- Help desk tickets
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text,
  status text DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assignee_user_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- Goals / performance
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  status text DEFAULT 'active' CHECK (status IN ('active','paused','completed')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  reviewer_user_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status);

-- Enable RLS + permissive demo policies
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE regularizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view shifts" ON shifts;
CREATE POLICY "Public view shifts" ON shifts FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Public insert shifts" ON shifts;
CREATE POLICY "Public insert shifts" ON shifts FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Public delete shifts" ON shifts;
CREATE POLICY "Public delete shifts" ON shifts FOR DELETE TO public USING (true);

DROP POLICY IF EXISTS "Public view regularizations" ON regularizations;
CREATE POLICY "Public view regularizations" ON regularizations FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Public insert regularizations" ON regularizations;
CREATE POLICY "Public insert regularizations" ON regularizations FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Public update regularizations" ON regularizations;
CREATE POLICY "Public update regularizations" ON regularizations FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public view expenses" ON expenses;
CREATE POLICY "Public view expenses" ON expenses FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Public insert expenses" ON expenses;
CREATE POLICY "Public insert expenses" ON expenses FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Public update expenses" ON expenses;
CREATE POLICY "Public update expenses" ON expenses FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public view tickets" ON tickets;
CREATE POLICY "Public view tickets" ON tickets FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Public insert tickets" ON tickets;
CREATE POLICY "Public insert tickets" ON tickets FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Public update tickets" ON tickets;
CREATE POLICY "Public update tickets" ON tickets FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public view goals" ON goals;
CREATE POLICY "Public view goals" ON goals FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Public insert goals" ON goals;
CREATE POLICY "Public insert goals" ON goals FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Public update goals" ON goals;
CREATE POLICY "Public update goals" ON goals FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';


