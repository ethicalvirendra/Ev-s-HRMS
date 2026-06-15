export type NavItem = {
  to: string;
  label: string;
  icon: string;
  group: "core" | "support";
  live?: boolean;
};

export const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard", group: "core", live: true },
  { to: "/directory", label: "Directory", icon: "groups", group: "core", live: true },
  { to: "/attendance", label: "Attendance", icon: "event_available", group: "core", live: true },
  { to: "/leave", label: "Time-off", icon: "beach_access", group: "core", live: true },
  { to: "/recruitment", label: "Recruitment", icon: "person_search", group: "core", live: true },
  { to: "/talent", label: "Talent", icon: "star", group: "core", live: true },
  { to: "/payroll", label: "Payroll", icon: "payments", group: "core", live: true },
  { to: "/learning", label: "Learning", icon: "school", group: "core", live: true },
  { to: "/collaboration", label: "Collaboration", icon: "forum", group: "core", live: true },
  { to: "/helpdesk", label: "Helpdesk", icon: "support_agent", group: "core", live: true },
  { to: "/analytics", label: "Analytics", icon: "analytics", group: "core", live: true },
  { to: "/assets", label: "Assets", icon: "devices", group: "core", live: true },
  { to: "/surveys", label: "Surveys", icon: "poll", group: "core", live: true },
  { to: "/benefits", label: "Benefits", icon: "medical_services", group: "core", live: true },
  { to: "/succession", label: "Succession", icon: "assignment_ind", group: "core", live: true },
];

// Screens routable through /$screen — both live (handled in code) and static (iframe fallback)
export const KNOWN_SCREENS = new Set([
  "dashboard","directory","recruitment","talent","payroll","attendance",
  "learning","collaboration","helpdesk","analytics","leave","zia","organization","assets","surveys",
  "benefits","succession",
]);

// Static HTML files available in /public/screens/
export const STATIC_SCREENS = new Set<string>([]);
