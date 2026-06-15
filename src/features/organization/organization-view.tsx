import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getOrganizationDetails,
  updateOrganizationDetails,
  createDepartment,
} from "@/lib/organization.functions";
import { listDepartments, listEmployees } from "@/lib/employees.functions";
import { toast } from "sonner";

export function OrganizationView() {
  const qc = useQueryClient();
  const fetchOrg = useServerFn(getOrganizationDetails);
  const fetchDepts = useServerFn(listDepartments);
  const fetchEmps = useServerFn(listEmployees);
  const triggerUpdateOrg = useServerFn(updateOrganizationDetails);
  const triggerCreateDept = useServerFn(createDepartment);

  const org = useQuery({ queryKey: ["organization", "details"], queryFn: () => fetchOrg() });
  const depts = useQuery({ queryKey: ["departments"], queryFn: () => fetchDepts() });
  const emps = useQuery({ queryKey: ["employees"], queryFn: () => fetchEmps() });

  const [activeTab, setActiveTab] = useState<"profile" | "departments">("profile");

  // Profile Form state
  const [orgName, setOrgName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [domain, setDomain] = useState("");

  // Department Form state
  const [deptName, setDeptName] = useState("");
  const [deptDesc, setDeptDesc] = useState("");

  // Sync state once organization details load
  useEffect(() => {
    if (org.data) {
      setOrgName(org.data.name);
      setLogoUrl(org.data.logo_url || "");
      setDomain(org.data.domain || "");
    }
  }, [org.data]);

  // Sync states on query success
  const syncFields = () => {
    if (org.data) {
      setOrgName(org.data.name);
      setLogoUrl(org.data.logo_url || "");
      setDomain(org.data.domain || "");
    }
  };

  const updateOrgMut = useMutation({
    mutationFn: (data: { name: string; logo_url?: string; domain?: string }) => triggerUpdateOrg({ data }),
    onSuccess: () => {
      toast.success("Organization profile saved successfully");
      qc.invalidateQueries({ queryKey: ["organization"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createDeptMut = useMutation({
    mutationFn: (data: { name: string; description?: string }) => triggerCreateDept({ data }),
    onSuccess: () => {
      toast.success("Department created successfully");
      setDeptName("");
      setDeptDesc("");
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      toast.error("Company name cannot be blank");
      return;
    }
    updateOrgMut.mutate({ name: orgName, logo_url: logoUrl, domain });
  };

  const handleDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) {
      toast.error("Department name cannot be blank");
      return;
    }
    createDeptMut.mutate({ name: deptName, description: deptDesc });
  };

  const currentHeadcount = emps.data?.filter((e) => e.status === "active").length ?? 0;
  const licenseLimit = org.data?.license_limit ?? 10;
  const licensePercent = Math.min(100, (currentHeadcount / licenseLimit) * 100);

  return (
    <div className="p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-bold overflow-hidden shadow-inner">
            {org.data?.logo_url ? (
              <img src={org.data.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-3xl">corporate_fare</span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{org.data?.name || "Loading Organization..."}</h1>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">link</span>
              portal: <strong className="text-slate-800">{org.data?.slug || "..."}.nexus.local</strong>
            </p>
          </div>
        </div>

        {/* License usage widget */}
        <div className="w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold text-slate-700">License Usage</span>
            <span className="font-bold text-slate-900">{currentHeadcount} / {licenseLimit}</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-1.5">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${licensePercent}%` }} />
          </div>
          <p className="text-[10px] text-slate-500">
            Headcount limit is managed by your enterprise subscription tier.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => {
            setActiveTab("profile");
            syncFields();
          }}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 -mb-px transition-all ${
            activeTab === "profile"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span className="material-symbols-outlined text-sm">settings_applications</span>
          Company Profile
        </button>
        <button
          onClick={() => setActiveTab("departments")}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 -mb-px transition-all ${
            activeTab === "departments"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span className="material-symbols-outlined text-sm">schema</span>
          Departments
        </button>
      </div>

      {/* Content Panels */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
          {/* Main settings form */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-base">edit_document</span>
              Edit Company Setup
            </h3>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Company Name *</label>
                <input
                  required
                  placeholder="e.g. Acme Corporation"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Email Domain (for Auto-Onboarding)</label>
                <input
                  placeholder="e.g. acme.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Employees signing up with an email matching this domain will automatically join your workspace.
                </p>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Logo URL</label>
                <input
                  placeholder="e.g. https://logo.clearbit.com/acme.com"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <button
                disabled={updateOrgMut.isPending}
                type="submit"
                className="rounded-lg bg-blue-600 text-white font-semibold px-4 py-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {updateOrgMut.isPending ? "Saving changes..." : "Save Profile"}
              </button>
            </form>
          </div>

          {/* Quick Info Sidebar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Zoho People Setup Guide
            </h3>
            <div className="space-y-3 text-slate-600 leading-relaxed">
              <p>
                Configure your organization profile to brand your portals, set up domain auto-joins, and manage security parameters.
              </p>
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-[11px] text-blue-800">
                <strong>Domain verification</strong>: Match your corporate email suffix to let colleagues onboard dynamically.
              </div>
              <p className="text-[10px] text-slate-400 pt-2">
                Need more licenses or specific custom domain names? Contact Nexus support.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "departments" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
          {/* Add department form */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-fit">
            <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-base">domain_add</span>
              Add Department
            </h3>
            <form onSubmit={handleDeptSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Department Name *</label>
                <input
                  required
                  placeholder="e.g. Quality Assurance"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Description</label>
                <textarea
                  placeholder="Brief summary of department goals or activities..."
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <button
                disabled={createDeptMut.isPending}
                type="submit"
                className="w-full rounded-lg bg-blue-600 text-white font-semibold py-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {createDeptMut.isPending ? "Creating..." : "Create Department"}
              </button>
            </form>
          </div>

          {/* Department List */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-blue-600 text-sm">schema</span>
                Current Departments
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                    <th className="p-3">Department Name</th>
                    <th className="p-3">Description</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {depts.data && depts.data.map((d) => (
                    <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">{d.name}</td>
                      <td className="p-3 text-slate-500">{d.description || "No description provided."}</td>
                    </tr>
                  ))}
                  {(!depts.data || depts.data.length === 0) && (
                    <tr>
                      <td colSpan={2} className="p-5 text-center text-slate-400">
                        No departments setup for your organization.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
