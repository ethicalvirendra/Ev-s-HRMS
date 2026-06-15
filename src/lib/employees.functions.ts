import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type EmployeeRow = {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  location: string | null;
  status: string;
  avatar_url: string | null;
  hire_date: string | null;
  department: { id: string; name: string } | null;
};

export type DepartmentRow = { id: string; name: string };

export const listEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EmployeeRow[]> => {
    const { data, error } = await context.supabase
      .from("employees")
      .select(
        "id, employee_code, full_name, email, phone, job_title, location, status, avatar_url, hire_date, department:departments(id, name)",
      )
      .order("full_name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as EmployeeRow[];
  });

export const listDepartments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DepartmentRow[]> => {
    const { data, error } = await context.supabase
      .from("departments")
      .select("id, name")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const onboardEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: {
    employee_code: string;
    full_name: string;
    email: string;
    phone?: string;
    job_title?: string;
    department_id?: string;
    location?: string;
    hire_date?: string;
  }) => data)
  .handler(async ({ input, context }) => {
    // Fetch creator's organization ID
    const { data: creator } = await context.supabase
      .from("employees")
      .select("organization_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!creator?.organization_id) throw new Error("No organization associated with this account.");

    const { data, error } = await context.supabase
      .from("employees")
      .insert({
        employee_code: input.employee_code,
        full_name: input.full_name,
        email: input.email,
        phone: input.phone || null,
        job_title: input.job_title || null,
        department_id: input.department_id || null,
        location: input.location || null,
        hire_date: input.hire_date || null,
        status: "active",
        organization_id: creator.organization_id,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

export const offboardEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { id: string; status: "terminated" | "inactive" }) => data)
  .handler(async ({ input, context }) => {
    const { data, error } = await context.supabase
      .from("employees")
      .update({ status: input.status })
      .eq("id", input.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

