import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type GoalRow = {
  id: string;
  employee_id: string;
  title: string;
  description: string | null;
  status: "not_started" | "in_progress" | "completed" | "cancelled";
  progress: number;
  weight: number;
  due_date: string | null;
  employee?: { full_name: string } | null;
};

export type ReviewRow = {
  id: string;
  employee_id: string;
  reviewer_id: string | null;
  cycle_name: string;
  period_start: string;
  period_end: string;
  overall_rating: number | null;
  strengths: string | null;
  improvements: string | null;
  status: "draft" | "submitted" | "acknowledged";
  employee?: { full_name: string } | null;
  reviewer?: { full_name: string } | null;
};

export type FeedbackRow = {
  id: string;
  from_employee_id: string;
  to_employee_id: string;
  type: "praise" | "suggestion";
  visibility: "private" | "manager" | "public";
  message: string;
  created_at: string;
  from?: { full_name: string } | null;
  to?: { full_name: string } | null;
};

const GOAL_STATUSES = ["not_started","in_progress","completed","cancelled"] as const;
const REVIEW_STATUSES = ["draft","submitted","acknowledged"] as const;
const FB_TYPES = ["praise","suggestion"] as const;
const FB_VIS = ["private","manager","public"] as const;

// ----- GOALS -----
export const listMyGoals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GoalRow[]> => {
    const { data: empId } = await context.supabase.rpc("current_employee_id");
    if (!empId) return [];
    const { data, error } = await context.supabase
      .from("goals")
      .select("id,employee_id,title,description,status,progress,weight,due_date")
      .eq("employee_id", empId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as GoalRow[];
  });

export const listTeamGoals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GoalRow[]> => {
    const { data, error } = await context.supabase
      .from("goals")
      .select("id,employee_id,title,description,status,progress,weight,due_date, employee:employees(full_name)")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as GoalRow[];
  });

export const createGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; description?: string; due_date?: string; weight?: number; employee_id?: string }) => {
    if (!d.title || d.title.length > 200) throw new Error("title required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { data: empId } = await context.supabase.rpc("current_employee_id");
    const target = data.employee_id || empId;
    if (!target) throw new Error("No employee record for current user");
    const { error } = await context.supabase.from("goals").insert({
      employee_id: target,
      title: data.title,
      description: data.description || null,
      due_date: data.due_date || null,
      weight: data.weight ?? 1,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; progress?: number; status?: string }) => {
    if (d.progress != null && (d.progress < 0 || d.progress > 100)) throw new Error("bad progress");
    if (d.status && !GOAL_STATUSES.includes(d.status as typeof GOAL_STATUSES[number])) throw new Error("bad status");
    return d;
  })
  .handler(async ({ data, context }) => {
    const patch: { progress?: number; status?: typeof GOAL_STATUSES[number] } = {};
    if (data.progress != null) {
      patch.progress = data.progress;
      if (data.progress === 100) patch.status = "completed";
      else if (data.progress > 0) patch.status = "in_progress";
    }
    if (data.status) patch.status = data.status as typeof GOAL_STATUSES[number];
    const { error } = await context.supabase.from("goals").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("goals").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----- REVIEWS -----
export const listMyReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReviewRow[]> => {
    const { data, error } = await context.supabase
      .from("performance_reviews")
      .select("id,employee_id,reviewer_id,cycle_name,period_start,period_end,overall_rating,strengths,improvements,status, employee:employees!performance_reviews_employee_id_fkey(full_name), reviewer:employees!performance_reviews_reviewer_id_fkey(full_name)")
      .order("period_end", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ReviewRow[];
  });

export const createReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { employee_id: string; cycle_name: string; period_start: string; period_end: string; overall_rating?: number; strengths?: string; improvements?: string }) => {
    if (!d.employee_id || !d.cycle_name || !d.period_start || !d.period_end) throw new Error("missing fields");
    if (d.overall_rating != null && (d.overall_rating < 1 || d.overall_rating > 5)) throw new Error("bad rating");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { data: empId } = await context.supabase.rpc("current_employee_id");
    const { error } = await context.supabase.from("performance_reviews").insert({
      employee_id: data.employee_id,
      reviewer_id: empId,
      cycle_name: data.cycle_name,
      period_start: data.period_start,
      period_end: data.period_end,
      overall_rating: data.overall_rating ?? null,
      strengths: data.strengths || null,
      improvements: data.improvements || null,
      status: "draft",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateReviewStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string }) => {
    if (!REVIEW_STATUSES.includes(d.status as typeof REVIEW_STATUSES[number])) throw new Error("bad status");
    return d;
  })
  .handler(async ({ data, context }) => {
    const patch: { status: typeof REVIEW_STATUSES[number]; submitted_at?: string; acknowledged_at?: string } = { status: data.status as typeof REVIEW_STATUSES[number] };
    if (data.status === "submitted") patch.submitted_at = new Date().toISOString();
    if (data.status === "acknowledged") patch.acknowledged_at = new Date().toISOString();
    const { error } = await context.supabase.from("performance_reviews").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----- FEEDBACK -----
export const listFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FeedbackRow[]> => {
    const { data, error } = await context.supabase
      .from("peer_feedback")
      .select("id,from_employee_id,to_employee_id,type,visibility,message,created_at, from:employees!peer_feedback_from_employee_id_fkey(full_name), to:employees!peer_feedback_to_employee_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as FeedbackRow[];
  });

export const sendFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { to_employee_id: string; type: string; visibility: string; message: string }) => {
    if (!d.to_employee_id) throw new Error("recipient required");
    if (!FB_TYPES.includes(d.type as typeof FB_TYPES[number])) throw new Error("bad type");
    if (!FB_VIS.includes(d.visibility as typeof FB_VIS[number])) throw new Error("bad visibility");
    if (!d.message || d.message.length > 1000) throw new Error("message 1-1000 chars");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { data: empId } = await context.supabase.rpc("current_employee_id");
    if (!empId) throw new Error("No employee record for current user");
    if (empId === data.to_employee_id) throw new Error("Can't send feedback to yourself");
    const { error } = await context.supabase.from("peer_feedback").insert({
      from_employee_id: empId,
      to_employee_id: data.to_employee_id,
      type: data.type as typeof FB_TYPES[number],
      visibility: data.visibility as typeof FB_VIS[number],
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
