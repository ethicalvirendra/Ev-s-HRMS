import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type AttendanceLog = {
  id: string;
  employee_id: string;
  clock_in: string;
  clock_out: string | null;
  notes: string | null;
  employee?: { id: string; full_name: string; avatar_url: string | null } | null;
};

async function resolveEmployeeId(
  supabase: Awaited<ReturnType<typeof import("@/integrations/supabase/client")["supabase"]["auth"]["getUser"]>> extends never ? never : any,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No employee record linked to this account. Ask an admin to provision you.");
  return data.id as string;
}

export const getMyOpenShift = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AttendanceLog | null> => {
    const empId = await resolveEmployeeId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("attendance_logs")
      .select("id, employee_id, clock_in, clock_out, notes")
      .eq("employee_id", empId)
      .is("clock_out", null)
      .order("clock_in", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as AttendanceLog | null) ?? null;
  });

export const listMyAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AttendanceLog[]> => {
    const empId = await resolveEmployeeId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("attendance_logs")
      .select("id, employee_id, clock_in, clock_out, notes")
      .eq("employee_id", empId)
      .order("clock_in", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return (data as AttendanceLog[]) ?? [];
  });

export const listTeamAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AttendanceLog[]> => {
    const { data, error } = await context.supabase
      .from("attendance_logs")
      .select("id, employee_id, clock_in, clock_out, notes, employee:employees(id, full_name, avatar_url)")
      .order("clock_in", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as AttendanceLog[];
  });

export const clockIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { notes?: string }) =>
    z.object({ notes: z.string().trim().max(500).optional() }).parse(d),
  )
  .handler(async ({ context, data }): Promise<AttendanceLog> => {
    const empId = await resolveEmployeeId(context.supabase, context.userId);
    // Ensure no open shift
    const { data: open } = await context.supabase
      .from("attendance_logs")
      .select("id")
      .eq("employee_id", empId)
      .is("clock_out", null)
      .limit(1)
      .maybeSingle();
    if (open) throw new Error("You already have an open shift. Clock out first.");
    const { data: row, error } = await context.supabase
      .from("attendance_logs")
      .insert({ employee_id: empId, notes: data.notes ?? null })
      .select("id, employee_id, clock_in, clock_out, notes")
      .single();
    if (error) throw new Error(error.message);
    return row as AttendanceLog;
  });

export const clockOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<AttendanceLog> => {
    const { data: row, error } = await context.supabase
      .from("attendance_logs")
      .update({ clock_out: new Date().toISOString() })
      .eq("id", data.id)
      .select("id, employee_id, clock_in, clock_out, notes")
      .single();
    if (error) throw new Error(error.message);
    return row as AttendanceLog;
  });
