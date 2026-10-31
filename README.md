# AICTE SmartFlow (SIH26262)

NeuralKnights · SIH

> **Demonstration prototype.** This is not an officially deployed AICTE service. All institutions, users, applications,
> records and thresholds are fictional sample data. Nothing here represents a regulatory decision.

AICTE SmartFlow is a frontend prototype for integrated approval workflow automation, compliance monitoring and alert
management. It is a React + TypeScript + Vite single-page application that runs entirely on mock services and a
browser-local demonstration store. It is designed so the mock services can later be replaced by the existing Express
REST backend (see [INTEGRATION.md](./INTEGRATION.md)).

## Verification status

Dependencies installed successfully. Type-checking, the complete test suite, and the production build pass. Scenario 1
passes its service tests, and all 13 manual checklist checks have now been exercised across new and seeded application
records. See
[Local verification](#local-verification) for exact results and remaining gaps.

## Requirements

- Node.js 18.18 or later (Node 20 LTS or 22 recommended)
- npm 9 or later

## Installation

```bash
cd aicte-smartflow
npm install
```

Optional: copy `.env.example` to `.env.local` to change the data source. The default is the mock data source and needs no
configuration.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server (http://localhost:5173) |
| `npm run build` | Type-check (`tsc -b`) and produce a production build in `dist/` |
| `npm run typecheck` | Type-check only |
| `npm test` | Run the Vitest suite once (jsdom) |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run preview` | Serve the production build locally |

## Local sign-in accounts

The local sign-in form accepts the following registered email addresses:

| Role | Name | Email | Scope |
| --- | --- | --- | --- |
| Institution Administrator | Ananya Sharma | `ananya.sharma@aravali.edu.in` | Aravali Institute of Engineering |
| Regulatory Reviewer | Vikram Mehta | `vikram.mehta@aicte.gov.in` | North region |
| Regulatory Reviewer | Meera Iyer | `meera.iyer@aicte.gov.in` | South region |
| System Administrator | Rajiv Nair | `rajiv.nair@aicte.gov.in` | System-wide view; **no** statutory workflow actions |

Sign out to end the current session. Authentication limitations are documented in
[INTEGRATION.md](./INTEGRATION.md).

## Available modules

| Module | Route | Status in this build |
| --- | --- | --- |
| Overview (dashboard) | `/overview` | Dated notices, service links, role-scoped filters and plain data tables |
| Applications registry | `/applications` | Search, status filter, scope-limited list |
| New application | `/applications/new` | Zod-validated submission form (institution administrators) |
| Application detail | `/applications/:id` | Documents, queries, observations, workflow history and role-specific actions |
| Workflow monitoring | `/workflow` | Functional region, stage, status and officer filters |
| EVC management | `/evc` | EVC queue, validated scheduling, visit completion and history |
| Compliance and undertakings | `/compliance`, `/compliance/:id` | Evidence submissions, reviewer queue and undertaking history |
| Document validity | `/documents` | Validity register, renewal review and reminder/escalation history |
| Alerts and escalations | `/alerts` | Explicit rules evaluation, scoped notifications and audited status actions |
| Reports | `/reports` | Filterable reports and escaped client-side CSV exports |
| Audit trail | `/audit` | Filterable global activity history; not tamper-evident |
| AI assistance | `/ai` | Canned mock responses, visibly AI-labelled and requiring human review |
| Administration | `/admin` | System-admin-only demonstration workflow and policy configuration |

These are mock-backed prototype features, not a connection to an Express backend or an official regulatory system.

### Implemented end-to-end workflow (Scenario 1)

1. An **institution administrator** submits an application (`/applications/new`) and uploads checklist documents by
   file name (PDF names only; no content is stored).
2. A **regulatory reviewer** verifies uploaded documents, records an observation, and raises a **clarification** or a
   **deficiency** (return). Both block scrutiny completion while unresolved.
3. The **institution** responds to the open query. The application returns to scrutiny for review.
4. The **reviewer** accepts the response, or rejects it and reopens the query.
5. When no query is unresolved and all required documents are verified, the **reviewer** confirms scrutiny completion.
   The application advances to the next stage in its demonstration template (for example, EVC).

Every state change writes an audit event in the same atomic step. The application detail's *Workflow history* tab shows
these events.

## Project structure

```
src/
  app/            Routing, navigation definition, store-to-query bridge
  components/     Shared UI primitives (status chips, forms, states, breadcrumbs)
  domain/         Types, role capabilities, workflow templates, demonstration policy values, labels
  features/       Feature modules: auth, applications, dashboard, workflow, compliance, EVC, reports, AI, admin
  layout/         Government-style masthead, navigation and footer
  mock/           Seed data and the shared, persisted demonstration store
  services/       Typed service interfaces, error model, mock adapters, REST adapter stub, HTTP helper
  styles/         Tailwind entry and base styles
  test/           Test setup
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the design.

## Limitations

- **Not an audit system.** The audit log lives in browser storage. It is not tamper-evident or immutable.
- **Local authentication only.** Email lookup and the browser session are not server authentication. See
  [INTEGRATION.md](./INTEGRATION.md).
- **Not regulatory logic.** Workflow templates, checklists and thresholds are sample configuration. The backend must
  validate and execute real transitions.
- **No file upload.** Only file names are recorded.
- **No real alert scheduling.** Alerts are evaluated only after an explicit user action; no browser timer or background
  scheduler is used. All deadlines and thresholds are labelled demonstration policy.
- **No backend integration.** Every REST method deliberately throws `NOT_IMPLEMENTED` until the Express contract is
  supplied. No endpoint paths or request/response contracts have been invented.
- **Mock AI only.** Responses are canned; there is no direct Gemini call or key in the frontend.
- **Single browser.** Data does not sync between browsers or devices.

## Local verification

Commands run in the authoring environment:

```bash
npm install
npm run typecheck
npm test
npm run build
```

- `npm install`: passed; npm reported 9 audit advisories (5 moderate, 2 high, 2 critical).
- `npm run typecheck`: passed.
- `npm test`: passed — 6 test files, 31 tests, including the REST `NOT_IMPLEMENTED` smoke test.
- `npm run build`: passed — 440.64 kB JavaScript (127.45 kB gzip); no chunk-size warning.
- `npm run dev -- --host 127.0.0.1`: started and returned HTTP 200. Browser checks covered valid and unknown-account
  sign-in, overview rendering, mobile navigation at 390 px with no horizontal overflow, application submission,
  document recording, reviewer access, and persistence after reload.
- The 13 Scenario 1 browser checklist checks were exercised across APP-2026-0006 and APP-2026-0007: empty-form
  validation, submission and initial workflow stage, required document states, rejection of a non-PDF name, PDF-name
  uploads and reviewer verification, observation, clarification, institution response, reviewer acceptance, scrutiny
  completion, workflow history, administrator registry/read-only access, out-of-scope denial, reload persistence, and
  sign-out. APP-2026-0006 advanced to EVC and has a visit scheduled for 2 Nov 2026.
- EVC scheduling and completion were also verified on eligible seeded application APP-2026-0003; completing the visit
  activated its next workflow stage and recorded the event history. This does not complete the future-dated visit on
  APP-2026-0006.
- Scenario 1's submission, review, clarification, response and stage advancement also pass in automated service tests.
- The application tablist keyboard behavior is covered by a component test. A full keyboard, tablet, screen-reader and
  page-by-page accessibility audit remains unverified.

### Visual and accessibility verification

- Typography: Noto Sans and JetBrains Mono, both SIL Open Font License (OFL), loaded with `display=swap`.
- Visual tokens: masthead navy `#0B2545`, primary navy `#13315C`, link navy `#1F4E79`, saffron `#FF9933`;
  page/section/body/table/caption sizes are 24/16/14/13/12 px. Status colours are success `#1E7B34`, warning
  `#9A5B00`, danger `#B42318`, and information `#1F4E79`.
- Contrast checks: status-label text against its 8% tint measures success 4.78:1, warning 4.87:1, danger 5.76:1,
  and information 7.62:1. All exceed the 4.5:1 body-text threshold.
- Axe WCAG 2.2 AA scans: sign-in 0 violations (27 rules passed), overview 0 (26 passed), and application detail 0
  (28 passed). The detail scan had one incomplete color-contrast item requiring manual review; no violation was
  reported.
- Browser viewport checks at 1280, 768 and 375 px found no horizontal document overflow across all 14 application
  routes under the system administrator account; institution-specific views (including new application and
  undertaking detail) were also checked under an institution account.
- Text-size and high-contrast preferences persist through local storage. A complete screen-reader, keyboard,
  tablet-by-tablet and every-route accessibility audit remains unverified.

### Manual test checklist (Scenario 1)

1. Sign in as **Ananya Sharma**. Open *Applications* → *New application*.
2. Submit with an empty programme name: expect a field error and no navigation.
3. Enter a valid programme (3+ characters), choose an application type and a workflow, tick the declaration, and submit.
   Expect navigation to the new application, status *Under scrutiny*, and the Scrutiny stage *Active*.
4. On the *Documents* tab, confirm three required items show *Not uploaded*.
5. On *Actions*, record uploads by entering a `.pdf` name (a non-PDF name must show a validation error).
6. Sign out. Sign in as **Vikram Mehta**. Open the same application (it must be visible: North region).
7. On *Actions*, verify the uploaded documents, record an observation, then raise a **Clarification** (≥10 characters).
   Status must change to *Awaiting clarification*, and *Complete scrutiny* must be disabled.
8. Sign out. Sign in as the institution officer. On *Actions*, submit a response (≥10 characters). Status must return to
   *Under scrutiny*.
9. Sign in as the reviewer. Accept the response with a note. Upload/verify any remaining required documents as needed.
   Click *Complete scrutiny…*, then *Confirm completion*. Status must change to *Awaiting EVC*, and the EVC stage must
   become *Active*.
10. Open *Workflow history*: confirm the events are present in chronological order with actor, role, statuses and reason.
11. Sign in as **Rajiv Nair**. Confirm the registry shows APP-2026-0003 and APP-2026-0004 (South region),
    and that the actions tab shows the read-only notice.
12. Sign in as the reviewer and open `/applications/APP-2026-0003`. Expect the permission-denied notice (South region).
13. Reload the browser. Confirm the changes persist. Sign out to end the current session.

### Phase 3–6 verification checklist

These checks describe intended manual coverage; items not exercised in the browser remain unverified even when automated
service tests pass.

- **Workflow/EVC:** change each workflow filter and confirm the rows change; schedule a visit with valid and invalid
  values; complete an eligible visit and confirm the next configured stage and audit history.
- **Compliance/documents:** submit evidence, verify and request clarification; open an undertaking detail; filter
  validity states, submit a renewal, review it, and inspect reminder/escalation history.
- **Alerts/reports/audit/admin:** evaluate alerts explicitly, acknowledge/resolve/escalate and inspect event history;
  filter a report and export CSV; filter the global audit view; save valid admin policy/template changes and confirm
  invalid values are rejected and changes appear in the audit trail.
- **AI:** exercise the available assistance actions and confirm output is marked AI-generated, uncertain where
  applicable, source-referenced when provided, and requires human review.
- **Accessibility:** keyboard through each route, check focus and announcements, and test tablet/mobile table overflow.
  The token-based status-chip contrast check is complete (all tones pass 4.5:1); the full accessibility pass remains
  outstanding.

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md): component structure, navigation, state, service layer, roles and permissions
- [INTEGRATION.md](./INTEGRATION.md): backend integration points, unverified contracts, open questions
- [REQUIREMENTS_TRACEABILITY.md](./REQUIREMENTS_TRACEABILITY.md): mapping from the problem statement to the build
