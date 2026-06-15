import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type JobRow = {
  id: string;
  title: string;
  location: string | null;
  employment_type: string;
  status: string;
  openings: number;
  salary_min: number | null;
  salary_max: number | null;
  posted_at: string | null;
  closes_at: string | null;
  description: string | null;
  department: { id: string; name: string } | null;
  application_count?: number;
};

export type CandidateRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  source: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  notes: string | null;
};

export type ApplicationRow = {
  id: string;
  job_id: string;
  candidate_id: string;
  stage: string;
  rating: number | null;
  notes: string | null;
  applied_at: string;
  candidate: { id: string; full_name: string; email: string } | null;
  job: { id: string; title: string } | null;
};

const STAGES = ["applied","screening","interview","offer","hired","rejected","withdrawn"] as const;
const STATUSES = ["draft","open","on_hold","closed"] as const;
const TYPES = ["full_time","part_time","contract","intern"] as const;

export const listJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<JobRow[]> => {
    const { data, error } = await context.supabase
      .from("jobs")
      .select("id,title,location,employment_type,status,openings,salary_min,salary_max,posted_at,closes_at,description, department:departments(id,name), applications(count)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as (JobRow & { applications?: { count: number }[] })[]).map((j) => ({
      ...j,
      application_count: j.applications?.[0]?.count ?? 0,
    }));
  });

export const createJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    title: string; location?: string; employment_type: string; status: string;
    openings: number; salary_min?: number | null; salary_max?: number | null;
    description?: string; department_id?: string | null;
  }) => {
    if (!data.title || data.title.length > 200) throw new Error("title required (<=200 chars)");
    if (!TYPES.includes(data.employment_type as typeof TYPES[number])) throw new Error("bad employment_type");
    if (!STATUSES.includes(data.status as typeof STATUSES[number])) throw new Error("bad status");
    if (!Number.isInteger(data.openings) || data.openings < 1 || data.openings > 1000) throw new Error("bad openings");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: emp } = await supabase
      .from("employees")
      .select("organization_id")
      .eq("user_id", userId)
      .maybeSingle();
    const orgId = emp?.organization_id;
    if (!orgId) throw new Error("No organization associated with this account.");

    const { data: row, error } = await supabase.from("jobs").insert({
      title: data.title,
      location: data.location || null,
      employment_type: data.employment_type as typeof TYPES[number],
      status: data.status as typeof STATUSES[number],
      openings: data.openings,
      salary_min: data.salary_min ?? null,
      salary_max: data.salary_max ?? null,
      description: data.description || null,
      department_id: data.department_id || null,
      posted_at: data.status === "open" ? new Date().toISOString() : null,
      created_by: userId,
      organization_id: orgId,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateJobStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: string }) => {
    if (!STATUSES.includes(data.status as typeof STATUSES[number])) throw new Error("bad status");
    return data;
  })
  .handler(async ({ data, context }) => {
    const patch: { status: typeof STATUSES[number]; posted_at?: string; closes_at?: string } = { status: data.status as typeof STATUSES[number] };
    if (data.status === "open") patch.posted_at = new Date().toISOString();
    if (data.status === "closed") patch.closes_at = new Date().toISOString();
    const { error } = await context.supabase.from("jobs").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CandidateRow[]> => {
    const { data, error } = await context.supabase
      .from("candidates")
      .select("id,full_name,email,phone,location,source,linkedin_url,resume_url,notes")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    full_name: string; email: string; phone?: string; location?: string;
    source?: string; linkedin_url?: string; notes?: string;
  }) => {
    if (!data.full_name || data.full_name.length > 200) throw new Error("name required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error("bad email");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { data: emp } = await context.supabase
      .from("employees")
      .select("organization_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    const orgId = emp?.organization_id;
    if (!orgId) throw new Error("No organization associated with this account.");

    const { data: row, error } = await context.supabase.from("candidates").insert({
      full_name: data.full_name,
      email: data.email.toLowerCase(),
      phone: data.phone || null,
      location: data.location || null,
      source: data.source || null,
      linkedin_url: data.linkedin_url || null,
      notes: data.notes || null,
      organization_id: orgId,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { jobId?: string } | undefined) => data ?? {})
  .handler(async ({ data, context }): Promise<ApplicationRow[]> => {
    let q = context.supabase
      .from("applications")
      .select("id,job_id,candidate_id,stage,rating,notes,applied_at, candidate:candidates(id,full_name,email), job:jobs(id,title)")
      .order("applied_at", { ascending: false });
    if (data.jobId) q = q.eq("job_id", data.jobId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as ApplicationRow[];
  });

export const createApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { job_id: string; candidate_id: string; stage?: string }) => {
    if (!data.job_id || !data.candidate_id) throw new Error("job_id and candidate_id required");
    if (data.stage && !STAGES.includes(data.stage as typeof STAGES[number])) throw new Error("bad stage");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("applications").insert({
      job_id: data.job_id,
      candidate_id: data.candidate_id,
      stage: (data.stage ?? "applied") as typeof STAGES[number],
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateApplicationStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; stage: string; rating?: number | null }) => {
    if (!STAGES.includes(data.stage as typeof STAGES[number])) throw new Error("bad stage");
    if (data.rating != null && (data.rating < 1 || data.rating > 5)) throw new Error("bad rating");
    return data;
  })
  .handler(async ({ data, context }) => {
    const patch: { stage: typeof STAGES[number]; rating?: number | null } = { stage: data.stage as typeof STAGES[number] };
    if (data.rating !== undefined) patch.rating = data.rating;
    const { error } = await context.supabase.from("applications").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
