// Domain types for AICTE SmartFlow (prototype). These mirror the functional
// specification at a conceptual level; field names are NOT a verified backend contract.

export type RoleId = 'institution_admin' | 'regulatory_reviewer' | 'system_admin';

export type Capability =
  | 'application.submit'
  | 'application.view_own_institution'
  | 'application.view_authorised'
  | 'application.view_all'
  | 'document.upload'
  | 'document.verify'
  | 'deficiency.respond'
  | 'scrutiny.record_observation'
  | 'scrutiny.request_clarification'
  | 'scrutiny.complete_stage'
  | 'scrutiny.return'
  | 'scrutiny.review_response'
  | 'evc.schedule'
  | 'evc.complete'
  | 'compliance.submit_evidence'
  | 'compliance.verify'
  | 'renewal.submit'
  | 'alerts.evaluate'
  | 'alerts.view_escalations'
  | 'reports.export'
  | 'audit.view'
  | 'ai.use'
  | 'admin.configure_workflow'
  | 'alerts.manage';

export interface DemoUser {
  id: string;
  email: string;
  displayName: string;
  role: RoleId;
  institutionName: string | null;
  /** Institution scope for institution admins. Null = not institution-scoped. */
  institutionId: string | null;
  /** Region scope for reviewers. Null = not region-scoped. */
  region: string | null;
  designation: string;
}

export type WorkflowKind = 'scrutiny_only' | 'scrutiny_evc' | 'evc_sac_shc' | 'evc_only';

export type StageStatus = 'completed' | 'active' | 'pending' | 'returned' | 'blocked';

export interface WorkflowStage {
  key: string;
  label: string;
  status: StageStatus;
  completedOn?: string;
}

export type ApplicationStatus =
  | 'under_scrutiny'
  | 'awaiting_clarification'
  | 'returned_to_institution'
  | 'awaiting_evc'
  | 'evc_scheduled'
  | 'under_review'
  | 'approved'
  | 'rejected';

export interface Institution {
  id: string;
  name: string;
  region: string;
  state: string;
}

export interface Application {
  id: string;
  institutionId: string;
  programme: string;
  applicationType: string;
  workflow: WorkflowKind;
  status: ApplicationStatus;
  currentStageKey: string;
  stages: WorkflowStage[];
  responsibleOfficerId: string;
  submittedOn: string;
  lastActionOn: string;
}

export type QueryKind = 'clarification' | 'deficiency';

/**
 * A reviewer-raised query. `clarification` asks for information; `deficiency` returns the
 * application to the institution. Both must be answered and then reviewed before scrutiny
 * can be completed.
 */
export interface ScrutinyQuery {
  id: string;
  applicationId: string;
  kind: QueryKind;
  /** open → responded (by institution) → verified (accepted by reviewer) | open (rejected, reissued). */
  status: 'open' | 'responded' | 'verified';
  reason: string;
  raisedById: string;
  raisedOn: string;
  response: string | null;
  respondedById: string | null;
  respondedOn: string | null;
  reviewNote: string | null;
  reviewedById: string | null;
  reviewedOn: string | null;
}

export interface Observation {
  id: string;
  applicationId: string;
  authorId: string;
  recordedOn: string;
  text: string;
}

export type ChecklistStatus = 'pending' | 'uploaded' | 'verified';

export interface ChecklistItem {
  id: string;
  applicationId: string;
  label: string;
  required: boolean;
  status: ChecklistStatus;
  /** Demonstration only: a file NAME is recorded. No file content is stored or transmitted. */
  fileName: string | null;
  uploadedOn: string | null;
}

export type AuditActorRole = RoleId | 'system';

/** Every state change in the prototype appends one of these. Mock-only; not tamper-evident. */
export interface AuditEvent {
  id: string;
  applicationId: string | null;
  relatedRecord: string | null;
  action: string;
  actorId: string;
  actorName: string;
  actorRole: AuditActorRole;
  timestamp: string;
  previousStatus: string | null;
  newStatus: string | null;
  reason: string | null;
}

export interface EvcVisit {
  id: string;
  applicationId: string;
  visitDate: string;
  committeeMemberIds: string[];
  venue: string;
  status: 'scheduled' | 'completed';
  scheduledById: string;
  scheduledOn: string;
  completedOn: string | null;
}

export interface EvidenceRecord {
  id: string;
  undertakingId: string;
  fileName: string;
  submittedById: string;
  submittedOn: string;
  status: 'awaiting_verification' | 'verified' | 'clarification_requested';
  reviewerNote: string | null;
}

export interface Undertaking {
  id: string;
  institutionId: string;
  condition: string;
  dueDate: string;
  evidence: EvidenceRecord[];
}

export interface DocumentReminder {
  id: string;
  documentId: string;
  kind: 'reminder' | 'escalation';
  date: string;
  message: string;
}

export interface DocumentRenewal {
  id: string;
  fileName: string;
  submittedById: string;
  submittedOn: string;
  status: 'awaiting_verification' | 'verified' | 'clarification_requested';
  reviewerNote: string | null;
}

export interface DocumentRecord {
  id: string;
  institutionId: string;
  type: string;
  submittedOn: string;
  issueDate: string;
  expiryDate: string;
  status: 'awaiting_verification' | 'verified';
  reminders: DocumentReminder[];
  renewals: DocumentRenewal[];
}

export interface AlertEvent {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  date: string;
  note: string | null;
}

export interface DemoAlert {
  id: string;
  relatedRecordId: string;
  category: 'application_overdue' | 'evc_overdue' | 'undertaking_due' | 'document_expiry' | 'escalation';
  severity: 'low' | 'medium' | 'high';
  responsibleParty: string;
  deadline: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'escalated';
  title: string;
  events: AlertEvent[];
}

export interface DemoPolicy {
  overdueThresholdDays: number;
  escalationThresholdDays: number;
  queryResponseWindowDays: number;
  evcVisitDeadlineDays: number;
  documentApproachingExpiryDays: number;
}

export interface DemoDataset {
  asOfDate: string;
  institutions: Institution[];
  users: DemoUser[];
  applications: Application[];
  queries: ScrutinyQuery[];
  observations: Observation[];
  checklistItems: ChecklistItem[];
  auditEvents: AuditEvent[];
  evcVisits: EvcVisit[];
  undertakings: Undertaking[];
  documents: DocumentRecord[];
  alerts: DemoAlert[];
  policy: DemoPolicy;
  workflowEnabled: Record<WorkflowKind, boolean>;
  workflowStagesEnabled: Record<WorkflowKind, Record<string, boolean>>;
}
