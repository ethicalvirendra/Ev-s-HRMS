import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listMyGoals, listTeamGoals, createGoal, updateGoal, deleteGoal,
  listMyReviews, createReview, updateReviewStatus,
  listFeedback, sendFeedback,
} from "@/lib/talent.functions";
import { listEmployees } from "@/lib/employees.functions";

const STATUS_COLORS: Record<string, string> = {
  not_started: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-500",
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-amber-100 text-amber-800",
  acknowledged: "bg-emerald-100 text-emerald-700",
};

export function TalentView() {
  const [tab, setTab] = useState<"goals" | "reviews" | "feedback">("goals");
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-6">
        {(["goals","reviews","feedback"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium capitalize transition-colors ${
              tab === t ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-500 hover:text-slate-900"
            }`}
          >{t}</button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-6">
        {tab === "goals" && <GoalsPanel />}
        {tab === "reviews" && <ReviewsPanel />}
        {tab === "feedback" && <FeedbackPanel />}
      </div>
    </div>
  );
}

// ============ GOALS ============
function GoalsPanel() {
  const listMine = useServerFn(listMyGoals);
  const listTeam = useServerFn(listTeamGoals);
  const create = useServerFn(createGoal);
  const update = useServerFn(updateGoal);
  const del = useServerFn(deleteGoal);
  const qc = useQueryClient();

  const [scope, setScope] = useState<"mine" | "team">("mine");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", due_date: "", weight: 1 });

  const { data, isLoading } = useQuery({
    queryKey: ["goals", scope],
    queryFn: () => scope === "mine" ? listMine() : listTeam(),
  });

  const inv = () => qc.invalidateQueries({ queryKey: ["goals"] });
  const createMut = useMutation({ mutationFn: (i: typeof form) => create({ data: i }), onSuccess: () => { inv(); setShowForm(false); setForm({ title: "", description: "", due_date: "", weight: 1 }); } });
  const updateMut = useMutation({ mutationFn: (i: { id: string; progress?: number; status?: string }) => update({ data: i }), onSuccess: inv });
  const delMut = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: inv });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <button onClick={() => setScope("mine")} className={`rounded-md px-3 py-1 text-xs font-medium ${scope === "mine" ? "bg-blue-600 text-white" : "text-slate-600"}`}>My goals</button>
          <button onClick={() => setScope("team")} className={`rounded-md px-3 py-1 text-xs font-medium ${scope === "team" ? "bg-blue-600 text-white" : "text-slate-600"}`}>Team</button>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
          {showForm ? "Cancel" : "+ New goal"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <input required placeholder="Goal title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <textarea placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm" />
          <input type="number" min={1} max={10} placeholder="Weight (1-10)" value={form.weight} onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} className="rounded border border-slate-300 px-3 py-2 text-sm" />
          <button disabled={createMut.isPending} className="sm:col-span-2 rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {createMut.isPending ? "Saving…" : "Create goal"}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : !data?.length ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No goals yet.</div>
      ) : (
        <div className="space-y-3">
          {data.map((g) => (
            <div key={g.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{g.title}</h3>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[g.status]}`}>{g.status.replace("_"," ")}</span>
                  </div>
                  {scope === "team" && g.employee && <div className="mt-0.5 text-xs text-slate-500">{g.employee.full_name}</div>}
                  {g.description && <p className="mt-1 text-sm text-slate-600">{g.description}</p>}
                  {g.due_date && <div className="mt-1 text-xs text-slate-500">Due {g.due_date}</div>}
                </div>
                {scope === "mine" && (
                  <button onClick={() => delMut.mutate(g.id)} className="text-xs text-rose-600 hover:underline">Delete</button>
                )}
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Progress</span>
                  <span className="font-medium text-slate-700">{g.progress}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded bg-slate-100">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${g.progress}%` }} />
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={g.progress}
                  onChange={(e) => updateMut.mutate({ id: g.id, progress: Number(e.target.value) })}
                  className="mt-2 w-full"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ REVIEWS ============
function ReviewsPanel() {
  const list = useServerFn(listMyReviews);
  const create = useServerFn(createReview);
  const setStatus = useServerFn(updateReviewStatus);
  const listEmp = useServerFn(listEmployees);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["reviews"], queryFn: () => list() });
  const { data: employees } = useQuery({ queryKey: ["employees"], queryFn: () => listEmp() });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employee_id: "", cycle_name: "", period_start: "", period_end: "", overall_rating: 3, strengths: "", improvements: "" });

  const inv = () => qc.invalidateQueries({ queryKey: ["reviews"] });
  const createMut = useMutation({ mutationFn: (i: typeof form) => create({ data: i }), onSuccess: () => { inv(); setShowForm(false); } });
  const statusMut = useMutation({ mutationFn: (i: { id: string; status: string }) => setStatus({ data: i }), onSuccess: inv });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Performance reviews</h2>
        <button onClick={() => setShowForm((v) => !v)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
          {showForm ? "Cancel" : "+ Start review"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <select required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2">
            <option value="">Select employee…</option>
            {employees?.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
          <input required placeholder="Cycle name (Q4 2026)" value={form.cycle_name} onChange={(e) => setForm({ ...form, cycle_name: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input required type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm" />
          <input required type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm" />
          <label className="text-xs sm:col-span-2">Overall rating ({form.overall_rating}/5)
            <input type="range" min={1} max={5} value={form.overall_rating} onChange={(e) => setForm({ ...form, overall_rating: Number(e.target.value) })} className="block w-full" />
          </label>
          <textarea placeholder="Strengths" rows={2} value={form.strengths} onChange={(e) => setForm({ ...form, strengths: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <textarea placeholder="Areas for improvement" rows={2} value={form.improvements} onChange={(e) => setForm({ ...form, improvements: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <button disabled={createMut.isPending} className="sm:col-span-2 rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {createMut.isPending ? "Saving…" : "Save draft"}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : !data?.length ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No reviews yet.</div>
      ) : (
        <div className="space-y-3">
          {data.map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{r.employee?.full_name ?? "—"} · {r.cycle_name}</h3>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {r.period_start} → {r.period_end} · Reviewer: {r.reviewer?.full_name ?? "—"}
                  </div>
                </div>
                {r.overall_rating != null && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-amber-500">{"★".repeat(r.overall_rating)}<span className="text-slate-200">{"★".repeat(5 - r.overall_rating)}</span></div>
                    <div className="text-[10px] uppercase text-slate-500">{r.overall_rating}/5</div>
                  </div>
                )}
              </div>
              {r.strengths && <div className="mt-2 text-sm"><span className="font-medium text-emerald-700">Strengths:</span> <span className="text-slate-600">{r.strengths}</span></div>}
              {r.improvements && <div className="mt-1 text-sm"><span className="font-medium text-amber-700">Improve:</span> <span className="text-slate-600">{r.improvements}</span></div>}
              <div className="mt-3 flex gap-2">
                {r.status === "draft" && <button onClick={() => statusMut.mutate({ id: r.id, status: "submitted" })} className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white">Submit</button>}
                {r.status === "submitted" && <button onClick={() => statusMut.mutate({ id: r.id, status: "acknowledged" })} className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">Acknowledge</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ FEEDBACK ============
function FeedbackPanel() {
  const list = useServerFn(listFeedback);
  const send = useServerFn(sendFeedback);
  const listEmp = useServerFn(listEmployees);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["feedback"], queryFn: () => list() });
  const { data: employees } = useQuery({ queryKey: ["employees"], queryFn: () => listEmp() });
  const [form, setForm] = useState({ to_employee_id: "", type: "praise", visibility: "manager", message: "" });

  const sendMut = useMutation({
    mutationFn: (i: typeof form) => send({ data: i }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["feedback"] }); setForm({ to_employee_id: "", type: "praise", visibility: "manager", message: "" }); },
    onError: (e: Error) => alert(e.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={(e) => { e.preventDefault(); sendMut.mutate(form); }} className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Give feedback</h2>
        <select required value={form.to_employee_id} onChange={(e) => setForm({ ...form, to_employee_id: e.target.value })} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">Select colleague…</option>
          {employees?.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="praise">🎉 Praise</option>
            <option value="suggestion">💡 Suggestion</option>
          </select>
          <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="private">Private (just them)</option>
            <option value="manager">Managers can see</option>
            <option value="public">Public (everyone)</option>
          </select>
        </div>
        <textarea required maxLength={1000} rows={3} placeholder="Say something thoughtful…" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        <button disabled={sendMut.isPending} className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {sendMut.isPending ? "Sending…" : "Send feedback"}
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent feedback</h2>
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : !data?.length ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No feedback yet.</div>
        ) : (
          data.map((f) => (
            <div key={f.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span><span className="font-medium text-slate-700">{f.from?.full_name ?? "—"}</span> → <span className="font-medium text-slate-700">{f.to?.full_name ?? "—"}</span></span>
                <span>{new Date(f.created_at).toLocaleDateString()}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[10px] uppercase">
                <span className={f.type === "praise" ? "rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-700" : "rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-700"}>{f.type}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-600">{f.visibility}</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{f.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
