# Architecture — AICTE SmartFlow (prototype)

Status: TypeScript, unit/component tests, production build and the REST-stub smoke test have passed. See
README → Verification status for the exact commands and unverified manual checks.

## 1. Goals and constraints

- Frontend only. The existing Express backend is not replaced. The frontend must never access the JSON database or the
  Gemini API directly.
- Every UI control performs a real, shared-state action in mock mode. No decorative buttons.
- All data access goes through a typed service layer, so a REST adapter can replace the mock adapter without changing UI
  code.
- Frontend role checks are a UX convenience. The mock services enforce the same checks a backend must, so the tests
  exercise realistic rules.

## 2. Layering

```
UI (features/*, components/*, layout/*)
   │  uses hooks only (features/*/hooks.ts)
   ▼
TanStack Query hooks ── invalidated by StoreBridge on every committed change
   │
   ▼
services/index.ts  ── composition root: picks mock or REST adapter from VITE_DATA_SOURCE
   │
   ├── services/mock/*   implement the interfaces in services/types.ts against mock/store
   └── services/rest/*   NOT_IMPLEMENTED stub; every method fails with NOT_IMPLEMENTED
            │
            └── services/http/httpClient.ts  (Bearer header, 401/403 mapping; no endpoint paths)
   │
   ▼
mock/store.ts  ── shared, persisted demonstration state (localStorage) with atomic `transact`
domain/*        ── types, capabilities, workflow templates, policy values, labels (no React, no I/O)
```

Dependency rule: `domain/` depends on nothing in the app. `services/` depends on `domain/` and `mock/`. `features/` and
`components/` depend on `services/` and `domain/`. Auth user lookup also goes through `AuthService`; components do not
read the mock store directly.

## 3. Component structure

```
app/
  App.tsx                     route table; RequireAuth guard; module routes
  navigation.ts               primary navigation definition with capability requirements
  StoreBridge.tsx             subscribes to the store and invalidates all TanStack queries
layout/
  AppShell.tsx                government-style masthead, responsive navigation, outlet and footer
  PortalChrome.tsx            utility bar, masthead and footer
features/
  auth/                       AuthContext (email lookup), SignInPage
  dashboard/DashboardPage.tsx dated notices, service cards, filters and record tables
  modules/
    ModulePages.tsx           workflow, EVC, compliance, documents, alerts, reports, audit, admin and AI pages
    schemas.ts                Zod schemas for module forms
    __tests__/                module component interaction tests
  applications/
    ApplicationsListPage.tsx  registry with search and status filter
    NewApplicationPage.tsx    RHF + Zod submission form
    ApplicationDetailPage.tsx header, accessible tablist, panel switching
    hooks.ts                  query and mutation hooks; `applicationActions` map
    schemas.ts                Zod schemas for every form
    panels/
      OverviewPanel.tsx       details, workflow timeline, next prescribed stage
      RecordsPanels.tsx       checklist table, queries and observations, audit history
      ActionsPanel.tsx        role dispatcher
      InstitutionActions.tsx  upload checklist item, respond to queries
      ReviewerActions.tsx     verify documents, observations, raise query, review responses, complete stage
components/
  ui.tsx                      StatusChip, Button, Panel, FormField, LoadingState, ErrorState, EmptyState, ...
  Breadcrumbs.tsx
```

## 4. Navigation architecture

- Route table in `app/App.tsx`. Each primary nav item from the problem statement maps to one route (see
  `app/navigation.ts`).
- The primary navigation filters items by capability (`requires`). Visibility is a convenience. Direct navigation to a route is
  still permitted, and the service layer returns `PERMISSION_DENIED` for data the user may not access.
- Breadcrumbs are rendered per page. Active navigation is set by `NavLink`.
- The navigation collapses below the `lg` breakpoint behind a button with `aria-expanded` and `aria-controls`.
- The application detail uses a WAI-ARIA tablist with arrow-key, Home and End support.

## 5. State management

Three layers, from source of truth outward:

1. **Local store (`mock/store.ts`).** One object holding the entire dataset. It is persisted to localStorage
   under a versioned key (`…:v3`). A shape check rejects incompatible stored data and falls back to the seed. Mutations
   go through `transact(draft => …)`, which deep-copies the state, applies the change, and commits once. This makes an
   application's status, stage, queries and its audit event change together or not at all.
2. **Server-state cache (TanStack Query).** Reads are cached under keys that include the acting user and the filters.
   `StoreBridge` subscribes to the store and calls `invalidateQueries()` after every commit, so all open modules refresh.
   Mutations do not invalidate by themselves. This is deliberate: one mechanism keeps cross-module state consistent.
3. **Local UI state.** Form state (React Hook Form), tab selection, confirmation steps, transient success and error
   messages.

The local session (authenticated user id) is stored in sessionStorage. Token storage is not modelled, because the
backend authentication contract is unverified.

## 6. Service layer design

- `services/types.ts` defines the application, workflow, dashboard, EVC, compliance, document, notification, report,
  audit, admin, AI and auth contracts, plus the composed `ServiceSet`. Methods take the acting `DemoUser` explicitly.
- Stable error codes: `PERMISSION_DENIED`, `NOT_FOUND`, `VALIDATION_FAILED`, `INVALID_TRANSITION`, `UNAUTHORISED`,
  `NOT_IMPLEMENTED`, `NETWORK_ERROR`, `UNKNOWN`. `describeError` maps any thrown value to a safe user message.
- Mock adapters run checks in this order: capability (`requireCapability`), scope (`requireApplicationAccess`), input
  validation, then state preconditions (`INVALID_TRANSITION`), then one atomic commit.
- New-module services apply capability and institution/region checks to list and mutation operations. Alert access is
  scoped through its related application, undertaking or document; acknowledged/resolved/escalated transitions are
  audited and terminal/duplicate transitions are rejected.
- Simulated latency (120 ms) gives loading states something to show. It is a single constant in `mock/guards.ts`.
- The REST adapter (`services/rest/restServices.ts`) is an explicit stub. It defines no endpoint paths. Selecting it with
  `VITE_DATA_SOURCE=rest` shows *NOT_IMPLEMENTED* errors in the UI, which is intended.
- The AI mock returns canned, clearly labelled responses. Real AI calls must go through the Express backend; no key or
  direct Gemini call exists in the frontend.
- Reports are generated from service data; CSV escaping and download happen client-side.

## 7. Workflow model

- `domain/workflowTemplates.ts` holds four **demonstration** templates (scrutiny only; scrutiny + EVC; EVC + SAC/SHC;
  EVC only), each an ordered list of stages with the application status to show while the stage is active.
- Stage status values: `completed`, `active`, `pending`, `returned`, `blocked`. A clarification sets the current stage to
  *blocked*. A deficiency return sets it to *returned*. A response reactivates it.
- The application status and current stage are kept in step by mock-service transactions. Scrutiny completion advances
  to the next enabled template stage; EVC visit completion advances to the next enabled stage or the decision record.
- No regulatory transition is hardcoded as universal. The templates are data, so they can be replaced by configuration
  from the backend.

Application status transitions implemented in the mock:

| From | Operation | To |
| --- | --- | --- |
| (new) | submit | under_scrutiny (first stage active) |
| under_scrutiny | raise clarification | awaiting_clarification (stage blocked) |
| under_scrutiny | raise deficiency | returned_to_institution (stage returned) |
| awaiting_clarification / returned_to_institution | respond to query | under_scrutiny (stage active) |
| responded query | reject response | awaiting_clarification or returned_to_institution (query reopened) |
| responded query | accept response | no status change (query verified) |
| under_scrutiny | complete scrutiny (no unresolved queries, required docs verified) | next template stage's status (e.g. awaiting_evc) |
| awaiting_evc | schedule visit | evc_scheduled |
| evc_scheduled | complete visit on/after its scheduled date | next enabled template stage (e.g. under_review) |

## 8. Role and permission model

- `domain/types.ts` defines a `Capability` union. `domain/permissions.ts` maps each role to a capability list. Roles
  are configurable data: adding a role means adding a map entry, not new branching code.
- Three roles: `institution_admin`, `regulatory_reviewer`, `system_admin`. System administrators have no statutory
  workflow capabilities (`scrutiny.complete_stage`, `scrutiny.return`, and so on). This is asserted in tests.
- Scope rules (`services/mock/guards.ts`):
  - institution administrators: applications of their own institution;
  - reviewers: applications of institutions in their region;
  - system administrators: all applications, view only.
- Alerts are generated only on explicit rule evaluation or a permitted explicit escalation action; there is no browser
  timer or automatic background scheduler. The configured dates and thresholds are demonstration-only.
- The UI hides or disables actions the user cannot take. This is a convenience. The mock service rejects the same action
  if called directly.

## 9. Audit model

- Every mutating operation appends one `AuditEvent` in the same `transact` call as the change it records.
- Each event holds: application id, related record id, action, actor id, actor name, actor role, timestamp, previous
  status, new status and reason.
- The prototype log lives in browser storage. It is **not** tamper-evident or immutable. The UI says so.
- Production audit events must come from the backend, and the frontend should only display them.

## 10. Accessibility approach

- Semantic elements: `table` with `caption`, `th scope`; `nav` with `aria-label`; `main` with `id` for the skip link.
- Forms: each field has a visible `label` tied by `htmlFor`; errors are linked through `aria-invalid` and `aria-describedby`.
- Status is never colour-only: every chip carries text.
- Loading, error and success states use `role="status"` or `role="alert"`.
- Focus is visible (`focus-ring` utility). Tabs support arrow keys.
- Automated accessibility scanning, screen-reader testing, all-page keyboard review and responsive testing have not
  been completed. Browser interaction checks covered Scenario 1 and selected EVC, compliance, document, alert,
  report-filter/download, audit, admin and AI flows. Static text/background contrast
  calculated from the status-chip Tailwind tokens passes WCAG AA for every tone (neutral 13.88:1, info 13.75:1,
  warning 8.75:1, danger 7.60:1, success 6.81:1).

## 11. Testing approach

- Vitest with jsdom and Testing Library (set up in `src/test/setup.ts`).
- Unit tests cover workflow templates and role capabilities (`src/domain/__tests__`).
- Service tests cover application workflow, EVC, compliance, renewals, alert/escalation rules and scope, audit,
  reporting, admin configuration, AI and REST stubs (`src/services/*/__tests__`).
- Component tests cover EVC validation/submission, permission denial and application tablist keyboard behavior. The
  Scenario 1 checklist was exercised manually in a browser; not every later module has an end-to-end browser pass.

## 12. Known architectural gaps

- No error boundary around route trees.
- The store clones the entire dataset on each commit. Acceptable for demonstration sizes, not for production.
- Pagination and server-side filtering are absent; all lists are filtered in memory.
- The dashboard's stage and region breakdowns are computed from the full visible set on every request.
- REST integration remains blocked on the Express backend contract. The REST adapter deliberately has no endpoint paths
  or assumed payload shapes.
- Full accessibility, mobile/tablet, and measured contrast validation remain outstanding.
