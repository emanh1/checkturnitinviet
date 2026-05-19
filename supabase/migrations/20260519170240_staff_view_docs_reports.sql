CREATE POLICY "Employees and admins view all documents"
ON documents
FOR SELECT
USING (
  is_employee()
  OR is_admin()
);

CREATE POLICY "Employees and admins view reports"
ON reports
FOR SELECT
USING (
  is_employee()
  OR is_admin()
);