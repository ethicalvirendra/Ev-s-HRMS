import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listSuccessionPlans,
  createSuccessionPlan,
  addSuccessionNominee,
  removeSuccessionNominee,
} from "@/lib/succession.functions";
import { listEmployees } from "@/lib/employees.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SuccessionView() {
  const qc = useQueryClient();

  const triggerListPlans = useServerFn(listSuccessionPlans);
  const triggerCreatePlan = useServerFn(createSuccessionPlan);
  const triggerAddNominee = useServerFn(addSuccessionNominee);
  const triggerRemoveNominee = useServerFn(removeSuccessionNominee);
  const triggerListEmployees = useServerFn(listEmployees);

  // Get User Role to restrict access
  const userRoles = useQuery({
    queryKey: ["user", "roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role");
      return data?.map((r) => r.role) || [];
    },
  });
  const isAdminOrManager = userRoles.data?.includes("admin") || userRoles.data?.includes("manager");

  // Queries
  const plans = useQuery({
    queryKey: ["succession", "plans"],
    queryFn: () => triggerListPlans(),
    enabled: !!isAdminOrManager,
  });

  const employees = useQuery({
    queryKey: ["employees", "list"],
    queryFn: () => triggerListEmployees(),
    enabled: !!isAdminOrManager,
  });

  // State for Create Plan Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [positionTitle, setPositionTitle] = useState("");
  const [incumbentId, setIncumbentId] = useState("");
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("low");
  const [readinessTimeline, setReadinessTimeline] = useState("Immediate");

  // State for Add Nominee Modal
  const [nomineeModalOpen, setNomineeModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [nomineeId, setNomineeId] = useState("");
  const [nomineeReadiness, setNomineeReadiness] = useState<"ready_now" | "1_2_years" | "3_5_years">("ready_now");
  const [suitabilityScore, setSuitabilityScore] = useState(5);
  const [notes, setNotes] = useState("");

  // Mutations
  const createPlanMut = useMutation({
    mutationFn: (data: {
      positionTitle: string;
      incumbentId?: string;
      riskLevel: "low" | "medium" | "high";
      readinessTimeline: string;
    }) => triggerCreatePlan(data),
    onSuccess: () => {
      toast.success("Succession plan created successfully!");
      setCreateModalOpen(false);
      setPositionTitle("");
      setIncumbentId("");
      setRiskLevel("low");
      setReadinessTimeline("Immediate");
      qc.invalidateQueries({ queryKey: ["succession"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addNomineeMut = useMutation({
    mutationFn: (data: {
      planId: string;
      nomineeId: string;
      readiness: "ready_now" | "1_2_years" | "3_5_years";
      suitabilityScore: number;
      notes?: string;
    }) => triggerAddNominee(data),
    onSuccess: () => {
      toast.success("Successor nominee added successfully!");
      setNomineeModalOpen(false);
      setNomineeId("");
      setNomineeReadiness("ready_now");
      setSuitabilityScore(5);
      setNotes("");
      setSelectedPlanId(null);
      qc.invalidateQueries({ queryKey: ["succession"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeNomineeMut = useMutation({
    mutationFn: (nomineeId: string) => triggerRemoveNominee(nomineeId),
    onSuccess: () => {
      toast.success("Nominee successor removed.");
      qc.invalidateQueries({ queryKey: ["succession"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCreatePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!positionTitle.trim()) {
      toast.error("Position title is required");
      return;
    }
    createPlanMut.mutate({
      positionTitle,
      incumbentId: incumbentId || undefined,
      riskLevel,
      readinessTimeline,
    });
  };

  const handleAddNomineeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || !nomineeId) {
      toast.error("Please select a nominee");
      return;
    }
    addNomineeMut.mutate({
      planId: selectedPlanId,
      nomineeId,
      readiness: nomineeReadiness,
      suitabilityScore,
      notes: notes || undefined,
    });
  };

  // Restrict screen for non-admin/managers
  if (userRoles.data && !isAdminOrManager) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[60vh] text-xs">
        <div className="h-16 w-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-500 mb-4 shadow-sm">
          <span className="material-symbols-outlined text-[32px] select-none">lock</span>
        </div>
        <h2 className="text-base font-bold text-slate-800">Access Restricted</h2>
        <p className="text-slate-500 mt-2 max-w-sm leading-relaxed">
          Succession Planning is a strategic administrative module restricted to HR Administrators and Department Managers. Contact your administrator if you require access.
        </p>
      </div>
    );
  }

  // Calculate metrics
  const totalPlans = plans.data?.length ?? 0;
  const highRiskCount = plans.data?.filter((p) => p.risk_level === "high").length ?? 0;
  const readyNowCount = plans.data?.reduce((sum, p) => sum + (p.nominees?.filter((n) => n.readiness === "ready_now").length ?? 0), 0) ?? 0;
  const pipelineCount = plans.data?.reduce((sum, p) => sum + (p.nominees?.filter((n) => n.readiness !== "ready_now").length ?? 0), 0) ?? 0;

  return (
    <div className="p-6 space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Succession Planning</h1>
          <p className="text-sm text-slate-500 mt-1">Map critical leadership positions, evaluate incumbent risk, and nominate future successors.</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-sm">assignment_ind</span>
          New Succession Plan
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wider">Critical Roles Mapped</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalPlans}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">star</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wider">High Risk Incumbents</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{highRiskCount}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">warning</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wider">Ready Now Successors</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{readyNowCount}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">verified</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 font-semibold uppercase tracking-wider">Pipeline Pool</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{pipelineCount}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">group</span>
          </div>
        </div>
      </div>

      {/* Succession Plans Grid */}
      {plans.isLoading ? (
        <div className="text-center py-10 text-slate-400">Loading succession plans...</div>
      ) : (plans.data || []).length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm text-center flex flex-col items-center justify-center h-64">
          <span className="material-symbols-outlined text-[60px] text-slate-300 mb-4 select-none">
            account_tree
          </span>
          <h3 className="text-sm font-bold text-slate-700">No Succession Plans configured</h3>
          <p className="text-slate-400 mt-1 max-w-sm">
            Create a plan for key organizational positions to build a robust leadership pipeline.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.data.map((plan) => (
            <div key={plan.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
              <div>
                {/* Header of Card */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">{plan.position_title}</h3>
                    <div className="flex gap-2 items-center mt-1 text-[10px] text-slate-400 font-medium">
                      <span>Timeline: <strong>{plan.readiness_timeline}</strong></span>
                      <span>•</span>
                      <span className={`rounded-full px-1.5 py-0.5 font-bold uppercase ${
                        plan.risk_level === "high" ? "bg-rose-100 text-rose-800" :
                        plan.risk_level === "medium" ? "bg-amber-100 text-amber-800" :
                        "bg-emerald-100 text-emerald-800"
                      }`}>
                        {plan.risk_level} Risk
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      setNomineeModalOpen(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-bold flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-sm">person_add</span>
                    Nominate
                  </button>
                </div>

                {/* Current Incumbent Section */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-3.5 mb-4">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Current Incumbent</span>
                  {plan.incumbent ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{plan.incumbent.full_name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{plan.incumbent.job_title || "No Title"} ({plan.incumbent.employee_code})</div>
                      </div>
                      <span className="text-[10px] text-slate-400">{plan.incumbent.email}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 font-medium italic">Vacant Position</span>
                  )}
                </div>

                {/* Nominee successors pipeline list */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Nominee Successors Pipeline</span>
                  {(!plan.nominees || plan.nominees.length === 0) ? (
                    <p className="text-slate-400 italic py-2">No successors nominated for this role.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {plan.nominees.map((nom) => (
                        <div key={nom.id} className="border border-slate-100 rounded-lg p-2.5 flex items-start justify-between hover:bg-slate-50 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{nom.nominee?.full_name}</span>
                              <span className={`rounded-full px-1.5 py-0.2 text-[8px] font-bold uppercase ${
                                nom.readiness === "ready_now" ? "bg-emerald-100 text-emerald-800" :
                                nom.readiness === "1_2_years" ? "bg-blue-100 text-blue-800" :
                                "bg-slate-100 text-slate-600"
                              }`}>
                                {nom.readiness.replace("_", " ")}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">Suitability Score: <strong className="text-slate-800">{nom.suitability_score}/5</strong></div>
                            {nom.notes && <p className="text-[10px] text-slate-500 italic">"{nom.notes}"</p>}
                          </div>
                          <button
                            onClick={() => removeNomineeMut.mutate(nom.id)}
                            disabled={removeNomineeMut.isPending}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE PLAN MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl p-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-blue-600 text-base">assignment_ind</span>
                Configure Critical Position Plan
              </h2>
              <button onClick={() => setCreateModalOpen(false)} className="rounded p-1 hover:bg-slate-100">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <form onSubmit={handleCreatePlanSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Position Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chief Executive Officer (CEO)"
                  value={positionTitle}
                  onChange={(e) => setPositionTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Risk Level</label>
                  <select
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none"
                  >
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Readiness Timeline</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Immediate, 1-2 years"
                    value={readinessTimeline}
                    onChange={(e) => setReadinessTimeline(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Current Incumbent Employee</label>
                <select
                  value={incumbentId}
                  onChange={(e) => setIncumbentId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none"
                >
                  <option value="">-- Vacant Position --</option>
                  {employees.data && employees.data.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code}) - {emp.job_title || "No Title"}
                    </option>
                  ))}
                </select>
              </div>
              <button
                disabled={createPlanMut.isPending}
                type="submit"
                className="w-full rounded-lg bg-blue-600 text-white font-semibold py-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {createPlanMut.isPending ? "Creating..." : "Save Succession Plan"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* NOMINATE SUCCESSOR MODAL */}
      {nomineeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl p-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-blue-600 text-base">person_add</span>
                Nominate Successor Candidate
              </h2>
              <button onClick={() => { setNomineeModalOpen(false); setSelectedPlanId(null); }} className="rounded p-1 hover:bg-slate-100">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <form onSubmit={handleAddNomineeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Nominate Successor *</label>
                <select
                  required
                  value={nomineeId}
                  onChange={(e) => setNomineeId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none"
                >
                  <option value="">-- Select Employee --</option>
                  {employees.data && employees.data.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code}) - {emp.job_title || "No Title"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Nominee Readiness</label>
                  <select
                    value={nomineeReadiness}
                    onChange={(e) => setNomineeReadiness(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none"
                  >
                    <option value="ready_now">Ready Now</option>
                    <option value="1_2_years">1-2 Years</option>
                    <option value="3_5_years">3-5 Years</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Suitability Score (1-5 Stars)</label>
                  <select
                    value={suitabilityScore}
                    onChange={(e) => setSuitabilityScore(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none"
                  >
                    <option value={5}>5 - High Suitability</option>
                    <option value={4}>4 - Very Good Fit</option>
                    <option value={3}>3 - Good Match</option>
                    <option value={2}>2 - Marginal Fit</option>
                    <option value={1}>1 - Low Match</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Assessment Notes / Rationale</label>
                <textarea
                  placeholder="Explain why this employee was selected, areas of improvement, training needs..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                disabled={addNomineeMut.isPending}
                type="submit"
                className="w-full rounded-lg bg-blue-600 text-white font-semibold py-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {addNomineeMut.isPending ? "Adding nominee..." : "Nominate Candidate"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
