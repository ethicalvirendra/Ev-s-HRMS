import { createFileRoute, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { DirectoryView } from "@/features/directory/directory-view";
import { AttendanceView } from "@/features/attendance/attendance-view";
import { LeaveView } from "@/features/leave/leave-view";
import { ZiaView } from "@/features/zia/zia-view";
import { RecruitmentView } from "@/features/recruitment/recruitment-view";
import { TalentView } from "@/features/talent/talent-view";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import { PayrollView } from "@/features/payroll/payroll-view";
import { LearningView } from "@/features/learning/learning-view";
import { CollaborationView } from "@/features/collaboration/collaboration-view";
import { HelpdeskView } from "@/features/helpdesk/helpdesk-view";
import { AnalyticsView } from "@/features/analytics/analytics-view";
import { OrganizationView } from "@/features/organization/organization-view";
import { AssetsView } from "@/features/assets/assets-view";
import { SurveysView } from "@/features/surveys/surveys-view";
import { BenefitsView } from "@/features/benefits/benefits-view";
import { SuccessionView } from "@/features/succession/succession-view";
import { KNOWN_SCREENS, STATIC_SCREENS, NAV } from "@/lib/nav";

const TITLES: Record<string, string> = Object.fromEntries(NAV.map((n) => [n.to.slice(1), n.label]));

export const Route = createFileRoute("/_authenticated/$screen")({
  ssr: false,
  beforeLoad: ({ params }) => {
    if (!KNOWN_SCREENS.has(params.screen)) throw notFound();
  },
  component: ScreenPage,
  notFoundComponent: () => (
    <AppShell title="Not found">
      <div className="p-8 text-sm text-slate-500">That screen doesn't exist.</div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell title="Error">
      <div className="p-8 text-sm text-red-600">{error.message}</div>
    </AppShell>
  ),
});

function ScreenPage() {
  const { screen } = Route.useParams();
  const title = TITLES[screen] ?? screen;

  if (screen === "dashboard") {
    return (
      <AppShell title="Dashboard">
        <DashboardView />
      </AppShell>
    );
  }
  if (screen === "directory") {
    return (
      <AppShell title="Employee Directory">
        <DirectoryView />
      </AppShell>
    );
  }
  if (screen === "attendance") {
    return (
      <AppShell title="Attendance">
        <AttendanceView />
      </AppShell>
    );
  }
  if (screen === "leave") {
    return (
      <AppShell title="Time-off">
        <LeaveView />
      </AppShell>
    );
  }
  if (screen === "zia") {
    return (
      <AppShell title="Zia · AI Assistant">
        <ZiaView />
      </AppShell>
    );
  }
  if (screen === "recruitment") {
    return (
      <AppShell title="Recruitment">
        <RecruitmentView />
      </AppShell>
    );
  }
  if (screen === "talent") {
    return (
      <AppShell title="Talent & Performance">
        <TalentView />
      </AppShell>
    );
  }
  if (screen === "payroll") {
    return (
      <AppShell title="Payroll & Expenses">
        <PayrollView />
      </AppShell>
    );
  }
  if (screen === "learning") {
    return (
      <AppShell title="Learning & Development">
        <LearningView />
      </AppShell>
    );
  }
  if (screen === "collaboration") {
    return (
      <AppShell title="Collaboration">
        <CollaborationView />
      </AppShell>
    );
  }
  if (screen === "helpdesk") {
    return (
      <AppShell title="Helpdesk & Support">
        <HelpdeskView />
      </AppShell>
    );
  }
  if (screen === "analytics") {
    return (
      <AppShell title="Workforce Analytics">
        <AnalyticsView />
      </AppShell>
    );
  }
  if (screen === "organization") {
    return (
      <AppShell title="Organization Settings">
        <OrganizationView />
      </AppShell>
    );
  }
  if (screen === "assets") {
    return (
      <AppShell title="Assets & Devices">
        <AssetsView />
      </AppShell>
    );
  }
  if (screen === "surveys") {
    return (
      <AppShell title="Pulse Surveys">
        <SurveysView />
      </AppShell>
    );
  }
  if (screen === "benefits") {
    return (
      <AppShell title="Benefits & Insurance">
        <BenefitsView />
      </AppShell>
    );
  }
  if (screen === "succession") {
    return (
      <AppShell title="Succession Planning">
        <SuccessionView />
      </AppShell>
    );
  }

  if (STATIC_SCREENS.has(screen)) {
    return (
      <AppShell title={title}>
        <div className="relative h-full w-full bg-white">
          <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-800 shadow">
            Preview — not yet wired to live data
          </div>
          <iframe
            key={screen}
            src={`/screens/${screen}.html`}
            title={title}
            className="h-full w-full border-0"
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={title}>
      <div className="p-8 text-sm text-slate-500">Coming soon.</div>
    </AppShell>
  );
}
