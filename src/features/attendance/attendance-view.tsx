import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  clockIn,
  clockOut,
  getMyOpenShift,
  listMyAttendance,
  listTeamAttendance,
  type AttendanceLog,
} from "@/lib/attendance.functions";

export function AttendanceView() {
  const qc = useQueryClient();
  const fetchOpen = useServerFn(getMyOpenShift);
  const fetchMine = useServerFn(listMyAttendance);
  const fetchTeam = useServerFn(listTeamAttendance);
  const inFn = useServerFn(clockIn);
  const outFn = useServerFn(clockOut);

  const open = useQuery({ queryKey: ["attendance", "open"], queryFn: () => fetchOpen() });
  const mine = useQuery({ queryKey: ["attendance", "mine"], queryFn: () => fetchMine() });
  const team = useQuery({ queryKey: ["attendance", "team"], queryFn: () => fetchTeam() });

  const invalidateAll = () =>
    qc.invalidateQueries({ queryKey: ["attendance"] });

  const inMut = useMutation({
    mutationFn: () => inFn({ data: {} }),
    onSuccess: () => {
      toast.success("Clocked in");
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const outMut = useMutation({
    mutationFn: (id: string) => outFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Clocked out");
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const todayHours = useMemo(() => {
    const list = mine.data ?? [];
    const today = new Date().toDateString();
    const ms = list
      .filter((l) => new Date(l.clock_in).toDateString() === today && l.clock_out)
      .reduce((s, l) => s + (new Date(l.clock_out!).getTime() - new Date(l.clock_in).getTime()), 0);
    return (ms / 3600000).toFixed(2);
  }, [mine.data]);

  const liveShift = open.data;

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <div className="text-xs uppercase tracking-wider text-slate-500">Status</div>
          <div className="mt-1 flex items-center gap-2 text-lg font-semibold">
            <span
              className={`h-2.5 w-2.5 rounded-full ${liveShift ? "bg-emerald-500" : "bg-slate-300"}`}
            />
            {liveShift ? "Clocked in" : "Clocked out"}
          </div>
          {liveShift && (
            <div className="mt-1 text-xs text-slate-500">
              Since {new Date(liveShift.clock_in).toLocaleTimeString()}
            </div>
          )}
          <div className="mt-4">
            {liveShift ? (
              <button
                onClick={() => outMut.mutate(liveShift.id)}
                disabled={outMut.isPending}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {outMut.isPending ? "Clocking out…" : "Clock out"}
              </button>
            ) : (
              <button
                onClick={() => inMut.mutate()}
                disabled={inMut.isPending}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {inMut.isPending ? "Clocking in…" : "Clock in now"}
              </button>
            )}
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wider text-slate-500">Today</div>
          <div className="mt-1 text-2xl font-bold">{todayHours} h</div>
          <div className="text-xs text-slate-500">Hours logged today</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wider text-slate-500">This week</div>
          <div className="mt-1 text-2xl font-bold">{weekHours(mine.data ?? [])} h</div>
          <div className="text-xs text-slate-500">Last 7 days</div>
        </Card>
      </div>

      <section>
        <SectionHeader title="My recent shifts" />
        <ShiftTable logs={mine.data ?? []} loading={mine.isLoading} showName={false} />
      </section>

      <section>
        <SectionHeader title="Team activity (latest)" subtitle="Visible to managers and admins" />
        <ShiftTable logs={team.data ?? []} loading={team.isLoading} showName />
      </section>
    </div>
  );
}

function weekHours(logs: AttendanceLog[]) {
  const cutoff = Date.now() - 7 * 86400000;
  const ms = logs
    .filter((l) => l.clock_out && new Date(l.clock_in).getTime() > cutoff)
    .reduce((s, l) => s + (new Date(l.clock_out!).getTime() - new Date(l.clock_in).getTime()), 0);
  return (ms / 3600000).toFixed(1);
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-5">{children}</div>;
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
    </div>
  );
}

function ShiftTable({
  logs,
  loading,
  showName,
}: {
  logs: AttendanceLog[];
  loading: boolean;
  showName: boolean;
}) {
  if (loading)
    return <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />;
  if (logs.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        No entries yet.
      </div>
    );
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
          <tr>
            {showName && <th className="px-4 py-2">Employee</th>}
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">In</th>
            <th className="px-4 py-2">Out</th>
            <th className="px-4 py-2">Duration</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {logs.map((l) => {
            const inT = new Date(l.clock_in);
            const outT = l.clock_out ? new Date(l.clock_out) : null;
            const dur = outT ? ((outT.getTime() - inT.getTime()) / 3600000).toFixed(2) + " h" : "—";
            return (
              <tr key={l.id}>
                {showName && (
                  <td className="px-4 py-2 font-medium">
                    {l.employee?.full_name ?? "—"}
                  </td>
                )}
                <td className="px-4 py-2 text-slate-600">{inT.toLocaleDateString()}</td>
                <td className="px-4 py-2">{inT.toLocaleTimeString()}</td>
                <td className="px-4 py-2">
                  {outT ? (
                    outT.toLocaleTimeString()
                  ) : (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600">{dur}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
