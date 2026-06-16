import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyEnrollments, listAvailableCourses, enrollInCourse, updateEnrollmentProgress } from "@/lib/learning.functions";
import { toast } from "sonner";

export function LearningView() {
  const qc = useQueryClient();
  const fetchEnrollments = useServerFn(listMyEnrollments);
  const fetchCourses = useServerFn(listAvailableCourses);
  const triggerEnroll = useServerFn(enrollInCourse);
  const triggerProgress = useServerFn(updateEnrollmentProgress);

  const enrollments = useQuery({ queryKey: ["learning", "enrollments"], queryFn: () => fetchEnrollments() });
  const courses = useQuery({ queryKey: ["learning", "courses"], queryFn: () => fetchCourses() });

  const enrollMut = useMutation({
    mutationFn: (course_id: string) => triggerEnroll({ data: { course_id } }),
    onSuccess: () => {
      toast.success("Enrolled in course!");
      qc.invalidateQueries({ queryKey: ["learning"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const progressMut = useMutation({
    mutationFn: (v: { enrollment_id: string; progress: number }) => triggerProgress({ data: v }),
    onSuccess: () => {
      toast.success("Course progress updated!");
      qc.invalidateQueries({ queryKey: ["learning"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enrolledCourseIds = new Set(enrollments.data?.map((e) => e.course_id) ?? []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Learning & Development</h1>
          <p className="text-sm text-slate-500 mt-1">Track your progress, complete compliance, and level up your skills.</p>
        </div>
      </div>

      {/* Skill Gap Analysis Banner */}
      <div className="rounded-xl bg-white p-5 border-l-4 border-violet-500 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 shrink-0">
            <span className="material-symbols-outlined">auto_awesome</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Skill Gap Analysis: Leadership Potential</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">Based on your recent performance review and goals, Evai suggests focusing on "Conflict Resolution" and "Strategic Thinking" to prepare for promotion cycles.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Active learning courses */}
        <div className="md:col-span-8 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600">play_circle</span> Active Learning
          </h3>

          {enrollments.data && enrollments.data.map((e) => {
            const c = e.course;
            if (!c) return null;
            return (
              <div key={e.id} className="rounded-xl bg-white p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="w-full sm:w-32 h-20 rounded bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 text-xs font-semibold uppercase">
                  {c.category}
                </div>
                <div className="flex-1 w-full text-xs">
                  <div className="flex justify-between items-start mb-1">
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[9px] uppercase tracking-wider">{c.category}</span>
                    {c.is_mandatory && e.status !== "completed" && (
                      <span className="text-red-600 font-bold flex items-center gap-0.5"><span className="material-symbols-outlined text-xs">warning</span> Required</span>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">{c.title}</h4>
                  <p className="text-slate-500 mb-3">{c.description}</p>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Progress</span>
                        <span>{e.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${e.progress}%` }}></div>
                      </div>
                    </div>
                    {e.status !== "completed" ? (
                      <button
                        onClick={() => progressMut.mutate({ enrollment_id: e.id, progress: Math.min(100, e.progress + 25) })}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors shrink-0"
                      >
                        {e.progress === 0 ? "Start" : "Resume"}
                      </button>
                    ) : (
                      <span className="text-emerald-600 font-bold flex items-center gap-0.5"><span className="material-symbols-outlined text-sm">verified</span> Done</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {(!enrollments.data || enrollments.data.length === 0) && (
            <div className="text-center text-slate-400 py-12 border border-dashed border-slate-200 bg-white rounded-xl text-xs">
              You are not enrolled in any courses. Check out the Course Catalog below to get started!
            </div>
          )}
        </div>

        {/* Sidebar Certifications */}
        <div className="md:col-span-4 space-y-4">
          <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-sm text-xs">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400">military_tech</span> Certifications
            </h3>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 relative overflow-hidden">
              <div className="flex justify-between font-bold mb-1">
                <span>Compliance Champion</span>
                <span className="text-emerald-600">Active</span>
              </div>
              <p className="text-slate-500">Expires Dec 2026</p>
            </div>
          </div>
        </div>

        {/* Course Catalog (Full width) */}
        <div className="md:col-span-12 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600">explore</span> Browse Catalog
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {courses.data && courses.data.map((c) => {
              const enrolled = enrolledCourseIds.has(c.id);
              return (
                <div key={c.id} className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between text-xs">
                  <div className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold text-[9px] uppercase">{c.category}</span>
                      <span className="text-slate-400 text-[10px]">{c.duration || "N/A"}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{c.title}</h4>
                    <p className="text-slate-500 line-clamp-2">{c.description}</p>
                  </div>
                  <div className="p-4 pt-0">
                    <button
                      disabled={enrolled || enrollMut.isPending}
                      onClick={() => enrollMut.mutate(c.id)}
                      className={`w-full py-1.5 rounded font-bold text-center border transition-all ${
                        enrolled ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed" : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {enrolled ? "Enrolled" : "Enroll"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
