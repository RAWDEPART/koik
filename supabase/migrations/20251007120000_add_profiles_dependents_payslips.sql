/*
  Add profile fields to users, dependents table, and payslips table
  NOTE: Policies are permissive for demo/local usage; tighten for production.
*/

-- 1) Extend users table with profile fields (idempotent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_phone text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_number text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_ifsc text;

-- 2) Dependents table
CREATE TABLE IF NOT EXISTS dependents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  relation text NOT NULL,
  dob date,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dependents_user_id ON dependents(user_id);

-- 3) Payslips table
CREATE TABLE IF NOT EXISTS payslips (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  gross numeric(12,2) NOT NULL DEFAULT 0,
  deductions jsonb,
  net numeric(12,2) NOT NULL DEFAULT 0,
  file_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payslips_user_id ON payslips(user_id);
CREATE INDEX IF NOT EXISTS idx_payslips_period ON payslips(period_start, period_end);

-- Permissive RLS policies for demo
ALTER TABLE dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view dependents" ON dependents;
CREATE POLICY "Public view dependents" ON dependents FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Public insert dependents" ON dependents;
CREATE POLICY "Public insert dependents" ON dependents FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Public delete dependents" ON dependents;
CREATE POLICY "Public delete dependents" ON dependents FOR DELETE TO public USING (true);

DROP POLICY IF EXISTS "Public view payslips" ON payslips;
CREATE POLICY "Public view payslips" ON payslips FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Public insert payslips" ON payslips;
CREATE POLICY "Public insert payslips" ON payslips FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Public delete payslips" ON payslips;
CREATE POLICY "Public delete payslips" ON payslips FOR DELETE TO public USING (true);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';


