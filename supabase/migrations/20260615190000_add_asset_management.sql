-- Migration: Add Asset Management & Device Tracking module

CREATE TABLE IF NOT EXISTS public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL, -- e.g. 'Laptop', 'Mobile', 'Monitor', 'Peripherals', 'Other'
  serial_number text,
  cost numeric(12,2) DEFAULT 0 CHECK (cost >= 0),
  status text NOT NULL DEFAULT 'available', -- 'available', 'assigned', 'maintenance', 'retired'
  assigned_to uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexing for lookup speed
CREATE INDEX IF NOT EXISTS idx_assets_organization ON public.assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_assigned_to ON public.assets(assigned_to);

-- Enable RLS and add tenant isolation policies
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;

-- Users can view assets in their own organization
CREATE POLICY assets_tenant_select ON public.assets FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());
  
-- Admins/managers can manage assets in their organization
CREATE POLICY assets_tenant_all ON public.assets FOR ALL TO authenticated
  USING (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')))
  WITH CHECK (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

-- Auto-update updated_at timestamp
CREATE TRIGGER assets_updated BEFORE UPDATE ON public.assets 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
