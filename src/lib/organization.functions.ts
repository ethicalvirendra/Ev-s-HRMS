import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  domain: string | null;
  license_limit: number;
};

export const getOrganizationDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OrganizationRow | null> => {
    const { supabase } = context;

    // Get current employee's organization ID
    const { data: emp } = await supabase
      .from("employees")
      .select("organization_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!emp?.organization_id) return null;

    const { data: org, error } = await supabase
      .from("organizations")
      .select("id, name, slug, logo_url, domain, license_limit")
      .eq("id", emp.organization_id)
      .single();

    if (error) throw new Error(error.message);
    return org;
  });

export const updateOrganizationDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { name: string; logo_url?: string; domain?: string }) => data)
  .handler(async ({ input, context }) => {
    const { supabase } = context;

    // Get current employee's organization ID
    const { data: emp } = await supabase
      .from("employees")
      .select("organization_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!emp?.organization_id) throw new Error("No organization associated with this account.");

    const { data, error } = await supabase
      .from("organizations")
      .update({
        name: input.name,
        logo_url: input.logo_url || null,
        domain: input.domain || null,
      })
      .eq("id", emp.organization_id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

export const createDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { name: string; description?: string }) => data)
  .handler(async ({ input, context }) => {
    const { supabase } = context;

    // Get current employee's organization ID
    const { data: emp } = await supabase
      .from("employees")
      .select("organization_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!emp?.organization_id) throw new Error("No organization associated with this account.");

    const { data, error } = await supabase
      .from("departments")
      .insert({
        name: input.name,
        description: input.description || null,
        organization_id: emp.organization_id,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });
