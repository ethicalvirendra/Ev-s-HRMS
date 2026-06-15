import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listBenefitsPackages,
  listMyEnrollments,
  enrollInBenefit,
  waiveBenefit,
  createBenefitsPackage,
} from "@/lib/benefits.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function BenefitsView() {
  const qc = useQueryClient();

  const triggerListPackages = useServerFn(listBenefitsPackages);
  const triggerListMyEnrollments = useServerFn(listMyEnrollments);
  const triggerEnroll = useServerFn(enrollInBenefit);
  const triggerWaive = useServerFn(waiveBenefit);
  const triggerCreate = useServerFn(createBenefitsPackage);

  // Queries
  const packages = useQuery({ queryKey: ["benefits", "packages"], queryFn: () => triggerListPackages() });
  const myEnrollments = useQuery({ queryKey: ["benefits", "my-enrollments"], queryFn: () => triggerListMyEnrollments() });

  // Get User Role to display Admin tab
  const userRoles = useQuery({
    queryKey: ["user", "roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role");
      return data?.map((r) => r.role) || [];
    },
  });
  const isAdminOrManager = userRoles.data?.includes("admin") || userRoles.data?.includes("manager");

  // Fetch all enrollments for Admin dashboard counts
  const allEnrollments = useQuery({
    queryKey: ["benefits", "all-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("benefits_enrollments")
        .select("package_id, status");
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!isAdminOrManager,
  });

  // Tabs
  const [activeTab, setActiveTab] = useState<"my-benefits" | "admin">("my-benefits");

  // Create Package state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [type, setType] = useState<"health" | "dental" | "vision" | "retirement" | "other">("health");
  const [description, setDescription] = useState("");
  const [employeeCost, setEmployeeCost] = useState("");
  const [employerContribution, setEmployerContribution] = useState("");

  // Mutations
  const enrollMut = useMutation({
    mutationFn: (packageId: string) => triggerEnroll(packageId),
    onSuccess: () => {
      toast.success("Successfully enrolled in benefit package!");
      qc.invalidateQueries({ queryKey: ["benefits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const waiveMut = useMutation({
    mutationFn: (packageId: string) => triggerWaive(packageId),
    onSuccess: () => {
      toast.success("Successfully waived benefit package.");
      qc.invalidateQueries({ queryKey: ["benefits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMut = useMutation({
    mutationFn: (data: {
      name: string;
      provider: string;
      type: "health" | "dental" | "vision" | "retirement" | "other";
      description?: string;
      employeeCost: number;
      employerContribution: number;
    }) => triggerCreate(data),
    onSuccess: () => {
      toast.success("Benefits package created successfully!");
      setCreateModalOpen(false);
      setName("");
      setProvider("");
      setType("health");
      setDescription("");
      setEmployeeCost("");
      setEmployerContribution("");
      qc.invalidateQueries({ queryKey: ["benefits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const empCostNum = parseFloat(employeeCost);
    const employerContNum = parseFloat(employerContribution);

    if (isNaN(empCostNum) || empCostNum < 0) {
      toast.error("Please enter a valid employee cost share");
      return;
    }
    if (isNaN(employerContNum) || employerContNum < 0) {
      toast.error("Please enter a valid employer contribution");
      return;
    }

    createMut.mutate({
      name,
      provider,
      type,
      description: description || undefined,
      employeeCost: empCostNum,
      employerContribution: employerContNum,
    });
  };

  const getEnrollmentStatus = (packageId: string) => {
    const found = myEnrollments.data?.find((e) => e.package_id === packageId);
    return found ? found.status : "pending_choice";
  };

  const getPackageStats = (packageId: string) => {
    const matching = allEnrollments.data?.filter((e) => e.package_id === packageId) || [];
    const enrolledCount = matching.filter((e) => e.status === "enrolled").length;
    const waivedCount = matching.filter((e) => e.status === "waived").length;
    return { enrolledCount, waivedCount };
  };

  const getTypeIcon = (pkgType: string) => {
    switch (pkgType) {
      case "health":
        return "medical_services";
      case "dental":
        return "dentistry";
      case "vision":
        return "visibility";
      case "retirement":
        return "savings";
      default:
        return "card_membership";
    }
  };

  const getTypeColor = (pkgType: string) => {
    switch (pkgType) {
      case "health":
        return "text-emerald-500 bg-emerald-50 border-emerald-100";
      case "dental":
        return "text-sky-500 bg-sky-50 border-sky-100";
      case "vision":
        return "text-indigo-500 bg-indigo-50 border-indigo-100";
      case "retirement":
        return "text-amber-500 bg-amber-50 border-amber-100";
      default:
        return "text-slate-500 bg-slate-50 border-slate-100";
    }
  };

  return (
    <div className="p-6 space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Benefits & Insurance</h1>
          <p className="text-sm text-slate-500 mt-1">Review company-sponsored health, wellness, and financial security packages.</p>
        </div>
        {isAdminOrManager && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            Add Package
          </button>
        )}
      </div>

      {/* Tabs */}
      {isAdminOrManager && (
        <div className="flex border-b border-slate-200 font-semibold">
          <button
            onClick={() => setActiveTab("my-benefits")}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 -mb-px transition-all ${
              activeTab === "my-benefits" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span className="material-symbols-outlined text-sm">assignment_ind</span>
            My Benefits Portfolio
          </button>
          <button
            onClick={() => setActiveTab("admin")}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 -mb-px transition-all ${
              activeTab === "admin" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
            Package Distribution & Administration
          </button>
        </div>
      )}

      {/* MY BENEFITS PORTFOLIO */}
      {activeTab === "my-benefits" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Benefits Cards Grid */}
          <div className="lg:col-span-2 space-y-4">
            {packages.isLoading ? (
              <div className="text-center py-10 text-slate-400">Loading benefits packages...</div>
            ) : (packages.data || []).length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm text-center flex flex-col items-center justify-center h-64">
                <span className="material-symbols-outlined text-[60px] text-slate-300 mb-4 select-none">
                  health_and_safety
                </span>
                <h3 className="text-sm font-bold text-slate-700">No Packages Found</h3>
                <p className="text-slate-400 mt-1 max-w-sm">
                  There are no benefits packages configured for your organization at this time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {packages.data.map((pkg) => {
                  const status = getEnrollmentStatus(pkg.id);
                  return (
                    <div key={pkg.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div>
                        {/* Package badge and type */}
                        <div className="flex justify-between items-start mb-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${getTypeColor(pkg.type)}`}>
                            <span className="material-symbols-outlined text-lg">{getTypeIcon(pkg.type)}</span>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                            status === "enrolled" ? "bg-emerald-100 text-emerald-800" :
                            status === "waived" ? "bg-rose-100 text-rose-800" :
                            "bg-amber-100 text-amber-800"
                          }`}>
                            {status === "enrolled" ? "Enrolled" : status === "waived" ? "Waived" : "Not Actioned"}
                          </span>
                        </div>

                        {/* Package titles */}
                        <h3 className="text-sm font-bold text-slate-900">{pkg.name}</h3>
                        <p className="text-[10px] text-slate-400 font-medium">Provider: {pkg.provider}</p>
                        <p className="text-slate-500 mt-2 leading-relaxed h-12 overflow-hidden text-ellipsis">
                          {pkg.description || "No description provided."}
                        </p>

                        {/* Cost structures */}
                        <div className="mt-4 border-t border-slate-100 pt-3 grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Your Cost / mo</span>
                            <strong className="text-sm text-slate-800">${Number(pkg.employee_cost).toFixed(2)}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Employer Match</span>
                            <strong className="text-sm text-emerald-600">${Number(pkg.employer_contribution).toFixed(2)}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-5 flex gap-2">
                        <button
                          disabled={enrollMut.isPending || waiveMut.isPending}
                          onClick={() => enrollMut.mutate(pkg.id)}
                          className={`flex-1 rounded-lg py-2 font-bold text-center border transition-all ${
                            status === "enrolled"
                              ? "bg-emerald-600 text-white border-emerald-600 cursor-default"
                              : "bg-white text-slate-700 border-slate-300 hover:border-emerald-600 hover:text-emerald-600"
                          }`}
                        >
                          {status === "enrolled" ? "Enrolled ✓" : "Enroll"}
                        </button>
                        <button
                          disabled={enrollMut.isPending || waiveMut.isPending}
                          onClick={() => waiveMut.mutate(pkg.id)}
                          className={`flex-1 rounded-lg py-2 font-bold text-center border transition-all ${
                            status === "waived"
                              ? "bg-rose-600 text-white border-rose-600 cursor-default"
                              : "bg-white text-slate-500 border-slate-200 hover:border-rose-600 hover:text-rose-600"
                          }`}
                        >
                          {status === "waived" ? "Waived ✕" : "Waive"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick guidance sidebar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 h-fit">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-500 text-base">info</span>
              Employee Cost Share Guide
            </h3>
            <div className="space-y-3 text-slate-600 leading-relaxed text-[11px]">
              <p>
                Ev's HRMS handles premium deductions automatically. Enrolling in benefits will update your monthly payroll calculations:
              </p>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>Your premium portion is deducted directly from your payslip each month.</li>
                <li>The company contributes the specified employer share matching amount.</li>
                <li>Changes are effective immediately upon enrollment verification.</li>
              </ul>
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-[10px] text-blue-800">
                <strong>Need Support?</strong> If you have questions about medical network coverage or dental providers, open a helpdesk ticket or ask Zia Assistant for help.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMINISTRATION TAB */}
      {activeTab === "admin" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Package metrics & list */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-blue-600 text-sm">settings</span>
                  Manage Benefits Portfolio
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                      <th className="p-3">Package / Provider</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Pricing details</th>
                      <th className="p-3 text-center">Enrolled</th>
                      <th className="p-3 text-center">Waived</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {packages.data && packages.data.map((pkg) => {
                      const { enrolledCount, waivedCount } = getPackageStats(pkg.id);
                      return (
                        <tr key={pkg.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{pkg.name}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{pkg.provider}</div>
                          </td>
                          <td className="p-3">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-600">
                              {pkg.type}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="text-slate-500">EE Cost: <strong className="text-slate-800">${Number(pkg.employee_cost).toFixed(2)}</strong></div>
                            <div className="text-slate-500">ER Match: <strong className="text-emerald-600">${Number(pkg.employer_contribution).toFixed(2)}</strong></div>
                          </td>
                          <td className="p-3 text-center font-bold text-emerald-600 text-sm">{enrolledCount}</td>
                          <td className="p-3 text-center font-bold text-slate-400 text-sm">{waivedCount}</td>
                        </tr>
                      );
                    })}
                    {(!packages.data || packages.data.length === 0) && (
                      <tr>
                        <td colSpan={5} className="p-5 text-center text-slate-400">
                          No packages registered yet. Click "Add Package" to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick guidance sidebar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 h-fit">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Organization Benefits Analytics
            </h3>
            <div className="space-y-3 text-slate-600 leading-relaxed">
              <p>
                Review enrollment participation rates and plan popularities across all employees.
              </p>
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3 text-[10px] text-emerald-800">
                <strong>Cost Mitigation TIP:</strong> Promoting dental and vision preventative care enrollment reduces overall long-term medical expense claims.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PACKAGE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl p-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-blue-600 text-base">post_add</span>
                Configure New Benefits Package
              </h2>
              <button onClick={() => setCreateModalOpen(false)} className="rounded p-1 hover:bg-slate-100">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Package Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Premium Health Select Plan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Provider / Carrier *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BlueCross BlueShield"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Coverage Category</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none"
                  >
                    <option value="health">Health / Medical</option>
                    <option value="dental">Dental Care</option>
                    <option value="vision">Vision Care</option>
                    <option value="retirement">Retirement / 401(k)</option>
                    <option value="other">Other Benefit</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Description</label>
                <textarea
                  placeholder="Summarize plan details, deductibles, coverage ratios..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Employee Cost Share ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="120.00"
                    value={employeeCost}
                    onChange={(e) => setEmployeeCost(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Employer Contribution ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="250.00"
                    value={employerContribution}
                    onChange={(e) => setEmployerContribution(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                disabled={createMut.isPending}
                type="submit"
                className="w-full rounded-lg bg-blue-600 text-white font-semibold py-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {createMut.isPending ? "Creating Package..." : "Publish Benefits Package"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
