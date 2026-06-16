-- Migration: Add missing tables for Payroll, LMS, Helpdesk, and Collaboration modules

-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.expense_status AS ENUM ('pending', 'approved', 'rejected', 'reimbursed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.enrollment_status AS ENUM ('not_started', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============ 1) PAYROLL & EXPENSES ============

-- Payslips table
CREATE TABLE IF NOT EXISTS public.payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month text NOT NULL,
  year integer NOT NULL,
  base_salary numeric(12,2) NOT NULL DEFAULT 0,
  bonus numeric(12,2) NOT NULL DEFAULT 0,
  deductions numeric(12,2) NOT NULL DEFAULT 0,
  net_salary numeric(12,2) NOT NULL DEFAULT 0,
  pdf_url text,
  status text NOT NULL DEFAULT 'processed',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payslips TO authenticated;
GRANT ALL ON public.payslips TO service_role;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

CREATE POLICY payslips_select ON public.payslips FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Expense claims table
CREATE TABLE IF NOT EXISTS public.expense_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  claim_id text NOT NULL UNIQUE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL,
  description text,
  amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  status public.expense_status NOT NULL DEFAULT 'pending',
  receipt_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_claims TO authenticated;
GRANT ALL ON public.expense_claims TO service_role;
ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY expense_claims_select ON public.expense_claims FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY expense_claims_insert ON public.expense_claims FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.current_employee_id());
CREATE POLICY expense_claims_update ON public.expense_claims FOR UPDATE TO authenticated
  USING (employee_id = public.current_employee_id() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (employee_id = public.current_employee_id() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER expense_claims_updated BEFORE UPDATE ON public.expense_claims FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============ 2) LMS (LEARNING) ============

-- Courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Professional Development',
  thumbnail_url text,
  duration text,
  is_mandatory boolean NOT NULL DEFAULT false,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY courses_select ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY courses_write ON public.courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Course Enrollments table
CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status public.enrollment_status NOT NULL DEFAULT 'not_started',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(employee_id, course_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY enrollments_select ON public.enrollments FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY enrollments_insert ON public.enrollments FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.current_employee_id());
CREATE POLICY enrollments_update ON public.enrollments FOR UPDATE TO authenticated
  USING (employee_id = public.current_employee_id() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (employee_id = public.current_employee_id() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));


-- ============ 3) HR HELPDESK ============

-- Tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'open',
  priority public.ticket_priority NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tickets_select ON public.tickets FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY tickets_insert ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.current_employee_id());
CREATE POLICY tickets_update ON public.tickets FOR UPDATE TO authenticated
  USING (employee_id = public.current_employee_id() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (employee_id = public.current_employee_id() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER tickets_updated BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============ 4) MESSAGING & COLLABORATION ============

-- Chat channels
CREATE TABLE IF NOT EXISTS public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_private boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.channels TO authenticated;
GRANT ALL ON public.channels TO service_role;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY channels_select ON public.channels FOR SELECT TO authenticated USING (true);
CREATE POLICY channels_insert ON public.channels FOR INSERT TO authenticated USING (true) WITH CHECK (true);

-- Messages (Channels + Direct Messages)
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  message_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT channel_or_recipient_required CHECK (
    (channel_id IS NOT NULL AND recipient_id IS NULL) OR
    (channel_id IS NULL AND recipient_id IS NOT NULL)
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_select ON public.messages FOR SELECT TO authenticated
  USING (
    channel_id IS NOT NULL
    OR employee_id = public.current_employee_id()
    OR recipient_id = public.current_employee_id()
  );
CREATE POLICY messages_insert ON public.messages FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.current_employee_id());


-- ============ SEED DATA ============

-- Seed Channels
INSERT INTO public.channels (name, description) VALUES
  ('announcements', 'Company wide announcements and news.'),
  ('proj-apollo-launch', 'Coordinate final release tasks for Project Apollo Q3 launch.'),
  ('dept-frontend', 'Frontend engineering sync, updates, and reviews.'),
  ('general', 'General watercooler talk.')
ON CONFLICT (name) DO NOTHING;

-- Seed Courses
INSERT INTO public.courses (title, description, category, duration, is_mandatory, due_date) VALUES
  ('Information Security & Data Privacy 2026', 'Annual required training covering Phishing, GDPR updates, and internal data handling protocols.', 'Compliance', '45 mins', true, CURRENT_DATE + INTERVAL '3 days'),
  ('Advanced Financial Modeling', 'Techniques for building robust valuation models and forecasting scenarios for Q3 planning.', 'Professional Development', '2 hours', false, NULL),
  ('Effective Communication in Remote Teams', 'Learn strategies for asynchronous communication, active listening, and conflict resolution.', 'Leadership', '1.5 hours', false, NULL),
  ('Introduction to Evai AI Systems', 'Familiarize yourself with our internal Evai AI Assistant framework and how to query context.', 'Technical', '30 mins', true, CURRENT_DATE + INTERVAL '14 days')
ON CONFLICT (title) DO NOTHING;
