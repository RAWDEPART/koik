/* Announcements (admin → all) and Employee Documents (verification) */

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  message text NOT NULL,
  published_at timestamptz DEFAULT now(),
  published_by uuid REFERENCES users(id)
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS announcements_public_select ON announcements;
CREATE POLICY announcements_public_select ON announcements FOR SELECT USING (true);
DROP POLICY IF EXISTS announcements_admin_insert ON announcements;
CREATE POLICY announcements_admin_insert ON announcements FOR INSERT WITH CHECK (
  (SELECT role='admin' FROM users u WHERE u.id = auth.uid())
);

-- Employee Documents for verification
CREATE TABLE IF NOT EXISTS employee_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('PAN','AADHAAR','MARKSHEET','OFFER_LETTER','OTHER')),
  file_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  remarks text,
  uploaded_at timestamptz DEFAULT now(),
  reviewed_by uuid REFERENCES users(id)
);

ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS emp_docs_owner_select ON employee_documents;
CREATE POLICY emp_docs_owner_select ON employee_documents FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS emp_docs_owner_insert ON employee_documents;
CREATE POLICY emp_docs_owner_insert ON employee_documents FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS emp_docs_admin_update ON employee_documents;
CREATE POLICY emp_docs_admin_update ON employee_documents FOR UPDATE USING (
  (SELECT role='admin' FROM users u WHERE u.id = auth.uid())
) WITH CHECK (true);

-- Reload
NOTIFY pgrst, 'reload schema';


