import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  cancelLeaveRequest,
  decideLeaveRequest,
  listLeaveTypes,
  listMyBalances,
  listMyLeaveRequests,
  listPendingApprovals,
  submitLeaveRequest,
  type LeaveRequest,
} from "@/lib/leave.functions";

export function LeaveView() {
  const qc = useQueryClient();
  const fetchTypes = useServerFn(listLeaveTypes);
  const fetchBal = useServerFn(listMyBalances);
  const fetchMine = useServerFn(listMyLeaveRequests);
  const fetchPending = useServerFn(listPendingApprovals);
  const submit = useServerFn(submitLeaveRequest);
  const cancel = useServerFn(cancelLeaveRequest);
  const decide = useServerFn(decideLeaveRequest);

  const types = useQuery({ queryKey: ["leave", "types"], queryFn: () => fetchTypes() });
  const balances = useQuery({ queryKey: ["leave", "balances"], queryFn: () => fetchBal() });
  const mine = useQuery({ queryKey: ["leave", "mine"], queryFn: () => fetchMine() });
  const pending = useQuery({ queryKey: ["leave", "pending"], queryFn: () => fetchPending() });

  const invalidateAll = () => qc.invalidateQueries({ queryKey: ["leave"] });

  const submitMut = useMutation({
    mutationFn: (data: { leave_type_id: string; start_date: string; end_date: string; reason?: string }) =>
      submit({ data }),
    onSuccess: () => {
      toast.success("Request submitted");
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const cancelMut = useMutation({
    mutationFn: (id: string) => cancel({ data: { id } }),
    onSuccess: () => {
      toast.success("Request cancelled");
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const decideMut = useMutation({
    mutationFn: (v: { id: string; approve: boolean }) => decide({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.approve ? "Approved" : "Rejected");
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {(balances.data ?? []).map((b) => {
          const remaining = Number(b.allocated) - Number(b.used);
          return (
            <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: b.leave_type?.color ?? "#0ea5e9" }}
                />
                <div className="text-xs uppercase tracking-wider text-slate-500">
                  {b.leave_type?.name}
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold">{remaining}</div>
              <div className="text-xs text-slate-500">
                of {b.allocated} days remaining
              </div>
            </div>
          );
        })}
        {balances.data && balances.data.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No leave balances allocated for this year yet.
          </div>
        )}
      </div>

      <RequestForm
        types={(types.data ?? []).map((t) => ({ id: t.id, name: t.name }))}
        submitting={submitMut.isPending}
        onSubmit={(v) => submitMut.mutate(v)}
      />

      <section>
        <SectionHeader title="My requests" />
        <RequestList
          rows={mine.data ?? []}
          loading={mine.isLoading}
          showWho={false}
          onCancel={(id) => cancelMut.mutate(id)}
        />
      </section>

      <section>
        <SectionHeader title="Pending approvals" subtitle="Managers and admins only" />
        <RequestList
          rows={pending.data ?? []}
          loading={pending.isLoading}
          showWho
          onDecide={(id, approve) => decideMut.mutate({ id, approve })}
        />
      </section>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
    </div>
  );
}

function RequestForm({
  types,
  submitting,
  onSubmit,
}: {
  types: { id: string; name: string }[];
  submitting: boolean;
  onSubmit: (v: { leave_type_id: string; start_date: string; end_date: string; reason?: string }) => void;
}) {
  const [type, setType] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!type || !start || !end) return;
        onSubmit({ leave_type_id: type, start_date: start, end_date: end, reason: reason || undefined });
        setReason("");
      }}
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <div className="mb-3 text-sm font-semibold">Request time off</div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <select
          required
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Leave type…</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input
          required
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <input
          required
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <button
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </div>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        rows={2}
        className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
      />
    </form>
  );
}

function RequestList({
  rows,
  loading,
  showWho,
  onCancel,
  onDecide,
}: {
  rows: LeaveRequest[];
  loading: boolean;
  showWho: boolean;
  onCancel?: (id: string) => void;
  onDecide?: (id: string, approve: boolean) => void;
}) {
  if (loading)
    return <div className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  if (rows.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        Nothing here.
      </div>
    );
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
          <tr>
            {showWho && <th className="px-4 py-2">Employee</th>}
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Dates</th>
            <th className="px-4 py-2">Days</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id}>
              {showWho && <td className="px-4 py-2 font-medium">{r.employee?.full_name ?? "—"}</td>}
              <td className="px-4 py-2">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: r.leave_type?.color ?? "#0ea5e9" }}
                  />
                  {r.leave_type?.name ?? "—"}
                </span>
              </td>
              <td className="px-4 py-2 text-slate-600">
                {r.start_date} → {r.end_date}
              </td>
              <td className="px-4 py-2">{r.days}</td>
              <td className="px-4 py-2">
                <StatusPill status={r.status} />
              </td>
              <td className="px-4 py-2 text-right">
                {onCancel && r.status === "pending" && (
                  <button
                    onClick={() => onCancel(r.id)}
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Cancel
                  </button>
                )}
                {onDecide && r.status === "pending" && (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onDecide(r.id, true)}
                      className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => onDecide(r.id, false)}
                      className="rounded bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status }: { status: LeaveRequest["status"] }) {
  const map: Record<LeaveRequest["status"], string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-rose-100 text-rose-800",
    cancelled: "bg-slate-200 text-slate-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${map[status]}`}>
      {status}
    </span>
  );
}
