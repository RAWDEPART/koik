/* Holidays, Leave Balances, and Documents */

-- Holidays table
CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  date date NOT NULL,
  name text NOT NULL,
  type text DEFAULT 'public',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);

-- Leave balances per user
CREATE TABLE IF NOT EXISTS leave_balances (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  casual numeric(5,2) DEFAULT 0,
  sick numeric(5,2) DEFAULT 0,
  earned numeric(5,2) DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_user_id ON leave_balances(user_id);

-- Documents repository
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  category text,
  file_url text NOT NULL,
  visible_to text DEFAULT 'all' CHECK (visible_to IN ('all','employee','admin')),
  uploaded_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_visibility ON documents(visible_to);

-- Enable RLS and permissive policies for demo
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view holidays" ON holidays;
CREATE POLICY "Public view holidays" ON holidays FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Public insert holidays" ON holidays;
CREATE POLICY "Public insert holidays" ON holidays FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public view leave_balances" ON leave_balances;
CREATE POLICY "Public view leave_balances" ON leave_balances FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Public upsert leave_balances" ON leave_balances;
CREATE POLICY "Public upsert leave_balances" ON leave_balances FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Public update leave_balances" ON leave_balances;
CREATE POLICY "Public update leave_balances" ON leave_balances FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public view documents" ON documents;
CREATE POLICY "Public view documents" ON documents FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Public insert documents" ON documents;
CREATE POLICY "Public insert documents" ON documents FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Public delete documents" ON documents;
CREATE POLICY "Public delete documents" ON documents FOR DELETE TO public USING (true);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';


