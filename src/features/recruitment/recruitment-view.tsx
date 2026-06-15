import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listJobs, createJob, updateJobStatus,
  listCandidates, createCandidate,
  listApplications, createApplication, updateApplicationStage,
  type JobRow,
} from "@/lib/recruitment.functions";

const STAGES = ["applied","screening","interview","offer","hired","rejected","withdrawn"] as const;
const STAGE_COLORS: Record<string, string> = {
  applied: "bg-slate-100 text-slate-700",
  screening: "bg-blue-100 text-blue-700",
  interview: "bg-violet-100 text-violet-700",
  offer: "bg-amber-100 text-amber-800",
  hired: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  withdrawn: "bg-slate-100 text-slate-500",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  open: "bg-emerald-100 text-emerald-700",
  on_hold: "bg-amber-100 text-amber-700",
  closed: "bg-slate-200 text-slate-600",
};

export function RecruitmentView() {
  const [tab, setTab] = useState<"jobs" | "candidates" | "pipeline">("jobs");
  const [selectedJob, setSelectedJob] = useState<JobRow | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-6">
        {(["jobs","candidates","pipeline"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelectedJob(null); }}
            className={`px-4 py-3 text-sm font-medium capitalize transition-colors ${
              tab === t ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-500 hover:text-slate-900"
            }`}
          >{t}</button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-6">
        {tab === "jobs" && <JobsPanel onOpen={(j) => { setSelectedJob(j); setTab("pipeline"); }} />}
        {tab === "candidates" && <CandidatesPanel />}
        {tab === "pipeline" && <PipelinePanel jobFilter={selectedJob} clearFilter={() => setSelectedJob(null)} />}
      </div>
    </div>
  );
}

// =========== JOBS ===========
function JobsPanel({ onOpen }: { onOpen: (j: JobRow) => void }) {
  const list = useServerFn(listJobs);
  const create = useServerFn(createJob);
  const setStatus = useServerFn(updateJobStatus);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["jobs"], queryFn: () => list() });
  const [showForm, setShowForm] = useState(false);

  const createMut = useMutation({
    mutationFn: (input: Parameters<typeof create>[0]["data"]) => create({ data: input }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); setShowForm(false); },
  });
  const statusMut = useMutation({
    mutationFn: (input: { id: string; status: string }) => setStatus({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Open positions</h2>
        <button onClick={() => setShowForm((v) => !v)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          {showForm ? "Cancel" : "+ Post a job"}
        </button>
      </div>

      {showForm && <JobForm onSubmit={(v) => createMut.mutate(v)} pending={createMut.isPending} />}

      {isLoading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : !data?.length ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No jobs yet. Post your first opening.
        </div>
      ) : (
        <div className="grid gap-3">
          {data.map((j) => (
            <div key={j.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold">{j.title}</h3>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[j.status]}`}>{j.status.replace("_"," ")}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {j.department?.name ?? "—"} · {j.location ?? "Remote"} · {j.employment_type.replace("_"," ")} · {j.openings} opening{j.openings === 1 ? "" : "s"}
                  </div>
                  {j.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{j.description}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-xs font-medium text-slate-500">{j.application_count ?? 0} applicants</span>
                  <button onClick={() => onOpen(j)} className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">View pipeline →</button>
                  <select
                    value={j.status}
                    onChange={(e) => statusMut.mutate({ id: j.id, status: e.target.value })}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                  >
                    <option value="draft">Draft</option>
                    <option value="open">Open</option>
                    <option value="on_hold">On hold</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JobForm({ onSubmit, pending }: { onSubmit: (v: { title: string; location: string; employment_type: string; status: string; openings: number; description: string }) => void; pending: boolean }) {
  const [form, setForm] = useState({ title: "", location: "", employment_type: "full_time", status: "open", openings: 1, description: "" });
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
      className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2"
    >
      <input required placeholder="Job title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
      <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm" />
      <input type="number" min={1} placeholder="Openings" value={form.openings} onChange={(e) => setForm({ ...form, openings: Number(e.target.value) })} className="rounded border border-slate-300 px-3 py-2 text-sm" />
      <select value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm">
        <option value="full_time">Full-time</option>
        <option value="part_time">Part-time</option>
        <option value="contract">Contract</option>
        <option value="intern">Intern</option>
      </select>
      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm">
        <option value="draft">Draft</option>
        <option value="open">Open</option>
        <option value="on_hold">On hold</option>
      </select>
      <textarea placeholder="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
      <button disabled={pending} className="sm:col-span-2 rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Saving…" : "Create job"}
      </button>
    </form>
  );
}

// =========== CANDIDATES ===========
function CandidatesPanel() {
  const list = useServerFn(listCandidates);
  const create = useServerFn(createCandidate);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["candidates"], queryFn: () => list() });
  const [showForm, setShowForm] = useState(false);
  const createMut = useMutation({
    mutationFn: (input: Parameters<typeof create>[0]["data"]) => create({ data: input }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["candidates"] }); setShowForm(false); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Candidate pool</h2>
        <button onClick={() => setShowForm((v) => !v)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
          {showForm ? "Cancel" : "+ Add candidate"}
        </button>
      </div>

      {showForm && <CandidateForm onSubmit={(v) => createMut.mutate(v)} pending={createMut.isPending} />}

      {isLoading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : !data?.length ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No candidates yet.</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Location</th>
                <th className="px-4 py-2 text-left">Source</th>
                <th className="px-4 py-2 text-left">LinkedIn</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium">{c.full_name}</td>
                  <td className="px-4 py-2 text-slate-600">{c.email}</td>
                  <td className="px-4 py-2 text-slate-600">{c.location ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{c.source ?? "—"}</td>
                  <td className="px-4 py-2">{c.linkedin_url ? <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Profile</a> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CandidateForm({ onSubmit, pending }: { onSubmit: (v: { full_name: string; email: string; phone: string; location: string; source: string; linkedin_url: string; notes: string }) => void; pending: boolean }) {
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", location: "", source: "", linkedin_url: "", notes: "" });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
      <input required placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm" />
      <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm" />
      <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm" />
      <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm" />
      <input placeholder="Source (LinkedIn, referral…)" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm" />
      <input placeholder="LinkedIn URL" value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm" />
      <textarea placeholder="Notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
      <button disabled={pending} className="sm:col-span-2 rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Saving…" : "Add candidate"}
      </button>
    </form>
  );
}

// =========== PIPELINE ===========
function PipelinePanel({ jobFilter, clearFilter }: { jobFilter: JobRow | null; clearFilter: () => void }) {
  const list = useServerFn(listApplications);
  const setStage = useServerFn(updateApplicationStage);
  const createApp = useServerFn(createApplication);
  const listJobsFn = useServerFn(listJobs);
  const listCandidatesFn = useServerFn(listCandidates);
  const qc = useQueryClient();

  const { data: apps, isLoading } = useQuery({
    queryKey: ["applications", jobFilter?.id ?? "all"],
    queryFn: () => list({ data: { jobId: jobFilter?.id } }),
  });
  const { data: jobs } = useQuery({ queryKey: ["jobs"], queryFn: () => listJobsFn() });
  const { data: candidates } = useQuery({ queryKey: ["candidates"], queryFn: () => listCandidatesFn() });

  const stageMut = useMutation({
    mutationFn: (i: { id: string; stage: string }) => setStage({ data: i }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications"] }),
  });
  const createMut = useMutation({
    mutationFn: (i: { job_id: string; candidate_id: string }) => createApp({ data: i }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications"] }),
    onError: (e: Error) => alert(e.message),
  });

  const [linkJob, setLinkJob] = useState("");
  const [linkCand, setLinkCand] = useState("");

  const grouped = STAGES.reduce<Record<string, typeof apps>>((acc, s) => {
    acc[s] = (apps ?? []).filter((a) => a.stage === s);
    return acc;
  }, {} as Record<string, typeof apps>);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Hiring pipeline</h2>
          {jobFilter && (
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              Filtered to: <span className="font-semibold text-slate-700">{jobFilter.title}</span>
              <button onClick={clearFilter} className="text-blue-600 hover:underline">clear</button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[11px] font-medium uppercase text-slate-500">Job</label>
          <select value={linkJob} onChange={(e) => setLinkJob(e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Select job…</option>
            {jobs?.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[11px] font-medium uppercase text-slate-500">Candidate</label>
          <select value={linkCand} onChange={(e) => setLinkCand(e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Select candidate…</option>
            {candidates?.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </div>
        <button
          disabled={!linkJob || !linkCand || createMut.isPending}
          onClick={() => { createMut.mutate({ job_id: linkJob, candidate_id: linkCand }); setLinkJob(""); setLinkCand(""); }}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >Add to pipeline</button>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {STAGES.filter((s) => s !== "withdrawn").map((s) => (
            <div key={s} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${STAGE_COLORS[s]}`}>{s}</span>
                <span className="text-xs font-medium text-slate-500">{grouped[s]?.length ?? 0}</span>
              </div>
              <div className="space-y-2">
                {grouped[s]?.map((a) => (
                  <div key={a.id} className="rounded-md border border-slate-200 bg-white p-2 shadow-sm">
                    <div className="text-sm font-medium">{a.candidate?.full_name ?? "—"}</div>
                    <div className="truncate text-[11px] text-slate-500">{a.job?.title}</div>
                    <select
                      value={a.stage}
                      onChange={(e) => stageMut.mutate({ id: a.id, stage: e.target.value })}
                      className="mt-2 w-full rounded border border-slate-200 px-1.5 py-1 text-[11px]"
                    >
                      {STAGES.map((st) => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                ))}
                {!grouped[s]?.length && <div className="px-1 py-2 text-[11px] text-slate-400">Empty</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
