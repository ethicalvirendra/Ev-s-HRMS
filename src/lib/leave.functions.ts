import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type LeaveType = {
  id: string;
  name: string;
  color: string;
  default_days: number;
  is_paid: boolean;
};

export type LeaveBalance = {
  id: string;
  leave_type_id: string;
  year: number;
  allocated: number;
  used: number;
  leave_type: { name: string; color: string } | null;
};

export type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
  leave_type: { name: string; color: string } | null;
  employee: { id: string; full_name: string; avatar_url: string | null } | null;
};

async function resolveEmployeeId(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No employee record linked to this account.");
  return data.id as string;
}

export const listLeaveTypes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LeaveType[]> => {
    const { data, error } = await context.supabase
      .from("leave_types")
      .select("id, name, color, default_days, is_paid")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listMyBalances = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LeaveBalance[]> => {
    const empId = await resolveEmployeeId(context.supabase, context.userId);
    const year = new Date().getFullYear();
    const { data, error } = await context.supabase
      .from("leave_balances")
      .select("id, leave_type_id, year, allocated, used, leave_type:leave_types(name, color)")
      .eq("employee_id", empId)
      .eq("year", year);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as LeaveBalance[];
  });

export const listMyLeaveRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LeaveRequest[]> => {
    const empId = await resolveEmployeeId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("leave_requests")
      .select(
        "id, employee_id, leave_type_id, start_date, end_date, days, reason, status, decided_at, decision_note, created_at, leave_type:leave_types(name, color), employee:employees(id, full_name, avatar_url)",
      )
      .eq("employee_id", empId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as LeaveRequest[];
  });

export const listPendingApprovals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LeaveRequest[]> => {
    const { data, error } = await context.supabase
      .from("leave_requests")
      .select(
        "id, employee_id, leave_type_id, start_date, end_date, days, reason, status, decided_at, decision_note, created_at, leave_type:leave_types(name, color), employee:employees(id, full_name, avatar_url)",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as LeaveRequest[];
  });

const submitSchema = z.object({
  leave_type_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().max(1000).optional(),
});

export const submitLeaveRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ context, data }): Promise<LeaveRequest> => {
    const empId = await resolveEmployeeId(context.supabase, context.userId);
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    if (end < start) throw new Error("End date must be on or after start date.");
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    const { data: row, error } = await context.supabase
      .from("leave_requests")
      .insert({
        employee_id: empId,
        leave_type_id: data.leave_type_id,
        start_date: data.start_date,
        end_date: data.end_date,
        days,
        reason: data.reason ?? null,
      })
      .select(
        "id, employee_id, leave_type_id, start_date, end_date, days, reason, status, decided_at, decision_note, created_at, leave_type:leave_types(name, color), employee:employees(id, full_name, avatar_url)",
      )
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as LeaveRequest;
  });

export const cancelLeaveRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("leave_requests")
      .update({ status: "cancelled", decided_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const decideLeaveRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; approve: boolean; note?: string }) =>
    z
      .object({
        id: z.string().uuid(),
        approve: z.boolean(),
        note: z.string().trim().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("leave_requests")
      .update({
        status: data.approve ? "approved" : "rejected",
        decision_note: data.note ?? null,
        decided_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
