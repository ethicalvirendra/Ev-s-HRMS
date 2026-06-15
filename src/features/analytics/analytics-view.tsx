import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie } from "recharts";

export function AnalyticsView() {
  const fetchStats = useServerFn(getDashboardStats);
  const stats = useQuery({ queryKey: ["analytics", "stats"], queryFn: () => fetchStats() });

  const headcount = stats.data?.headcount || 2450;
  const turnover = stats.data?.turnoverRate || 8.4;
  const engagement = stats.data?.engagementScore || 82;

  // Use live department distribution from backend, fallback to mock if empty
  const deptData = (stats.data?.departmentDistribution && stats.data.departmentDistribution.length > 0)
    ? stats.data.departmentDistribution
    : [
        { name: "Engineering", value: Math.round(headcount * 0.4) },
        { name: "Product & Design", value: Math.round(headcount * 0.15) },
        { name: "Sales & Marketing", value: Math.round(headcount * 0.25) },
        { name: "HR & Operations", value: Math.round(headcount * 0.1) },
        { name: "Finance", value: Math.round(headcount * 0.1) },
      ];

  const genderData = [
    { name: "Female", value: Math.round(headcount * 0.46), color: "#a855f7" },
    { name: "Male", value: Math.round(headcount * 0.51), color: "#3b82f6" },
    { name: "Non-binary", value: Math.round(headcount * 0.03), color: "#10b981" },
  ];

  const reports = [
    { name: "Workforce Demographics Q3 2026", format: "PDF", size: "2.4 MB" },
    { name: "Quarterly Attrition and Exit Analysis", format: "Excel", size: "1.8 MB" },
    { name: "Salary Bands & Equity Gap Review", format: "PDF", size: "4.1 MB" },
    { name: "LMS Progress & Compliance Metrics", format: "CSV", size: "850 KB" },
  ];

  if (stats.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Workforce Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Predictive model overview and organizational reports.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600 w-fit mb-4">
            <span className="material-symbols-outlined text-sm">group</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Total Headcount</p>
            <h3 className="text-2xl font-bold text-slate-900">{headcount}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Active employees registered</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="p-2 bg-red-50 rounded-lg text-red-600 w-fit mb-4">
            <span className="material-symbols-outlined text-sm">person_remove</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Turnover Rate</p>
            <h3 className="text-2xl font-bold text-slate-900">{turnover}%</h3>
            <p className="text-[10px] text-slate-500 mt-1">Annualized attrition speed</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 w-fit mb-4">
            <span className="material-symbols-outlined text-sm">favorite</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Engagement Score</p>
            <h3 className="text-2xl font-bold text-slate-900">{engagement}/100</h3>
            <p className="text-[10px] text-slate-500 mt-1">Pulse survey index</p>
          </div>
        </div>
      </div>

      {/* Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        {/* Department Distribution */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Headcount by Department</h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} layout="vertical">
                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} width={120} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender Distribution */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col items-center">
          <h3 className="text-sm font-semibold text-slate-800 self-start mb-4">Gender Diversity Ratio</h3>
          <div className="h-[240px] w-full flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2">
            {genderData.map((g, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                <span className="text-slate-600 font-semibold">{g.name} ({Math.round((g.value / headcount) * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HR Reports Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-blue-600">article</span>
            Available Analytical Reports
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {reports.map((r, i) => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">description</span>
                <div>
                  <h4 className="font-bold text-slate-900">{r.name}</h4>
                  <p className="text-[10px] text-slate-400">{r.format} · {r.size}</p>
                </div>
              </div>
              <button className="rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">download</span> Download
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
