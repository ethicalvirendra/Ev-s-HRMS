
CREATE TYPE public.goal_status AS ENUM ('not_started','in_progress','completed','cancelled');
CREATE TYPE public.review_status AS ENUM ('draft','submitted','acknowledged');
CREATE TYPE public.feedback_type AS ENUM ('praise','suggestion');
CREATE TYPE public.feedback_visibility AS ENUM ('private','manager','public');

-- ============ GOALS ============
CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status public.goal_status NOT NULL DEFAULT 'not_started',
  progress smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  weight smallint NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 10),
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals_read_self_or_mgr" ON public.goals FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE POLICY "goals_write_self_or_mgr" ON public.goals FOR ALL TO authenticated
  USING (employee_id = public.current_employee_id() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (employee_id = public.current_employee_id() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

CREATE TRIGGER goals_updated BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PERFORMANCE REVIEWS ============
CREATE TABLE public.performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  cycle_name text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  overall_rating smallint CHECK (overall_rating BETWEEN 1 AND 5),
  strengths text,
  improvements text,
  status public.review_status NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.performance_reviews TO authenticated;
GRANT ALL ON public.performance_reviews TO service_role;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_read_self_or_reviewer_or_mgr" ON public.performance_reviews FOR SELECT TO authenticated
  USING (
    employee_id = public.current_employee_id()
    OR reviewer_id = public.current_employee_id()
    OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')
  );
CREATE POLICY "reviews_write_reviewer_or_mgr" ON public.performance_reviews FOR ALL TO authenticated
  USING (
    reviewer_id = public.current_employee_id()
    OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')
  )
  WITH CHECK (
    reviewer_id = public.current_employee_id()
    OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')
  );

CREATE TRIGGER reviews_updated BEFORE UPDATE ON public.performance_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PEER FEEDBACK ============
CREATE TABLE public.peer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  to_employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type public.feedback_type NOT NULL DEFAULT 'praise',
  visibility public.feedback_visibility NOT NULL DEFAULT 'manager',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.peer_feedback TO authenticated;
GRANT ALL ON public.peer_feedback TO service_role;
ALTER TABLE public.peer_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_read_visible" ON public.peer_feedback FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR from_employee_id = public.current_employee_id()
    OR to_employee_id = public.current_employee_id()
    OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')
  );
CREATE POLICY "feedback_insert_self" ON public.peer_feedback FOR INSERT TO authenticated
  WITH CHECK (from_employee_id = public.current_employee_id());
CREATE POLICY "feedback_delete_self_or_admin" ON public.peer_feedback FOR DELETE TO authenticated
  USING (from_employee_id = public.current_employee_id() OR public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_goals_employee ON public.goals(employee_id);
CREATE INDEX idx_reviews_employee ON public.performance_reviews(employee_id);
CREATE INDEX idx_feedback_to ON public.peer_feedback(to_employee_id);
