import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useLocation } from "@tanstack/react-router";
import {
  listDepartments,
  listEmployees,
  onboardEmployee,
  offboardEmployee,
  type EmployeeRow,
} from "@/lib/employees.functions";
import { toast } from "sonner";

export function DirectoryView() {
  const fetchEmployees = useServerFn(listEmployees);
  const fetchDepartments = useServerFn(listDepartments);
  const triggerOnboard = useServerFn(onboardEmployee);
  const triggerOffboard = useServerFn(offboardEmployee);

  const qc = useQueryClient();
  const employees = useQuery({ queryKey: ["employees"], queryFn: () => fetchEmployees() });
  const departments = useQuery({ queryKey: ["departments"], queryFn: () => fetchDepartments() });

  const location = useLocation();
  const searchTab = (location.search as any)?.tab;
  const initialTab = searchTab === "onboard" ? "onboard" : searchTab === "offboard" ? "offboard" : "all";

  const [tab, setTab] = useState<"all" | "onboard" | "offboard">(initialTab);
  const [q, setQ] = useState("");
  const [dept, setDept] = useState<string>("all");
  const [active, setActive] = useState<EmployeeRow | null>(null);

  // Form states for onboarding
  const [onboardForm, setOnboardForm] = useState({
    employee_code: "",
    full_name: "",
    email: "",
    phone: "",
    job_title: "",
    department_id: "",
    location: "",
    hire_date: new Date().toISOString().split("T")[0],
  });

  // Sync tab search parameter changes
  useEffect(() => {
    if (searchTab === "onboard") setTab("onboard");
    else if (searchTab === "offboard") setTab("offboard");
    else setTab("all");
  }, [searchTab]);

  const onboardMut = useMutation({
    mutationFn: (data: typeof onboardForm) => triggerOnboard({ data }),
    onSuccess: () => {
      toast.success("Employee onboarded successfully");
      qc.invalidateQueries({ queryKey: ["employees"] });
      setTab("all");
      setOnboardForm({
        employee_code: "",
        full_name: "",
        email: "",
        phone: "",
        job_title: "",
        department_id: "",
        location: "",
        hire_date: new Date().toISOString().split("T")[0],
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const offboardMut = useMutation({
    mutationFn: (data: { id: string; status: "terminated" | "inactive" }) => triggerOffboard({ data }),
    onSuccess: () => {
      toast.success("Employee status updated successfully");
      qc.invalidateQueries({ queryKey: ["employees"] });
      setActive(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = useMemo(() => {
    const list = employees.data ?? [];
    return list.filter((e) => {
      if (dept !== "all" && e.department?.id !== dept) return false;
      if (!q) return true;
      const hay = `${e.full_name} ${e.email} ${e.job_title ?? ""} ${e.employee_code}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [employees.data, q, dept]);

  const activeEmployees = useMemo(() => {
    return (employees.data ?? []).filter((e) => e.status === "active");
  }, [employees.data]);

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardForm.employee_code || !onboardForm.full_name || !onboardForm.email) {
      toast.error("Please fill in code, name, and email.");
      return;
    }
    onboardMut.mutate(onboardForm);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-900">Employee Management</div>
          <div className="text-sm text-slate-500">
            {employees.data?.length ?? 0} total profiles · {activeEmployees.length} active
          </div>
        </div>
        {tab === "all" && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400">
                search
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, email, title…"
                className="w-72 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none shadow-sm"
              />
            </div>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none shadow-sm"
            >
              <option value="all">All departments</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 mb-6 text-xs font-semibold">
        <button
          onClick={() => setTab("all")}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 -mb-px transition-all ${
            tab === "all"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span className="material-symbols-outlined text-sm">groups</span>
          Active Directory
        </button>
        <button
          onClick={() => setTab("onboard")}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 -mb-px transition-all ${
            tab === "onboard"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span className="material-symbols-outlined text-sm">person_add</span>
          Onboard Member
        </button>
        <button
          onClick={() => setTab("offboard")}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 -mb-px transition-all ${
            tab === "offboard"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span className="material-symbols-outlined text-sm">person_remove</span>
          Offboard Member
        </button>
      </div>

      {/* Tab Content Panels */}
      {tab === "all" && (
        <>
          {employees.isLoading && <SkeletonGrid />}
          {employees.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">
              Failed to load employees: {(employees.error as Error).message}
            </div>
          )}
          {employees.data && filtered.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-xs text-slate-500">
              No employees match your filters.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((e) => (
              <button
                key={e.id}
                onClick={() => setActive(e)}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              >
                <Avatar e={e} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">{e.full_name}</div>
                  <div className="truncate text-xs text-slate-500">{e.job_title ?? "—"}</div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                      {e.department?.name ?? "Unassigned"}
                    </span>
                    <span className="text-[10px] text-slate-400">{e.employee_code}</span>
                    <span
                      className={`ml-auto rounded px-1 py-0.5 text-[9px] font-bold uppercase ${
                        e.status === "active"
                          ? "bg-green-100 text-green-700"
                          : e.status === "terminated"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {e.status}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {tab === "onboard" && (
        <div className="max-w-2xl bg-white rounded-xl border border-slate-200 p-6 shadow-sm text-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="material-symbols-outlined text-blue-600 text-base">person_add</span>
            Onboard New Employee
          </h3>
          <form onSubmit={handleOnboardSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Employee Code *</label>
                <input
                  required
                  placeholder="e.g. EMP-054"
                  value={onboardForm.employee_code}
                  onChange={(e) => setOnboardForm({ ...onboardForm, employee_code: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Full Name *</label>
                <input
                  required
                  placeholder="Sarah Chen"
                  value={onboardForm.full_name}
                  onChange={(e) => setOnboardForm({ ...onboardForm, full_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Email Address *</label>
                <input
                  required
                  type="email"
                  placeholder="sarah.chen@nexus.local"
                  value={onboardForm.email}
                  onChange={(e) => setOnboardForm({ ...onboardForm, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Phone Number</label>
                <input
                  placeholder="+1 (555) 123-4567"
                  value={onboardForm.phone}
                  onChange={(e) => setOnboardForm({ ...onboardForm, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Job Title</label>
                <input
                  placeholder="Software Engineer"
                  value={onboardForm.job_title}
                  onChange={(e) => setOnboardForm({ ...onboardForm, job_title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Department</label>
                <select
                  value={onboardForm.department_id}
                  onChange={(e) => setOnboardForm({ ...onboardForm, department_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select Department...</option>
                  {(departments.data ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Location</label>
                <input
                  placeholder="San Francisco, CA"
                  value={onboardForm.location}
                  onChange={(e) => setOnboardForm({ ...onboardForm, location: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Hire Date</label>
                <input
                  type="date"
                  value={onboardForm.hire_date}
                  onChange={(e) => setOnboardForm({ ...onboardForm, hire_date: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              disabled={onboardMut.isPending}
              type="submit"
              className="w-full rounded-lg bg-blue-600 text-white font-semibold py-2.5 hover:bg-blue-700 disabled:opacity-50 text-xs shadow-sm mt-2"
            >
              {onboardMut.isPending ? "Onboarding member..." : "Onboard Employee"}
            </button>
          </form>
        </div>
      )}

      {tab === "offboard" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-red-600 text-sm">person_remove</span>
              Offboard / Terminate Employee
            </h3>
            <span className="text-slate-500">{activeEmployees.length} active employees eligible</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                  <th className="p-3">Code</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role / Department</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {activeEmployees.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold">{e.employee_code}</td>
                    <td className="p-3 font-medium text-slate-900">{e.full_name}</td>
                    <td className="p-3">{e.email}</td>
                    <td className="p-3">
                      <div>{e.job_title ?? "—"}</div>
                      <div className="text-[10px] text-slate-400">{e.department?.name ?? "Unassigned"}</div>
                    </td>
                    <td className="p-3 flex gap-2">
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to mark ${e.full_name} as inactive?`)) {
                            offboardMut.mutate({ id: e.id, status: "inactive" });
                          }
                        }}
                        className="rounded border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Deactivate
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to terminate ${e.full_name}?`)) {
                            offboardMut.mutate({ id: e.id, status: "terminated" });
                          }
                        }}
                        className="rounded bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-700"
                      >
                        Terminate
                      </button>
                    </td>
                  </tr>
                ))}
                {activeEmployees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-5 text-center text-slate-400">
                      No active employees in the directory.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {active && (
        <ProfileDrawer
          employee={active}
          onClose={() => setActive(null)}
          onOffboard={(status) => offboardMut.mutate({ id: active.id, status })}
          isPending={offboardMut.isPending}
        />
      )}
    </div>
  );
}

function Avatar({ e }: { e: EmployeeRow }) {
  const initials = e.full_name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
  return e.avatar_url ? (
    <img src={e.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
  ) : (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
      {initials}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-white" />
      ))}
    </div>
  );
}

function ProfileDrawer({
  employee,
  onClose,
  onOffboard,
  isPending,
}: {
  employee: EmployeeRow;
  onClose: () => void;
  onOffboard: (status: "inactive" | "terminated") => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-slate-900/30" onClick={onClose} />
      <div className="flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="text-sm font-semibold">Employee Profile</div>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4">
              <Avatar e={employee} />
              <div>
                <div className="text-lg font-bold">{employee.full_name}</div>
                <div className="text-sm text-slate-500">{employee.job_title ?? "—"}</div>
              </div>
            </div>
            <dl className="mt-6 space-y-3 text-sm">
              <Row label="Employee ID" value={employee.employee_code} />
              <Row label="Email" value={employee.email} />
              <Row label="Phone" value={employee.phone ?? "—"} />
              <Row label="Department" value={employee.department?.name ?? "—"} />
              <Row label="Location" value={employee.location ?? "—"} />
              <Row label="Hire date" value={employee.hire_date ?? "—"} />
              <Row label="Status" value={employee.status} />
            </dl>
          </div>

          {employee.status === "active" && (
            <div className="mt-8 border-t border-slate-200 pt-4 flex gap-2">
              <button
                disabled={isPending}
                onClick={() => {
                  if (confirm(`Are you sure you want to de-activate ${employee.full_name}?`)) {
                    onOffboard("inactive");
                  }
                }}
                className="flex-1 rounded border border-slate-300 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Mark Inactive
              </button>
              <button
                disabled={isPending}
                onClick={() => {
                  if (confirm(`Are you sure you want to terminate ${employee.full_name}?`)) {
                    onOffboard("terminated");
                  }
                }}
                className="flex-1 rounded bg-red-600 py-2 text-center text-xs font-semibold text-white hover:bg-red-700"
              >
                Terminate Member
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2">
      <dt className="text-xs uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}
