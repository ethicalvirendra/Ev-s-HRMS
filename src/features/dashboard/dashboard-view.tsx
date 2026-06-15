import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { getDashboardStats } from "@/lib/dashboard.functions";

type TileItem = {
  label: string;
  icon: string;
  colorClass: string;
  to: string;
  search?: Record<string, any>;
};

export function DashboardView() {
  const fetchStats = useServerFn(getDashboardStats);
  const stats = useQuery({ queryKey: ["dashboard", "stats"], queryFn: () => fetchStats() });

  const d = stats.data;
  const userName = d?.currentEmployee?.full_name || "Virendra Bisen";
  const userRole = "Super Administrator";
  const userAvatar = d?.currentEmployee?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuDOa8eMyIW4R_BAykd_CjwoBDR6EgpTlH5eXoqfZ2Fal8QQ4I8o5xf9-MtjFvNWFibNlRLNC_wi7lj_dImmlbfW8b2KS0oU450PjWmdHve7N9N-hpWaLYLLqYdnPl9mD3_onrtqoFiOuTP-c10nCNjPYp7HZOhLX0CJttoMHEDjVBD_TIDEs-VRGtBQGbKzgiVVfduMOrvdvtu-2PgxWYkap-XvG_8rui76XRj94juDXjvI7FVKapQZMWIeFx_InPkgtQKgNkRTKwQ";

  const tiles: TileItem[] = [
    { label: "Manage Accounts", icon: "manage_accounts", colorClass: "text-amber-500", to: "/organization" },
    { label: "Onboarding", icon: "assignment_ind", colorClass: "text-orange-500", to: "/directory", search: { tab: "onboard" } },
    { label: "Employee Information", icon: "domain", colorClass: "text-yellow-600", to: "/directory", search: { tab: "all" } },
    { label: "Leave Tracker", icon: "beach_access", colorClass: "text-sky-500", to: "/leave" },
    { label: "Attendance", icon: "event_available", colorClass: "text-red-500", to: "/attendance" },
    { label: "Shifts", icon: "work_history", colorClass: "text-teal-600", to: "/attendance" },
    { label: "Time Tracker", icon: "watch_later", colorClass: "text-orange-600", to: "/attendance" },
    { label: "Performance", icon: "military_tech", colorClass: "text-green-500", to: "/talent" },
    
    { label: "LMS", icon: "school", colorClass: "text-blue-600", to: "/learning" },
    { label: "Files", icon: "folder", colorClass: "text-cyan-500", to: "/helpdesk" },
    { label: "Employee Engagement", icon: "group_work", colorClass: "text-pink-600", to: "/collaboration" },
    { label: "HR Help Desk", icon: "inbox", colorClass: "text-purple-500", to: "/helpdesk" },
    { label: "HR Letters", icon: "description", colorClass: "text-orange-500", to: "/helpdesk" },
    { label: "Travel", icon: "flight", colorClass: "text-red-400", to: "/payroll" },
    { label: "Tasks", icon: "check_box", colorClass: "text-orange-500", to: "/talent" },
    { label: "Compensation", icon: "payments", colorClass: "text-pink-500", to: "/payroll" },
    
    { label: "General", icon: "settings", colorClass: "text-yellow-500", to: "/helpdesk" },
    { label: "Offboarding", icon: "logout", colorClass: "text-red-600", to: "/directory", search: { tab: "offboard" } },
    { label: "OKR", icon: "track_changes", colorClass: "text-orange-500", to: "/talent" },
    { label: "Assets & Devices", icon: "devices", colorClass: "text-indigo-600", to: "/assets" },
    { label: "Pulse Surveys", icon: "poll", colorClass: "text-rose-500", to: "/surveys" },
    { label: "Benefits & Insurance", icon: "medical_services", colorClass: "text-emerald-500", to: "/benefits" },
    { label: "Succession Planning", icon: "assignment_ind", colorClass: "text-indigo-500", to: "/succession" },
    { label: "Marketplace", icon: "store", colorClass: "text-blue-500", to: "/learning" },
    { label: "Developer Space", icon: "code", colorClass: "text-red-500", to: "/auth" },
    { label: "Zia", icon: "auto_awesome", colorClass: "text-violet-600", to: "/zia" },
  ];

  const orgName = d?.organization?.name || "Ev";
  const orgLogo = d?.organization?.logo_url;
  const headcountCount = d?.headcount || 1;
  const licenseLimit = d?.organization?.license_limit || 10;
  const licensePercent = Math.min(100, (headcountCount / licenseLimit) * 100);
  const strokeOffset = 37.7 - (37.7 * licensePercent) / 100;

  return (
    <div className="min-h-screen bg-slate-100 p-6 space-y-6">
      {/* Top Banner Shell */}
      <div className="flex flex-col sm:flex-row items-center justify-between rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
        {/* Left Logo and License info */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 border border-slate-200 text-white shadow-md overflow-hidden">
            {orgLogo ? (
              <img src={orgLogo} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-2xl font-bold">corporate_fare</span>
            )}
          </div>
          <div>
            <div className="text-lg font-bold text-slate-800 leading-none">{orgName}</div>
            <div className="mt-1.5 flex items-center gap-1.5">
              {/* Circular License Usage Indicator */}
              <div className="relative flex items-center justify-center h-4 w-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="8" cy="8" r="6" stroke="#e2e8f0" strokeWidth="2" fill="transparent" />
                  <circle cx="8" cy="8" r="6" stroke="#3b82f6" strokeWidth="2" fill="transparent" strokeDasharray="37.7" strokeDashoffset={strokeOffset} />
                </svg>
              </div>
              <span className="text-xs text-slate-500 font-medium">User License Usage <strong className="text-slate-800">{headcountCount} / {licenseLimit}</strong></span>
            </div>
          </div>
        </div>

        {/* Right Admin Profile info */}
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-bold text-slate-900 leading-none">{userName}</div>
            <div className="text-xs text-slate-500 mt-1">{userRole}</div>
          </div>
          {userAvatar ? (
            <img src={userAvatar} alt="" className="h-10 w-10 rounded-full border border-slate-200 object-cover shadow-sm" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
              {userName[0]}
            </div>
          )}
        </div>
      </div>

      {/* Grid of Launcher Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {tiles.map((tile, i) => (
          <Link
            key={i}
            to={tile.to}
            search={tile.search}
            className="flex flex-col items-center justify-center rounded-xl bg-white border border-slate-200 p-5 shadow-sm text-center transition-all hover:scale-105 hover:shadow-md hover:border-blue-400 group"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 mb-4 transition-transform group-hover:scale-110 ${tile.colorClass}`}>
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
                {tile.icon}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-800 select-none group-hover:text-blue-600 transition-colors">
              {tile.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
