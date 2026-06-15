import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AssetRow = {
  id: string;
  name: string;
  type: string;
  serial_number: string | null;
  cost: number;
  status: string;
  assigned_to: string | null;
  assigned_at: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    full_name: string;
    email: string;
    employee_code: string;
  } | null;
};

export const listAssets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AssetRow[]> => {
    const { supabase, userId } = context;

    // Get current employee's organization ID
    const { data: emp } = await supabase
      .from("employees")
      .select("organization_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!emp?.organization_id) return [];

    // Fetch assets and join with employees
    const { data, error } = await supabase
      .from("assets")
      .select(`
        id,
        name,
        type,
        serial_number,
        cost,
        status,
        assigned_to,
        assigned_at,
        created_at,
        updated_at,
        employee:employees(
          full_name,
          email,
          employee_code
        )
      `)
      .eq("organization_id", emp.organization_id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []) as unknown as AssetRow[];
  });

export const createAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: {
    name: string;
    type: string;
    serial_number?: string;
    cost: number;
  }) => data)
  .handler(async ({ input, context }) => {
    const { supabase, userId } = context;

    // Get current employee's organization ID
    const { data: emp } = await supabase
      .from("employees")
      .select("organization_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!emp?.organization_id) throw new Error("No organization associated with this account.");

    const { data, error } = await supabase
      .from("assets")
      .insert({
        organization_id: emp.organization_id,
        name: input.name,
        type: input.type,
        serial_number: input.serial_number || null,
        cost: input.cost,
        status: "available",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

export const assignAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: {
    assetId: string;
    employeeId: string;
  }) => data)
  .handler(async ({ input, context }) => {
    const { supabase } = context;

    const { data, error } = await supabase
      .from("assets")
      .update({
        assigned_to: input.employeeId,
        assigned_at: new Date().toISOString(),
        status: "assigned",
      })
      .eq("id", input.assetId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

export const returnAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: {
    assetId: string;
  }) => data)
  .handler(async ({ input, context }) => {
    const { supabase } = context;

    const { data, error } = await supabase
      .from("assets")
      .update({
        assigned_to: null,
        assigned_at: null,
        status: "available",
      })
      .eq("id", input.assetId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });
