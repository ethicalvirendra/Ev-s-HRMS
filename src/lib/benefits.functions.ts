import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BenefitsPackageRow = {
  id: string;
  name: string;
  provider: string;
  type: "health" | "dental" | "vision" | "retirement" | "other";
  description: string | null;
  employee_cost: number;
  employer_contribution: number;
  created_at: string;
  updated_at: string;
};

export type BenefitsEnrollmentRow = {
  id: string;
  employee_id: string;
  package_id: string;
  status: "enrolled" | "waived";
  coverage_start_date: string;
  created_at: string;
  updated_at: string;
};

export type EnrollmentWithPackage = BenefitsEnrollmentRow & {
  package: BenefitsPackageRow;
};

// 1) List available benefits packages in the organization
export const listBenefitsPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BenefitsPackageRow[]> => {
    const { supabase, userId } = context;

    const { data: emp } = await supabase
      .from("employees")
      .select("organization_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!emp?.organization_id) return [];

    const { data, error } = await supabase
      .from("benefits_packages")
      .select("id, name, provider, type, description, employee_cost, employer_contribution, created_at, updated_at")
      .eq("organization_id", emp.organization_id)
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []) as BenefitsPackageRow[];
  });

// 2) List current employee's benefits enrollments
export const listMyEnrollments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EnrollmentWithPackage[]> => {
    const { supabase } = context;

    const empIdResult = await supabase.rpc("current_employee_id");
    const empId = empIdResult.data;
    if (!empId) return [];

    const { data, error } = await supabase
      .from("benefits_enrollments")
      .select(`
        id,
        employee_id,
        package_id,
        status,
        coverage_start_date,
        created_at,
        updated_at,
        package:benefits_packages(
          id,
          name,
          provider,
          type,
          description,
          employee_cost,
          employer_contribution,
          created_at,
          updated_at
        )
      `)
      .eq("employee_id", empId);

    if (error) throw new Error(error.message);
    return (data || []) as unknown as EnrollmentWithPackage[];
  });

// 3) Enroll in a benefits package
export const enrollInBenefit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((packageId: string) => packageId)
  .handler(async ({ input: packageId, context }) => {
    const { supabase } = context;

    const empIdResult = await supabase.rpc("current_employee_id");
    const empId = empIdResult.data;
    if (!empId) throw new Error("Employee profile not found");

    const { data, error } = await supabase
      .from("benefits_enrollments")
      .upsert(
        {
          employee_id: empId,
          package_id: packageId,
          status: "enrolled",
          coverage_start_date: new Date().toISOString().split("T")[0],
        },
        { onConflict: "employee_id, package_id" }
      )
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

// 4) Waive enrollment in a benefits package
export const waiveBenefit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((packageId: string) => packageId)
  .handler(async ({ input: packageId, context }) => {
    const { supabase } = context;

    const empIdResult = await supabase.rpc("current_employee_id");
    const empId = empIdResult.data;
    if (!empId) throw new Error("Employee profile not found");

    const { data, error } = await supabase
      .from("benefits_enrollments")
      .upsert(
        {
          employee_id: empId,
          package_id: packageId,
          status: "waived",
          coverage_start_date: new Date().toISOString().split("T")[0],
        },
        { onConflict: "employee_id, package_id" }
      )
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

// 5) Create a new benefits package (Admin/Manager only)
export const createBenefitsPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: {
    name: string;
    provider: string;
    type: "health" | "dental" | "vision" | "retirement" | "other";
    description?: string;
    employeeCost: number;
    employerContribution: number;
  }) => data)
  .handler(async ({ input, context }) => {
    const { supabase, userId } = context;

    const { data: emp } = await supabase
      .from("employees")
      .select("organization_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!emp?.organization_id) throw new Error("No organization associated with this account.");

    const { data, error } = await supabase
      .from("benefits_packages")
      .insert({
        organization_id: emp.organization_id,
        name: input.name,
        provider: input.provider,
        type: input.type,
        description: input.description || null,
        employee_cost: input.employeeCost,
        employer_contribution: input.employerContribution,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });
