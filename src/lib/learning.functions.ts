import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  duration: string | null;
  is_mandatory: boolean;
  due_date: string | null;
  created_at: string;
};

export type EnrollmentRow = {
  id: string;
  course_id: string;
  progress: number;
  status: "not_started" | "in_progress" | "completed";
  enrolled_at: string;
  completed_at: string | null;
  course: CourseRow | null;
};

export const listMyEnrollments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EnrollmentRow[]> => {
    const { supabase, userId } = context;

    // Get employee id
    const { data: emp } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!emp) return [];

    const { data, error } = await supabase
      .from("enrollments")
      .select("*, course:courses(*)")
      .eq("employee_id", emp.id)
      .order("enrolled_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as EnrollmentRow[];
  });

export const listAvailableCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CourseRow[]> => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as CourseRow[];
  });

export const enrollInCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { course_id: string }) => {
    if (!data.course_id) throw new Error("Course ID required");
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

    const { data: enrollment, error } = await supabase
      .from("enrollments")
      .insert({
        employee_id: emp.id,
        course_id: data.course_id,
        progress: 0,
        status: "in_progress",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return enrollment;
  });

export const updateEnrollmentProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { enrollment_id: string; progress: number }) => {
    if (!data.enrollment_id) throw new Error("Enrollment ID required");
    if (typeof data.progress !== "number" || data.progress < 0 || data.progress > 100) {
      throw new Error("Progress must be between 0 and 100");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const status = data.progress === 100 ? "completed" : "in_progress";
    const completedAt = data.progress === 100 ? new Date().toISOString() : null;

    const { error } = await supabase
      .from("enrollments")
      .update({
        progress: data.progress,
        status,
        completed_at: completedAt,
      })
      .eq("id", data.enrollment_id);

    if (error) throw new Error(error.message);
    return { success: true };
  });
