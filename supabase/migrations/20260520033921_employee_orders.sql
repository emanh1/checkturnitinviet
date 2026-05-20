CREATE POLICY "Employees can view all orders"
ON orders
FOR SELECT
USING (
  is_employee()
);

CREATE POLICY "Employees can update assigned orders"
ON orders
FOR UPDATE
USING (
  is_employee()
);

CREATE POLICY "Employees create reports"
ON reports
FOR INSERT
WITH CHECK (
  is_employee() OR is_admin()
);

CREATE POLICY "Employees view reports"
ON reports
FOR SELECT
USING (
  is_employee() OR is_admin()
);

CREATE POLICY "Employees can view profiles"
ON profiles
FOR SELECT
USING (
  is_employee()
);

GRANT INSERT ON public.reports TO authenticated;