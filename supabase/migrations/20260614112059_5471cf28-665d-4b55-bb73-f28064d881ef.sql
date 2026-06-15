-- Leave status enum
DO $$ BEGIN
  CREATE TYPE public.leave_status AS ENUM ('pending','approved','rejected','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helper: current user's employee row id (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.current_employee_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;

-- 1) attendance_logs
CREATE TABLE public.attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX attendance_logs_employee_day_idx ON public.attendance_logs (employee_id, clock_in DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_logs TO authenticated;
GRANT ALL ON public.attendance_logs TO service_role;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY attendance_select ON public.attendance_logs FOR SELECT TO authenticated
  USING (
    employee_id = public.current_employee_id()
    OR has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'manager'::app_role)
  );
CREATE POLICY attendance_insert_self ON public.attendance_logs FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.current_employee_id());
CREATE POLICY attendance_update_self_or_admin ON public.attendance_logs FOR UPDATE TO authenticated
  USING (
    employee_id = public.current_employee_id()
    OR has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'manager'::app_role)
  )
  WITH CHECK (
    employee_id = public.current_employee_id()
    OR has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'manager'::app_role)
  );
CREATE POLICY attendance_delete_admin ON public.attendance_logs FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER attendance_logs_set_updated_at
  BEFORE UPDATE ON public.attendance_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) leave_types
CREATE TABLE public.leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#0ea5e9',
  default_days numeric(5,1) NOT NULL DEFAULT 0,
  is_paid boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.leave_types TO authenticated;
GRANT ALL ON public.leave_types TO service_role;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY leave_types_read ON public.leave_types FOR SELECT TO authenticated USING (true);
CREATE POLICY leave_types_admin_write ON public.leave_types FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 3) leave_balances
CREATE TABLE public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  year int NOT NULL,
  allocated numeric(5,1) NOT NULL DEFAULT 0,
  used numeric(5,1) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, leave_type_id, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_balances TO authenticated;
GRANT ALL ON public.leave_balances TO service_role;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY leave_balances_select ON public.leave_balances FOR SELECT TO authenticated
  USING (
    employee_id = public.current_employee_id()
    OR has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'manager'::app_role)
  );
CREATE POLICY leave_balances_admin_write ON public.leave_balances FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER leave_balances_set_updated_at
  BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) leave_requests
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days numeric(5,1) NOT NULL,
  reason text,
  status public.leave_status NOT NULL DEFAULT 'pending',
  approver_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  CHECK (days > 0)
);
CREATE INDEX leave_requests_employee_idx ON public.leave_requests (employee_id, start_date DESC);
CREATE INDEX leave_requests_status_idx ON public.leave_requests (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_requests TO authenticated;
GRANT ALL ON public.leave_requests TO service_role;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY leave_requests_select ON public.leave_requests FOR SELECT TO authenticated
  USING (
    employee_id = public.current_employee_id()
    OR has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'manager'::app_role)
  );
CREATE POLICY leave_requests_insert_self ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.current_employee_id() AND status = 'pending');
-- Self can cancel own pending request; managers/admins can decide
CREATE POLICY leave_requests_update ON public.leave_requests FOR UPDATE TO authenticated
  USING (
    (employee_id = public.current_employee_id() AND status = 'pending')
    OR has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'manager'::app_role)
  )
  WITH CHECK (
    (employee_id = public.current_employee_id())
    OR has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'manager'::app_role)
  );
CREATE POLICY leave_requests_delete_admin ON public.leave_requests FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER leave_requests_set_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed leave types
INSERT INTO public.leave_types (name, color, default_days, is_paid) VALUES
  ('Annual Leave',  '#0ea5e9', 20, true),
  ('Sick Leave',    '#ef4444', 10, true),
  ('Casual Leave',  '#a855f7', 6,  true),
  ('Unpaid Leave',  '#64748b', 0,  false);
