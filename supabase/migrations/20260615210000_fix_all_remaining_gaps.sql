-- Migration: Fix Remaining HRMS Gaps (Benefits Administration & Succession Planning)

-- ============ 1) BENEFITS ADMINISTRATION ============
CREATE TABLE IF NOT EXISTS public.benefits_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  provider text NOT NULL,
  type text NOT NULL CHECK (type IN ('health', 'dental', 'vision', 'retirement', 'other')),
  description text,
  employee_cost numeric(12,2) DEFAULT 0 CHECK (employee_cost >= 0),
  employer_contribution numeric(12,2) DEFAULT 0 CHECK (employer_contribution >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.benefits_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  package_id uuid REFERENCES public.benefits_packages(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'waived')),
  coverage_start_date date DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, package_id)
);

-- ============ 2) SUCCESSION PLANNING ============
CREATE TABLE IF NOT EXISTS public.succession_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  position_title text NOT NULL,
  current_incumbent_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  readiness_timeline text NOT NULL, -- e.g. 'Immediate', '1-2 years', '3-5 years'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.succession_nominees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.succession_plans(id) ON DELETE CASCADE,
  nominee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  readiness text NOT NULL CHECK (readiness IN ('ready_now', '1_2_years', '3_5_years')),
  suitability_score integer CHECK (suitability_score BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, nominee_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_benefits_packages_org ON public.benefits_packages(organization_id);
CREATE INDEX IF NOT EXISTS idx_benefits_enrollments_emp ON public.benefits_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_succession_plans_org ON public.succession_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_succession_nominees_plan ON public.succession_nominees(plan_id);

-- Enable RLS
ALTER TABLE public.benefits_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benefits_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.succession_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.succession_nominees ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.benefits_packages TO authenticated;
GRANT ALL ON public.benefits_packages TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.benefits_enrollments TO authenticated;
GRANT ALL ON public.benefits_enrollments TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.succession_plans TO authenticated;
GRANT ALL ON public.succession_plans TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.succession_nominees TO authenticated;
GRANT ALL ON public.succession_nominees TO service_role;

-- Policies for benefits packages
CREATE POLICY benefits_packages_select ON public.benefits_packages FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());

CREATE POLICY benefits_packages_all ON public.benefits_packages FOR ALL TO authenticated
  USING (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')))
  WITH CHECK (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

-- Policies for enrollments (Read self or admin/mgr, write own)
CREATE POLICY benefits_enrollments_select ON public.benefits_enrollments FOR SELECT TO authenticated
  USING (
    public.get_employee_organization_id(employee_id) = public.current_organization_id() AND 
    (employee_id = public.current_employee_id() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

CREATE POLICY benefits_enrollments_all ON public.benefits_enrollments FOR ALL TO authenticated
  USING (
    public.get_employee_organization_id(employee_id) = public.current_organization_id() AND 
    (employee_id = public.current_employee_id() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  )
  WITH CHECK (
    public.get_employee_organization_id(employee_id) = public.current_organization_id() AND 
    (employee_id = public.current_employee_id() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

-- Policies for succession plans (Read/write restricted to admin/manager for strategic positioning)
CREATE POLICY succession_plans_select ON public.succession_plans FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

CREATE POLICY succession_plans_all ON public.succession_plans FOR ALL TO authenticated
  USING (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')))
  WITH CHECK (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

-- Policies for succession nominees
CREATE POLICY succession_nominees_select ON public.succession_nominees FOR SELECT TO authenticated
  USING (plan_id IN (SELECT id FROM public.succession_plans WHERE organization_id = public.current_organization_id()));

CREATE POLICY succession_nominees_all ON public.succession_nominees FOR ALL TO authenticated
  USING (plan_id IN (SELECT id FROM public.succession_plans WHERE organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))))
  WITH CHECK (plan_id IN (SELECT id FROM public.succession_plans WHERE organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))));

-- Triggers for updated_at
CREATE TRIGGER benefits_packages_updated BEFORE UPDATE ON public.benefits_packages 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER benefits_enrollments_updated BEFORE UPDATE ON public.benefits_enrollments 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER succession_plans_updated BEFORE UPDATE ON public.succession_plans 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
