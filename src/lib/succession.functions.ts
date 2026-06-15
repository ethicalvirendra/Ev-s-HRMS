import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SuccessionNomineeRow = {
  id: string;
  plan_id: string;
  nominee_id: string;
  readiness: "ready_now" | "1_2_years" | "3_5_years";
  suitability_score: number;
  notes: string | null;
  created_at: string;
  nominee?: {
    full_name: string;
    email: string;
    employee_code: string;
    job_title: string | null;
  } | null;
};

export type SuccessionPlanRow = {
  id: string;
  position_title: string;
  current_incumbent_id: string | null;
  risk_level: "low" | "medium" | "high";
  readiness_timeline: string;
  created_at: string;
  updated_at: string;
  incumbent?: {
    full_name: string;
    email: string;
    employee_code: string;
    job_title: string | null;
  } | null;
  nominees?: SuccessionNomineeRow[];
};

// 1) List succession plans in the organization
export const listSuccessionPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SuccessionPlanRow[]> => {
    const { supabase, userId } = context;

    // Get current employee's organization ID
    const { data: emp } = await supabase
      .from("employees")
      .select("organization_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!emp?.organization_id) return [];

    // Fetch plans with incumbent and nominees details
    const { data, error } = await supabase
      .from("succession_plans")
      .select(`
        id,
        position_title,
        current_incumbent_id,
        risk_level,
        readiness_timeline,
        created_at,
        updated_at,
        incumbent:employees(
          full_name,
          email,
          employee_code,
          job_title
        ),
        nominees:succession_nominees(
          id,
          plan_id,
          nominee_id,
          readiness,
          suitability_score,
          notes,
          created_at,
          nominee:employees(
            full_name,
            email,
            employee_code,
            job_title
          )
        )
      `)
      .eq("organization_id", emp.organization_id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as unknown as SuccessionPlanRow[];
  });

// 2) Create a new succession plan (Admin/Manager only)
export const createSuccessionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: {
    positionTitle: string;
    incumbentId?: string;
    riskLevel: "low" | "medium" | "high";
    readinessTimeline: string;
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
      .from("succession_plans")
      .insert({
        organization_id: emp.organization_id,
        position_title: input.positionTitle,
        current_incumbent_id: input.incumbentId || null,
        risk_level: input.riskLevel,
        readiness_timeline: input.readinessTimeline,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

// 3) Add nominee successor (Admin/Manager only)
export const addSuccessionNominee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: {
    planId: string;
    nomineeId: string;
    readiness: "ready_now" | "1_2_years" | "3_5_years";
    suitabilityScore: number;
    notes?: string;
  }) => data)
  .handler(async ({ input, context }) => {
    const { supabase } = context;

    const { data, error } = await supabase
      .from("succession_nominees")
      .insert({
        plan_id: input.planId,
        nominee_id: input.nomineeId,
        readiness: input.readiness,
        suitability_score: input.suitabilityScore,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

// 4) Remove nominee successor (Admin/Manager only)
export const removeSuccessionNominee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((nomineeId: string) => nomineeId)
  .handler(async ({ input: nomineeId, context }) => {
    const { supabase } = context;

    const { data, error } = await supabase
      .from("succession_nominees")
      .delete()
      .eq("id", nomineeId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });
