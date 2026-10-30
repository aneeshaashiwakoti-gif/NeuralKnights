import type {
  Application,
  ApplicationStatus,
  AuditEvent,
  ChecklistItem,
  DemoAlert,
  DemoPolicy,
  DemoUser,
  DocumentRecord,
  EvcVisit,
  Institution,
  Observation,
  QueryKind,
  ScrutinyQuery,
  Undertaking,
  WorkflowKind,
  WorkflowStage,
} from '../domain/types';
import type { WorkflowTemplate } from '../domain/workflowTemplates';

/**
 * Typed service contracts. The UI depends ONLY on these interfaces.
 * - `mock/*` implements them against the in-browser demonstration store.
 * - `rest/*` will implement them against the existing Express backend once endpoint
 *   contracts are verified (see INTEGRATION.md). Endpoint paths are NOT defined here.
 *
 * `actor` is passed explicitly so that the mock can enforce the same checks a backend must.
 * Frontend checks are a UX convenience only.
 */

/** Stable error codes. The REST adapter must map server responses onto these. */
export type ServiceErrorCode =
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'INVALID_TRANSITION'
  | 'UNAUTHORISED'
  | 'NOT_IMPLEMENTED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface ApplicationFilters {
  search?: string;
  status?: ApplicationStatus | 'all';
  region?: string | 'all';
  institutionId?: string | 'all';
}

export interface ApplicationListItem extends Application {
  institutionName: string;
  region: string;
  /** Days since submission relative to the demonstration as-of date. */
  ageDays: number;
  openQueryCount: number;
}

export interface ApplicationDetail {
  application: Application;
  institution: Institution;
  responsibleOfficer: DemoUser | null;
  /** Demonstration people directory, used only to display names against record IDs. */
  people: DemoUser[];
  stages: WorkflowStage[];
  checklist: ChecklistItem[];
  queries: ScrutinyQuery[];
  observations: Observation[];
  /** Audit events for this application only, newest first. */
  auditEvents: AuditEvent[];
  workflowTemplate: WorkflowTemplate;
}

export interface SubmitApplicationInput {
  programme: string;
  applicationType: string;
  workflow: WorkflowKind;
  institutionId: string;
}

export interface RaiseQueryInput {
  kind: QueryKind;
  reason: string;
}

export interface ApplicationService {
  list(actor: DemoUser, filters?: ApplicationFilters): Promise<ApplicationListItem[]>;
  getDetail(actor: DemoUser, applicationId: string): Promise<ApplicationDetail>;
  submit(actor: DemoUser, input: SubmitApplicationInput): Promise<Application>;
  uploadChecklistItem(actor: DemoUser, checklistItemId: string, fileName: string): Promise<void>;
  verifyChecklistItem(actor: DemoUser, checklistItemId: string): Promise<void>;
  recordObservation(actor: DemoUser, applicationId: string, text: string): Promise<void>;
  raiseQuery(actor: DemoUser, applicationId: string, input: RaiseQueryInput): Promise<void>;
  respondToQuery(actor: DemoUser, queryId: string, response: string): Promise<void>;
  reviewQueryResponse(actor: DemoUser, queryId: string, decision: 'accept' | 'reject', note: string): Promise<void>;
  /**
   * Completes the active stage and moves to the next prescribed stage in the application's
   * template. Only the scrutiny stage is executable in this prototype build (Phase 3 adds EVC).
   * The backend must validate every real transition.
   */
  completeCurrentStage(actor: DemoUser, applicationId: string): Promise<void>;
}

export interface WorkflowService {
  listTemplates(): WorkflowTemplate[];
  getTemplate(kind: WorkflowKind): WorkflowTemplate;
  listApplications(actor: DemoUser, filters?: WorkflowFilters): Promise<ApplicationListItem[]>;
}

export interface WorkflowFilters {
  region?: string | 'all';
  stage?: string | 'all';
  status?: ApplicationStatus | 'all';
  responsibleOfficerId?: string | 'all';
}

export interface DashboardFilters {
  region?: string | 'all';
  status?: ApplicationStatus | 'all';
}

export interface DashboardSummary {
  asOfDate: string;
  totalApplications: number;
  underScrutiny: number;
  awaitingClarificationOrReturned: number;
  awaitingEvc: number;
  openQueries: number;
  queriesAwaitingReview: number;
  overdueApplications: number;
  overdueThresholdDays: number;
  stagePendency: { stageKey: string; stageLabel: string; count: number }[];
  regionDistribution: { region: string; count: number }[];
  ageingBuckets: { bucket: string; count: number }[];
  scope: string;
}

export interface DashboardService {
  getSummary(actor: DemoUser, filters?: DashboardFilters): Promise<DashboardSummary>;
}

export interface AuditService {
  listForApplication(actor: DemoUser, applicationId: string): Promise<AuditEvent[]>;
  listGlobal(actor: DemoUser, filters?: AuditFilters): Promise<AuditEvent[]>;
}

export interface AuditFilters {
  applicationId?: string;
  action?: string;
  actorId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface AuthService {
  listDemoUsers(): Promise<DemoUser[]>;
  findDemoUser(userId: string): DemoUser | undefined;
  authenticate(email: string, password: string): Promise<DemoUser>;
}

export interface EvcService {
  listQueue(actor: DemoUser): Promise<ApplicationListItem[]>;
  listVisits(actor: DemoUser): Promise<EvcVisit[]>;
  getPolicy(actor: DemoUser): Promise<{ policy: DemoPolicy; asOfDate: string }>;
  schedule(actor: DemoUser, input: {
    applicationId: string;
    visitDate: string;
    committeeMemberIds: string[];
    venue: string;
  }): Promise<EvcVisit>;
  completeVisit(actor: DemoUser, visitId: string): Promise<void>;
}

export interface ComplianceService {
  list(actor: DemoUser): Promise<(Undertaking & { institutionName: string })[]>;
  get(actor: DemoUser, undertakingId: string): Promise<Undertaking & { institutionName: string }>;
  submitEvidence(actor: DemoUser, undertakingId: string, fileName: string): Promise<void>;
  reviewEvidence(actor: DemoUser, evidenceId: string, decision: 'verify' | 'clarify', note: string): Promise<void>;
}

export type DocumentValidity = 'valid' | 'approaching_expiry' | 'expired' | 'awaiting_verification';

export interface DocumentListItem extends DocumentRecord {
  institutionName: string;
  validity: DocumentValidity;
}

export interface DocumentService {
  list(actor: DemoUser): Promise<DocumentListItem[]>;
  submitRenewal(actor: DemoUser, documentId: string, fileName: string): Promise<void>;
  reviewRenewal(actor: DemoUser, renewalId: string, decision: 'verify' | 'clarify', note: string): Promise<void>;
}

export interface NotificationService {
  list(actor: DemoUser): Promise<DemoAlert[]>;
  evaluate(actor: DemoUser): Promise<DemoAlert[]>;
  updateStatus(actor: DemoUser, alertId: string, status: 'acknowledged' | 'resolved' | 'escalated', note: string): Promise<void>;
}

export type ReportKind =
  | 'application_pendency'
  | 'stage_processing'
  | 'region_performance'
  | 'evc'
  | 'undertakings'
  | 'document_expiry'
  | 'escalations'
  | 'workload';

export type ReportCell = string | number | null;
export type ReportRow = Record<string, ReportCell>;

export interface ReportService {
  list(actor: DemoUser, kind: ReportKind): Promise<ReportRow[]>;
}

export interface AdminConfiguration {
  policy: DemoPolicy;
  workflowEnabled: Record<WorkflowKind, boolean>;
  workflowStagesEnabled: Record<WorkflowKind, Record<string, boolean>>;
}

export interface AdminService {
  getConfiguration(actor: DemoUser): Promise<AdminConfiguration>;
  updateConfiguration(actor: DemoUser, configuration: AdminConfiguration): Promise<void>;
}

export type AiAction =
  | 'summarise_application'
  | 'explain_deficiencies'
  | 'missing_information'
  | 'draft_communication'
  | 'procedural_question';

export interface AiResponse {
  text: string;
  sourceReferences: string[];
  uncertainty: 'low' | 'medium' | 'high';
  generated: true;
  requiresHumanReview: true;
}

export interface AiService {
  respond(actor: DemoUser, action: AiAction, input: string, applicationId?: string): Promise<AiResponse>;
}

export interface ServiceSet {
  auth: AuthService;
  applications: ApplicationService;
  workflow: WorkflowService;
  dashboard: DashboardService;
  audit: AuditService;
  evc: EvcService;
  compliance: ComplianceService;
  documents: DocumentService;
  notifications: NotificationService;
  reports: ReportService;
  admin: AdminService;
  ai: AiService;
}
