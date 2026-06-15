## Nexus HRMS — functional rollout

Existing: 10 static screens (Dashboard, Directory, Recruitment, Talent, Payroll, Attendance, Learning, Collaboration, Helpdesk, Analytics) with floating switcher.

We'll layer real functionality on top across several turns. Each phase is a working slice that can be tested before moving on.

### Phase 1 — Foundation (this turn)
- Enable Lovable Cloud (Supabase auth + DB).
- Schema: `profiles`, `user_roles` (`admin`, `manager`, `employee`), `employees`, `departments`.
- Email/password + Google sign-in at `/auth`. Route guard via `_authenticated`.
- Replace static Directory screen with real `/directory` route: list employees from DB, search, filter by department, view profile.
- Seed a handful of demo employees + departments so the UI looks alive.
- Wire sidebar nav (real React links) instead of static HTML iframes for converted screens.

### Phase 2 — Time & Attendance + Time-off (Leave)
- Tables: `attendance_logs` (clock in/out), `leave_types`, `leave_balances`, `leave_requests`.
- Clock-in/out button in top bar writes to `attendance_logs`; today's status surfaced on Dashboard.
- `/attendance` shows daily log + monthly calendar.
- `/leave` shows balances, request form, manager approval inbox (role-gated).

### Phase 3 — Zia AI assistant
- Lovable AI gateway via `createServerFn` + streaming `/api/chat` route.
- Floating Zia panel available on every page. Threaded chat persisted per user in DB.
- Tools: lookup employee, summarize my attendance, list pending approvals.

### Phase 4 — Recruitment
- Tables: `job_requisitions`, `candidates`, `applications`, pipeline stages.
- Kanban pipeline, requisition CRUD, candidate notes.

### Phase 5 — Talent & Performance
- Goals, reviews, 1:1 notes, competency ratings.

### Phase 6 — Payroll & Expenses
- Salary structures, payslips (read-only display), expense claims with approval flow.

### Phase 7 — Helpdesk
- Tickets, categories, SLA timers, agent assignment.

### Phase 8 — Learning (LMS)
- Courses, lessons, enrollments, progress tracking.

### Phase 9 — Collaboration & Engagement
- Announcements feed, channels (lightweight), kudos/recognition.

### Phase 10 — Analytics & Reports
- Aggregate views over real data: headcount trend, attrition, attendance heatmap, hiring funnel.

### Notes
- Roles enforced via `has_role()` security-definer function + RLS on every table.
- Each module replaces the corresponding static HTML screen with a real React route; the iframe fallback stays for screens not yet migrated so nothing breaks mid-build.
- After each phase I'll pause so you can test before moving on.

Approve and I'll start Phase 1.