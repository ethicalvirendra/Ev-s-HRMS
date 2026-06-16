import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyPayslips, listMyExpenseClaims, createExpenseClaim } from "@/lib/payroll.functions";
import { toast } from "sonner";

export function PayrollView() {
  const qc = useQueryClient();
  const fetchPayslips = useServerFn(listMyPayslips);
  const fetchClaims = useServerFn(listMyExpenseClaims);
  const submitClaim = useServerFn(createExpenseClaim);

  const payslips = useQuery({ queryKey: ["payroll", "payslips"], queryFn: () => fetchPayslips() });
  const claims = useQuery({ queryKey: ["payroll", "claims"], queryFn: () => fetchClaims() });

  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState("Travel");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const claimMut = useMutation({
    mutationFn: (data: { category: string; amount: number; description?: string }) => submitClaim({ data }),
    onSuccess: () => {
      toast.success("Expense claim submitted successfully");
      setModalOpen(false);
      setAmount("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["payroll", "claims"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    claimMut.mutate({ category, amount: numAmt, description });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll & Expenses</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your compensation and track claims.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm"
        >
          New Claim
        </button>
      </div>

      {/* Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Next Payroll Countdown */}
        <div className="lg:col-span-4 bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-slate-900 pointer-events-none">
            <span className="material-symbols-outlined text-[100px]">calendar_clock</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-blue-600">payments</span>
              Next Payroll
            </h3>
            <div className="mt-6">
              <div className="text-3xl font-bold text-slate-900">05<span className="text-lg text-slate-400">d</span> 14<span className="text-lg text-slate-400">h</span></div>
              <p className="text-xs text-slate-500 mt-1">Estimated deposit on Nov 15, 2026</p>
            </div>
          </div>
          <div className="mt-6">
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: "80%" }}></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 text-right">Cycle 80% complete</p>
          </div>
        </div>

        {/* Compensation Summary */}
        <div className="lg:col-span-8 bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mb-4">
            <span className="material-symbols-outlined text-blue-600">account_balance_wallet</span>
            Compensation Management
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Base Salary (YTD)</p>
              <p className="text-xl font-bold text-slate-900">$85,400</p>
              <div className="mt-1.5 flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                <span className="material-symbols-outlined text-xs">trending_up</span>
                <span>On track</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Bonuses (YTD)</p>
              <p className="text-xl font-bold text-slate-900">$12,500</p>
              <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500">
                <span className="material-symbols-outlined text-xs">info</span>
                <span>Q3 payout included</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-violet-50/50 border border-violet-100 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-violet-100/10 opacity-50 pointer-events-none" />
              <p className="text-[10px] uppercase tracking-wider text-violet-500 mb-1 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">auto_awesome</span>
                Evai Projection
              </p>
              <p className="text-xl font-bold text-slate-900">$115k - $120k</p>
              <p className="mt-1.5 text-[10px] text-slate-500">Est. EOY Total Comp</p>
            </div>
          </div>
        </div>

        {/* Payslips Log */}
        <div className="lg:col-span-12 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-blue-600">receipt_long</span>
              Recent Payslips
            </h3>
          </div>
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                  <th className="p-3">Period</th>
                  <th className="p-3">Base Salary</th>
                  <th className="p-3">Bonus</th>
                  <th className="p-3">Deductions</th>
                  <th className="p-3">Net Salary</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {payslips.data && payslips.data.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold">{p.month} {p.year}</td>
                    <td className="p-3">${Number(p.base_salary).toLocaleString()}</td>
                    <td className="p-3">${Number(p.bonus).toLocaleString()}</td>
                    <td className="p-3">${Number(p.deductions).toLocaleString()}</td>
                    <td className="p-3 font-bold">${Number(p.net_salary).toLocaleString()}</td>
                    <td className="p-3">
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button className="text-blue-600 hover:underline">PDF</button>
                    </td>
                  </tr>
                ))}
                {(!payslips.data || payslips.data.length === 0) && (
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-semibold">October 2026</td>
                    <td className="p-3">$7,116</td>
                    <td className="p-3">$1,041</td>
                    <td className="p-3">$923</td>
                    <td className="p-3 font-bold">$7,234</td>
                    <td className="p-3">
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">Paid</span>
                    </td>
                    <td className="p-3 text-right">
                      <button className="text-blue-600 hover:underline">PDF</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expense Claims Log */}
        <div className="lg:col-span-12 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-blue-600">travel_explore</span>
              Expense & Travel Claims
            </h3>
          </div>
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                  <th className="p-3">Claim ID</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {claims.data && claims.data.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold">{c.claim_id}</td>
                    <td className="p-3">{c.date}</td>
                    <td className="p-3">{c.category}</td>
                    <td className="p-3 text-slate-400">{c.description || "—"}</td>
                    <td className="p-3 font-bold">${Number(c.amount).toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        c.status === "reimbursed" ? "bg-green-100 text-green-800" :
                        c.status === "approved" ? "bg-blue-100 text-blue-800" :
                        c.status === "rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!claims.data || claims.data.length === 0) && (
                  <tr>
                    <td colSpan={6} className="p-5 text-center text-slate-400">
                      No expense claims submitted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl p-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
              <h2 className="text-sm font-bold text-slate-900">New Expense Claim</h2>
              <button onClick={() => setModalOpen(false)} className="rounded p-1 hover:bg-slate-100">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <form onSubmit={onSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                >
                  <option value="Travel">Travel / Flights</option>
                  <option value="Meals">Meals / Entertaining</option>
                  <option value="Hardware">IT Equipment / Hardware</option>
                  <option value="Software">Software Licenses</option>
                  <option value="Other">Other Expenses</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail the business purpose of this expense..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                />
              </div>
              <button
                disabled={claimMut.isPending}
                type="submit"
                className="w-full rounded-lg bg-blue-600 text-white font-semibold py-2 hover:bg-blue-700 disabled:opacity-50"
              >
                {claimMut.isPending ? "Submitting..." : "Submit Claim"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
