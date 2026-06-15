import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyTickets, createTicket } from "@/lib/helpdesk.functions";
import { toast } from "sonner";

export function HelpdeskView() {
  const qc = useQueryClient();
  const fetchTickets = useServerFn(listMyTickets);
  const triggerCreate = useServerFn(createTicket);

  const tickets = useQuery({ queryKey: ["helpdesk", "tickets"], queryFn: () => fetchTickets() });

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("HR");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [description, setDescription] = useState("");

  const ticketMut = useMutation({
    mutationFn: (data: { title: string; category: string; priority: "low" | "medium" | "high"; description?: string }) =>
      triggerCreate({ data }),
    onSuccess: () => {
      toast.success("Support ticket submitted successfully");
      setModalOpen(false);
      setTitle("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["helpdesk"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a ticket title");
      return;
    }
    ticketMut.mutate({ title, category, priority, description });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Helpdesk & Support</h1>
          <p className="text-sm text-slate-500 mt-1">Find answers, submit requests, and manage your support tickets.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm"
        >
          New Request
        </button>
      </div>

      {/* Hero search card */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-bl from-slate-100/50 to-transparent pointer-events-none" />
        <h3 className="text-base font-bold text-slate-900 mb-4 relative z-10">How can we help you today?</h3>
        <div className="relative max-w-2xl z-10 mb-4">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:border-blue-500 focus:outline-none shadow-sm"
            placeholder="Search knowledge base (e.g., 'Reset password', 'Benefits policy')..."
            type="text"
          />
        </div>
        <div className="flex flex-wrap gap-2 z-10 relative text-[10px] text-slate-500">
          <span className="font-semibold flex items-center mr-1">Popular topics:</span>
          <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-white">IT Equipment</span>
          <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-white">Leave Policy</span>
          <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-white">Payroll Setup</span>
        </div>
      </div>

      {/* Knowledge Base Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:border-blue-400 transition-colors flex flex-col items-start">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-blue-600 mb-3">
            <span className="material-symbols-outlined text-sm">devices</span>
          </div>
          <h4 className="font-bold text-slate-900 mb-1">IT & Hardware</h4>
          <p className="text-slate-500">Software access, equipment requests, VPN issues.</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:border-blue-400 transition-colors flex flex-col items-start">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-blue-600 mb-3">
            <span className="material-symbols-outlined text-sm">medical_services</span>
          </div>
          <h4 className="font-bold text-slate-900 mb-1">HR & Benefits</h4>
          <p className="text-slate-500">Health insurance, leave balances, corporate policies.</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:border-blue-400 transition-colors flex flex-col items-start">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-blue-600 mb-3">
            <span className="material-symbols-outlined text-sm">finance</span>
          </div>
          <h4 className="font-bold text-slate-900 mb-1">Payroll & Finance</h4>
          <p className="text-slate-500">Expense reimbursement, bank details updates.</p>
        </div>
      </div>

      {/* Ticket log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-blue-600">support_agent</span>
            My Support Tickets
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                <th className="p-3">Ticket ID</th>
                <th className="p-3">Title</th>
                <th className="p-3">Category</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created Date</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {tickets.data && tickets.data.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-semibold">{t.id.slice(0, 8).toUpperCase()}</td>
                  <td className="p-3">{t.title}</td>
                  <td className="p-3">{t.category}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                      t.priority === "high" ? "bg-red-100 text-red-800" :
                      t.priority === "medium" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      t.status === "closed" ? "bg-slate-100 text-slate-600" :
                      t.status === "resolved" ? "bg-green-100 text-green-800" :
                      t.status === "in_progress" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">
                    {new Date(t.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              ))}
              {(!tickets.data || tickets.data.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-5 text-center text-slate-400">
                    No active support tickets. Click 'New Request' above to submit.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal form */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl p-6 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
              <h2 className="font-bold text-slate-900 text-sm">New Support Request</h2>
              <button onClick={() => setModalOpen(false)} className="rounded p-1 hover:bg-slate-100">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Title</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cannot connect to office VPN"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="IT">IT & Devices</option>
                    <option value="HR">HR & Benefits</option>
                    <option value="Payroll">Payroll & Expenses</option>
                    <option value="Facilities">Facilities</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain the problem and include any error messages..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                />
              </div>
              <button
                disabled={ticketMut.isPending}
                type="submit"
                className="w-full rounded-lg bg-blue-600 text-white font-semibold py-2 hover:bg-blue-700 disabled:opacity-50"
              >
                {ticketMut.isPending ? "Submitting..." : "Submit Ticket"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
