# Requirements traceability — AICTE SmartFlow (SIH26262)

This matrix maps the requested prototype scope to implemented behavior and its actual verification level. All data,
policies, deadlines and alerts are fictional demonstration data, not official AICTE determinations.

## Status legend

| Status | Meaning |
| --- | --- |
| **Verified** | The stated command/test or manual browser action completed successfully. |
| **Implemented; not fully verified** | Code exists and focused tests may pass, but the complete page/interaction has not been manually verified. |
| **Partial** | A portion is implemented; the remaining scope is stated. |
| **Backend-dependent** | Requires the Express contract or backend enforcement and cannot be verified in this frontend prototype. |

`npm run typecheck`, `npm test`, `npm run build`, the REST-stub smoke test and the Scenario 1 browser checklist passed.
Phase 3–6 page coverage is not equivalent to a full browser or accessibility audit. See README for the exact command
results and remaining verification gaps.

## A. Dashboard and application management

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| Role-scoped dashboard totals, scrutiny, awaiting EVC, overdue, region, stage and ageing views | Implemented; not fully verified | Dashboard rendered in browser; all dashboard filter combinations were not manually exercised. |
| Searchable application registry and status filter | Implemented; not fully verified | Service/type checks pass; no complete registry filter browser pass. |
| New application submission and validation | Verified | Scenario 1 checklist exercised form validation and submission. |
| Application detail, stages, checklist, queries, observations and actions | Verified | Scenario 1 manually exercised with role changes and workflow history. |
| Upload file-name validation and reviewer document verification | Verified | Scenario 1 browser walkthrough; no file content is uploaded. |
| Institution profile | Partial | Institution data appears on application views; no separate profile page. |
| Application final decision and decision history | Partial | Demonstration workflow can advance configured stages; no final approval/rejection decision action. |
| System administrator has no statutory workflow action | Verified | Browser showed read-only action notice; role capability tests pass. |
| Institution/region access boundaries | Verified | Scenario 1 browser check denied North reviewer access to South application; service tests cover scopes. |

## B. Workflow monitoring and EVC (Phase 3)

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| Stage, region, status and responsible-officer filters | Implemented; not fully verified | Functional service/UI controls; browser check exercised the region filter only. |
| EVC queue and scheduled visits | Verified | Browser scheduled and completed a South-region sample application visit; service tests cover transition constraints. |
| Zod-validated schedule form and committee members | Verified | Component test checks invalid submission and valid service-backed scheduling. |
| Visit completion advances to the next configured stage | Verified | Browser and service tests check the visit/application/stage transition. |
| Sample EVC deadlines and overdue indicators | Implemented; not fully verified | Configured as demonstration policy; policy is not an official timeline. |
| Escalation history | Implemented; not fully verified | Alert evaluation/history is service-tested; no EVC page browser pass. |

## C. Compliance and undertakings (Phase 4)

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| Institution-wise undertaking register and detail | Implemented; not fully verified | Mock service and route implemented; browser walkthrough outstanding. |
| Evidence submission and history | Verified | Browser submitted evidence and displayed the resulting record; service tests cover validation and history state. |
| Reviewer verification and clarification request | Verified | Browser reviewer verification and service transition tests; clarification is service-tested. |
| Due dates, overdue and escalation indicators | Implemented; not fully verified | Explicit rules evaluation uses sample policy and adds events. |

## D. Document validity and renewals (Phase 4)

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| Document type, institution, submission/issue/expiry dates | Implemented; not fully verified | Register and role-scoped service implemented; no full browser pass. |
| Valid, approaching, expired and awaiting-verification distinctions | Verified | Service test checks validity calculation; UI uses text labels plus distinct tones. Contrast ratios are recorded below. |
| Renewal submission and reviewer verification/clarification | Verified | Browser submitted and verified a renewal; service test also covers renewal transition. |
| Reminder and escalation history | Implemented; not fully verified | Explicit alert evaluation can append reminder/escalation entries; browser check outstanding. |

## E. Alerts, reports, audit and administration (Phase 5)

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| Explicit, configurable alert evaluation; no browser timer | Verified | Browser evaluated rules; service tests require system-admin capability and check repeated evaluation. |
| Scoped alert list and acknowledge/resolve/escalate actions | Verified | Browser acknowledged an alert; service tests cover related-record scope, audited transitions and invalid duplicate/terminal transitions. |
| Escalation policy and traceable history | Verified | Service tests confirm sample overdue escalation and audit events. |
| Filterable reports and escaped client-side CSV | Verified | Browser saved the filtered row; a unit test checks comma, quote and line-break escaping. |
| Global audit filters and prototype disclaimer | Verified | Browser filtered the global audit view; service tests cover global scope and filters. Log is not tamper-evident. |
| System-admin-only policy/template configuration and audit event | Verified | Browser saved a policy value and found the corresponding global audit event; service tests cover invalid values and audit recording. |

Scenario 7 is implemented globally through `audit.listGlobal`; the global audit filter and Scenario 1 application
history were both inspected in the browser.

## F. AI assistance (Phase 6)

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| Authorized AI assistance actions | Verified | Browser exercised a mock assistance action through `aiService`. |
| Distinguish generated output, uncertainty, source references and human review | Verified | Browser observed AI-generated label, uncertainty, source-reference section and human-review warning. |
| No Gemini key or direct frontend Gemini call | Verified by implementation | REST method remains `NOT_IMPLEMENTED`; production AI requires the Express contract. |

## G. Accessibility, testing and documentation

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| Accessible form labels and status/error announcements | Implemented; not fully verified | Existing components use labels and status/error roles; no all-page screen-reader review. |
| Application tablist keyboard behavior | Verified | Component test covers ArrowRight, Home and End. |
| Visible focus and keyboard navigation on every page | Partial | Focus utility exists; only tablist behavior has a focused interaction test. Full pass outstanding. |
| Table overflow and tablet/mobile layouts | Implemented; not fully verified | Overflow wrappers and responsive sidebar exist; no all-page viewport sweep. |
| Status-chip text is not color-only; normal-text contrast meets WCAG AA | Verified | Every chip includes text; token-based ratios are neutral 13.88:1, info 13.75:1, warning 8.75:1, danger 7.60:1, success 6.81:1. |
| Strict TypeScript; core service/component tests | Verified | `npm run typecheck` and `npm test` pass. |
| README, architecture, integration and traceability documentation | Verified | Updated to reflect implementation and verification gaps; backend paths are not invented. |

## H. REST integration and external dependencies

| Requirement | Status | Evidence / gap |
| --- | --- | --- |
| All mock module services share the demonstration store | Verified by tests | Service transitions are tested against the shared store. |
| REST adapter remains explicit `NOT_IMPLEMENTED` | Verified | REST-mode smoke test asserts every REST method throws. |
| No endpoint paths or request/response shapes invented | Verified by documentation and implementation | Integration document lists logical operations only; Express contract is outstanding. |
| Authentication, server authorization, persistence, real file upload, audit integrity and Gemini backend | Backend-dependent | The frontend demo role selector and browser store are not production security or storage. |
| npm security advisories and production bundle size | Known, not resolved in this task | `npm install` reported 9 advisories; build reports a JavaScript chunk over 500 kB. |
