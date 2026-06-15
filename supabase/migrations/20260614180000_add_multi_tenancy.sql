-- Migration: Add multi-tenancy support for SaaS (Zoho People clone style)

-- 1) Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  domain text,
  license_limit integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Seed default organization
INSERT INTO public.organizations (name, slug, domain)
VALUES ('Default Organization', 'default', 'nexus.local')
ON CONFLICT (slug) DO NOTHING;

-- 2) Alter tables to add organization_id
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Update existing data to link to the default organization
DO $$
DECLARE
  default_org_id uuid;
BEGIN
  SELECT id INTO default_org_id FROM public.organizations WHERE slug = 'default' LIMIT 1;
  
  UPDATE public.employees SET organization_id = default_org_id WHERE organization_id IS NULL;
  UPDATE public.departments SET organization_id = default_org_id WHERE organization_id IS NULL;
  UPDATE public.jobs SET organization_id = default_org_id WHERE organization_id IS NULL;
  UPDATE public.courses SET organization_id = default_org_id WHERE organization_id IS NULL;
  UPDATE public.channels SET organization_id = default_org_id WHERE organization_id IS NULL;
  UPDATE public.candidates SET organization_id = default_org_id WHERE organization_id IS NULL;
END $$;

-- 3) Security helper functions (run as SECURITY DEFINER to bypass RLS loops)
CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.employees WHERE user_id = auth.uid() LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.current_organization_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_employee_organization_id(_employee_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.employees WHERE id = _employee_id LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_employee_organization_id(uuid) TO authenticated;

-- 4) Redefine handle_new_user to assign organization + create employee record
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  default_role public.app_role := 'employee';
  org_id uuid;
  company_name text;
  company_slug text;
  email_domain text;
BEGIN
  -- Extract domain from email
  email_domain := split_part(NEW.email, '@', 2);

  -- Determine role based on developer bypass emails
  IF NEW.email = 'dev-admin@nexus.local' THEN
    default_role := 'admin';
  ELSIF NEW.email = 'dev-manager@nexus.local' THEN
    default_role := 'manager';
  ELSIF NEW.email = 'dev-employee@nexus.local' THEN
    default_role := 'employee';
  END IF;

  -- 1) Try to match organization by domain
  SELECT id INTO org_id FROM public.organizations WHERE domain = email_domain LIMIT 1;

  -- 2) If developer or domain not found, use default organization or create a new one
  IF org_id IS NULL THEN
    IF email_domain = 'nexus.local' THEN
      SELECT id INTO org_id FROM public.organizations WHERE slug = 'default' LIMIT 1;
    ELSE
      -- Create a new organization for this new signup
      company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', initcap(split_part(email_domain, '.', 1)) || ' Org');
      company_slug := lower(regexp_replace(company_name, '[^a-zA-Z0-9]+', '-', 'g'));
      
      -- Ensure slug is unique
      IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = company_slug) THEN
        company_slug := company_slug || '-' || substr(gen_random_uuid()::text, 1, 8);
      END IF;

      INSERT INTO public.organizations (name, slug, domain)
      VALUES (company_name, company_slug, email_domain)
      RETURNING id INTO org_id;

      -- First user in a new organization is an admin
      default_role := 'admin';
    END IF;
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, default_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Insert employee record linked to organization
  INSERT INTO public.employees (user_id, employee_code, full_name, email, organization_id, status)
  VALUES (
    NEW.id,
    'EMP-' || upper(substr(gen_random_uuid()::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email,
    org_id,
    'active'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END $$;

-- 5) Organizations RLS
CREATE POLICY organizations_select ON public.organizations FOR SELECT TO authenticated
  USING (id = public.current_organization_id());
CREATE POLICY organizations_update ON public.organizations FOR UPDATE TO authenticated
  USING (id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

-- 6) Drop and recreate tenant-isolating RLS policies for modular tables
DROP POLICY IF EXISTS employees_read_self ON public.employees;
DROP POLICY IF EXISTS employees_admin_write ON public.employees;
DROP POLICY IF EXISTS employees_read ON public.employees;

CREATE POLICY employees_tenant_select ON public.employees FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());
CREATE POLICY employees_tenant_all ON public.employees FOR ALL TO authenticated
  USING (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')))
  WITH CHECK (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

DROP POLICY IF EXISTS departments_read ON public.departments;
DROP POLICY IF EXISTS departments_admin_write ON public.departments;

CREATE POLICY departments_tenant_select ON public.departments FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());
CREATE POLICY departments_tenant_all ON public.departments FOR ALL TO authenticated
  USING (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')))
  WITH CHECK (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

DROP POLICY IF EXISTS jobs_read_all_auth ON public.jobs;
DROP POLICY IF EXISTS jobs_write_admin_manager ON public.jobs;

CREATE POLICY jobs_tenant_select ON public.jobs FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());
CREATE POLICY jobs_tenant_all ON public.jobs FOR ALL TO authenticated
  USING (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')))
  WITH CHECK (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

DROP POLICY IF EXISTS courses_select ON public.courses;
DROP POLICY IF EXISTS courses_write ON public.courses;

CREATE POLICY courses_tenant_select ON public.courses FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());
CREATE POLICY courses_tenant_all ON public.courses FOR ALL TO authenticated
  USING (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')))
  WITH CHECK (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

DROP POLICY IF EXISTS channels_select ON public.channels;
DROP POLICY IF EXISTS channels_insert ON public.channels;

CREATE POLICY channels_tenant_select ON public.channels FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());
CREATE POLICY channels_tenant_all ON public.channels FOR ALL TO authenticated
  USING (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')))
  WITH CHECK (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

DROP POLICY IF EXISTS candidates_read_recruiters ON public.candidates;
DROP POLICY IF EXISTS candidates_write_recruiters ON public.candidates;

CREATE POLICY candidates_tenant_select ON public.candidates FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());
CREATE POLICY candidates_tenant_all ON public.candidates FOR ALL TO authenticated
  USING (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')))
  WITH CHECK (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

-- 7) Overwrite security policies for child tables referencing employee_id to check organization matches
DROP POLICY IF EXISTS payslips_select ON public.payslips;
CREATE POLICY payslips_tenant_select ON public.payslips FOR SELECT TO authenticated
  USING (public.get_employee_organization_id(employee_id) = public.current_organization_id());

DROP POLICY IF EXISTS expense_claims_select ON public.expense_claims;
DROP POLICY IF EXISTS expense_claims_insert ON public.expense_claims;
DROP POLICY IF EXISTS expense_claims_update ON public.expense_claims;

CREATE POLICY expense_claims_tenant_all ON public.expense_claims FOR ALL TO authenticated
  USING (public.get_employee_organization_id(employee_id) = public.current_organization_id())
  WITH CHECK (public.get_employee_organization_id(employee_id) = public.current_organization_id());

DROP POLICY IF EXISTS enrollments_select ON public.enrollments;
DROP POLICY IF EXISTS enrollments_insert ON public.enrollments;
DROP POLICY IF EXISTS enrollments_update ON public.enrollments;

CREATE POLICY enrollments_tenant_all ON public.enrollments FOR ALL TO authenticated
  USING (public.get_employee_organization_id(employee_id) = public.current_organization_id())
  WITH CHECK (public.get_employee_organization_id(employee_id) = public.current_organization_id());

DROP POLICY IF EXISTS tickets_select ON public.tickets;
DROP POLICY IF EXISTS tickets_insert ON public.tickets;
DROP POLICY IF EXISTS tickets_update ON public.tickets;

CREATE POLICY tickets_tenant_all ON public.tickets FOR ALL TO authenticated
  USING (public.get_employee_organization_id(employee_id) = public.current_organization_id())
  WITH CHECK (public.get_employee_organization_id(employee_id) = public.current_organization_id());

DROP POLICY IF EXISTS attendance_select ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_insert_self ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_update_self_or_admin ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_delete_admin ON public.attendance_logs;

CREATE POLICY attendance_tenant_all ON public.attendance_logs FOR ALL TO authenticated
  USING (public.get_employee_organization_id(employee_id) = public.current_organization_id())
  WITH CHECK (public.get_employee_organization_id(employee_id) = public.current_organization_id());

DROP POLICY IF EXISTS leave_balances_select ON public.leave_balances;
DROP POLICY IF EXISTS leave_balances_admin_write ON public.leave_balances;

CREATE POLICY leave_balances_tenant_all ON public.leave_balances FOR ALL TO authenticated
  USING (public.get_employee_organization_id(employee_id) = public.current_organization_id())
  WITH CHECK (public.get_employee_organization_id(employee_id) = public.current_organization_id());

DROP POLICY IF EXISTS leave_requests_select ON public.leave_requests;
DROP POLICY IF EXISTS leave_requests_insert_self ON public.leave_requests;
DROP POLICY IF EXISTS leave_requests_update ON public.leave_requests;
DROP POLICY IF EXISTS leave_requests_delete_admin ON public.leave_requests;

CREATE POLICY leave_requests_tenant_all ON public.leave_requests FOR ALL TO authenticated
  USING (public.get_employee_organization_id(employee_id) = public.current_organization_id())
  WITH CHECK (public.get_employee_organization_id(employee_id) = public.current_organization_id());
