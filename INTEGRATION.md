# Integration — connecting SmartFlow to the existing Express backend

Status: **no backend contract has been verified.** This document lists what the frontend needs, what is assumed, and what
must be confirmed with the owners of the Express backend. It deliberately contains **no endpoint paths**. Inventing them
would make the frontend appear integrated when it is not.

## 1. Integration points (logical operations)

Each logical operation corresponds to one service method. The table names the service method the UI calls, the actor
and scope it needs, and the data it exchanges. Endpoint shapes are to be confirmed.

| Service method | Purpose | Actor | Scope | Mutation |
| --- | --- | --- | --- | --- |
| `auth.authenticate` | Authenticate a supplied email and password | any | — | yes |
| `auth.listDemoUsers` | List committee members available for EVC scheduling | authorised reviewer | region | no |
| `applications.list` | Registry with search and filters | any authorised role | institution / region / all | no |
| `applications.getDetail` | Application, institution, checklist, queries, observations, history, stages | any authorised role | as above | no |
| `applications.submit` | Create an application | institution administrator | own institution | yes |
| `applications.uploadChecklistItem` | Record a checklist upload by file name | institution administrator | own institution/application | yes |
| `applications.verifyChecklistItem` | Verify an uploaded document | reviewer | region | yes |
| `applications.recordObservation` | Scrutiny observation | reviewer | region | yes |
| `applications.raiseQuery` | Clarification or deficiency return | reviewer | region | yes |
| `applications.respondToQuery` | Institution response to a query | institution administrator | own institution | yes |
| `applications.reviewQueryResponse` | Accept or reject a response | reviewer | region | yes |
| `applications.completeCurrentStage` | Complete the active stage and advance | reviewer | region | yes |
| `workflow.listTemplates` / `getTemplate` | Configurable workflow representations | any authorised role | — | no |
| `workflow.listApplications` | Workflow workspace with stage, region, status and officer filters | any authorised role | institution / region / all | no |
| `dashboard.getSummary` | Role-scoped aggregates | any authorised role | as above | no |
| `audit.listForApplication` | Audit events for one application | reviewer, system administrator | as above | no |
| `evc.listQueue` / `listVisits` / `getPolicy` | EVC queue, scheduled visits and sample deadline policy | reviewer | region | no |
| `evc.schedule` / `completeVisit` | Schedule or complete a visit; advance the configured workflow stage | reviewer | region | yes |
| `compliance.list` / `get` | Undertaking register and evidence history | institution administrator, reviewer | institution / region | no |
| `compliance.submitEvidence` / `reviewEvidence` | Record evidence by file name; verify or request clarification | institution administrator, reviewer | institution / region | yes |
| `documents.list` | Document validity, renewals and reminder history | institution administrator, reviewer | institution / region | no |
| `documents.submitRenewal` / `reviewRenewal` | Submit a renewal file name; verify or request clarification | institution administrator, reviewer | institution / region | yes |
| `notifications.list` / `evaluate` / `updateStatus` | Read scoped alerts, explicitly evaluate rules, acknowledge/resolve/escalate | reviewer, system administrator | institution / region / all | evaluate/update yes |
| `reports.list` | Filterable demonstration report data for client-side CSV export | system administrator | all | no |
| `audit.listGlobal` | Filterable global prototype audit events | reviewer, system administrator | region / all | no |
| `admin.getConfiguration` / `updateConfiguration` | Read and change demonstration policies and workflow templates | system administrator | all | update yes |
| `ai.respond` | Summaries, deficiency explanations, missing-information checks, drafts and procedural Q&A | authorised user with `ai.use` | application where supplied | no |

These are frontend logical service operations only. The table does not imply matching backend routes, HTTP methods or
payload schemas; all details remain to be confirmed with the Express backend owners. CSV is generated from currently
filtered demonstration report data in the browser.

## 2. Unverified endpoint contracts

For each operation the backend team must confirm:

1. Route, HTTP method and whether it is idempotent.
2. Request body schema and validation rules.
3. Response body schema, including how lists are paginated and sorted.
4. Error body schema, and how each condition maps to the frontend error codes:
   - 401 → `UNAUTHORISED`
   - 403 → `PERMISSION_DENIED`
   - 404 → `NOT_FOUND`
   - 400/422 → `VALIDATION_FAILED` (with field-level messages, if available)
   - state conflicts → `INVALID_TRANSITION`
5. Whether the server returns the updated application after a mutation (saves a refetch).
6. Whether audit events are written in the same database transaction as the change they record.

## 3. Authentication assumptions requiring confirmation

Password is not verified in this build. The local sign-in operation looks up the registered email address and accepts
the submitted password without checking its value. This is not production authentication and must be replaced with the
backend's confirmed authentication contract before deployment.

The prototype assumes the backend will use bearer tokens with server-side session validation, as the brief states. The
following are **open questions**. The frontend does not guess at any of them:

- How a token is issued (login route, credentials, any OTP or SSO step).
- Where the token is stored in the browser. The prototype stores nothing sensitive. An HTTP-only cookie would change the
  client code.
- Token lifetime, expiry signalling, and whether there is a refresh mechanism.
- Behaviour on 401: whether the frontend should redirect to sign-in, retry, or show a message. The httpClient currently
  calls an `onUnauthorised` callback. Nothing registers that callback yet.
- How the current user's role, institution id and region are returned (for example, in the session response or a
  profile call). The frontend currently derives these from the demonstration seed.
- Whether capabilities are returned by the server (preferred) or derived in the frontend from roles. The frontend's
  role→capability map is a convenience and must not be the source of truth.
- Logout: whether the server session must be revoked.

## 4. Request and response schemas (conceptual)

These are the fields the UI currently displays or sends. They are **not** a verified API. Names may change.

**Application (list item and detail)**
`id`, `institutionId`, `institutionName`, `region`, `programme`, `applicationType`, `workflow` (one of `scrutiny_only`,
`scrutiny_evc`, `evc_sac_shc`, `evc_only`), `status`, `currentStageKey`, `stages[]` (`key`, `label`, `status`,
`completedOn`), `responsibleOfficerId`, `submittedOn` (date), `lastActionOn` (date), `ageDays` (derived, but the server
should compute it against its own clock), `openQueryCount`.

**Query**
`id`, `applicationId`, `kind` (`clarification` | `deficiency`), `status` (`open` | `responded` | `verified`), `reason`,
`raisedById`, `raisedOn`, `response`, `respondedById`, `respondedOn`, `reviewNote`, `reviewedById`, `reviewedOn`.

**Observation**
`id`, `applicationId`, `authorId`, `recordedOn`, `text`.

**Checklist item**
`id`, `applicationId`, `label`, `required`, `status` (`pending` | `uploaded` | `verified`), `fileName`, `uploadedOn`.

**Audit event**
`id`, `applicationId`, `relatedRecord`, `action`, `actorId`, `actorName`, `actorRole`, `timestamp` (ISO 8601 with offset),
`previousStatus`, `newStatus`, `reason`. The frontend displays what the server returns. It must not generate audit events
itself once integrated.

**Dashboard summary**
`asOfDate`, counts (`totalApplications`, `underScrutiny`, `awaitingClarificationOrReturned`, `awaitingEvc`, `openQueries`,
`queriesAwaitingReview`, `overdueApplications`), breakdown arrays (`stagePendency`, `regionDistribution`,
`ageingBuckets`), `overdueThresholdDays`, `scope`. The server should compute the overdue count from its own configured
policy.

**Submit application (request)**
`programme` (3–120 characters), `applicationType` (1–80 characters), `workflow`, `institutionId`. The server must
determine the institution from the authenticated session and reject a mismatched `institutionId`. The frontend sends it
for convenience only.

## 5. File upload requirements

The prototype records file names only. A real integration needs:

- A multipart upload route (to be confirmed) with a maximum size, an allowed-type list, and a checksum response.
- A virus or malware scan before the file is available to reviewers.
- Storage outside the web root, with access checked on each download.
- Server-side validation of the file type. Checking the extension in the browser is only a convenience.
- Upload progress and cancellation in the UI. Both are absent from the prototype.
- Retention rules for superseded versions. Not defined.

## 6. Gemini (AI assistance) integration

- All Gemini requests go through the Express backend. The frontend must not hold, transmit or log a Gemini key.
- The backend should return: the generated text, the source references it used (where available), an uncertainty marker,
  and an explicit "AI-generated, requires human review" flag.
- The frontend must visually separate AI output from verified findings. This is a UI requirement, not a backend one.
- The backend should record, for each AI call, the requesting user, the application (if any) and the input category,
  without storing unnecessary personal data. The retention policy is unresolved.
- The current `aiService` is mock-only and returns labelled canned responses. The REST method remains
  `NOT_IMPLEMENTED`; the frontend has no direct Gemini call or key. The backend request and response contract is not
  defined here.

## 7. Mock-to-REST transition steps

1. Confirm sections 2–4 with the backend team and record the verified contract in this file.
2. Implement `services/rest/restServices.ts` method by method, using `createHttpClient` from `services/http/httpClient.ts`.
   Map server responses to the domain types. Map errors to `ServiceError` codes.
3. Register the 401 handler once, at application start, to clear the session and route to sign-in.
4. Set `VITE_DATA_SOURCE=rest` and `VITE_API_BASE_URL` in `.env.local` (never committed).
5. Run the manual checklist in the README against the real backend. Mark any step that fails.
6. Keep the mock services for offline demonstration. They must not be used silently when the REST adapter is selected.
7. Run the REST-mode smoke test (`$env:VITE_DATA_SOURCE='rest'; npm test -- src/services/rest/__tests__/restSmoke.test.ts`)
   and confirm every REST service method still throws `NOT_IMPLEMENTED`.

## 8. Outstanding backend dependencies

- Verified endpoint paths, methods and schemas for every logical operation in section 1.
- Authentication contract (section 3).
- Server-side enforcement of every capability and scope in the mock services. The frontend tests prove only that the
  frontend implements these rules, not that the server does.
- Workflow configuration source (APH-derived templates) and who may change it.
- Overdue and escalation policy values. The prototype's 30- and 60-day figures are sample values only.
- Audit storage guarantees (append-only, tamper-evident, retention period).
- Clock source for ageing and deadlines. The prototype uses a fixed demonstration date for repeatability. Production must
  use server time.
- Gemini request/response contract, request logging and retention rules.
