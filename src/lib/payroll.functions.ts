import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PayslipRow = {
  id: string;
  month: string;
  year: number;
  base_salary: number;
  bonus: number;
  deductions: number;
  net_salary: number;
  pdf_url: string | null;
  status: string;
  created_at: string;
};

export type ExpenseClaimRow = {
  id: string;
  claim_id: string;
  date: string;
  category: string;
  description: string | null;
  amount: number;
  status: "pending" | "approved" | "rejected" | "reimbursed";
  receipt_url: string | null;
  created_at: string;
};

export const listMyPayslips = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PayslipRow[]> => {
    const { supabase, userId } = context;
    
    // Get employee id
    const { data: emp } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
      
    if (!emp) return [];

    const { data, error } = await supabase
      .from("payslips")
      .select("*")
      .eq("employee_id", emp.id)
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as PayslipRow[];
  });

export const listMyExpenseClaims = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ExpenseClaimRow[]> => {
    const { supabase, userId } = context;

    // Get employee id
    const { data: emp } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!emp) return [];

    const { data, error } = await supabase
      .from("expense_claims")
      .select("*")
      .eq("employee_id", emp.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ExpenseClaimRow[];
  });

export const createExpenseClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    category: string;
    description?: string;
    amount: number;
    receipt_url?: string;
  }) => {
    if (!data.category) throw new Error("Category is required");
    if (typeof data.amount !== "number" || data.amount <= 0) throw new Error("Amount must be greater than 0");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Get employee id
    const { data: emp } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!emp) throw new Error("Employee record not found");

    const claimId = `EXP-2026-${Math.floor(100 + Math.random() * 900)}`;

    const { data: claim, error } = await supabase
      .from("expense_claims")
      .insert({
        employee_id: emp.id,
        claim_id: claimId,
        category: data.category,
        description: data.description || null,
        amount: data.amount,
        status: "pending",
        receipt_url: data.receipt_url || null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: claim.id, claim_id: claimId };
  });
