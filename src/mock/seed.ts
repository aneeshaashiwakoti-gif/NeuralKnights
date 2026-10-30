import type {
  Application,
  AuditEvent,
  ChecklistItem,
  DemoDataset,
  Observation,
  ScrutinyQuery,
  WorkflowStage,
} from '../domain/types';
import { DEMO_POLICY } from '../domain/policy';
import { DEMO_CHECKLIST_LABELS, WORKFLOW_TEMPLATES } from '../domain/workflowTemplates';

/**
 * Fictional institutions and records support repeatable local development.
 */
export const DEMO_AS_OF_DATE = '2026-10-30';

const AS_OF = DEMO_AS_OF_DATE;

function stagesFor(kind: Application['workflow'], activeKey: string, completedKeys: string[], completedOn: string): WorkflowStage[] {
  return WORKFLOW_TEMPLATES[kind].stages.map((s) => {
    if (s.key === activeKey) return { key: s.key, label: s.label, status: 'active' as const };
    if (completedKeys.includes(s.key)) return { key: s.key, label: s.label, status: 'completed' as const, completedOn };
    return { key: s.key, label: s.label, status: 'pending' as const };
  });
}

function checklistFor(applicationId: string, statuses: ChecklistItem['status'][], uploadedOn: string): ChecklistItem[] {
  return DEMO_CHECKLIST_LABELS.map((item, i) => {
    const status = statuses[i] ?? 'pending';
    return {
      id: `${applicationId}-chk-${i + 1}`,
      applicationId,
      label: item.label,
      required: item.required,
      status,
      fileName: status === 'pending' ? null : `attachment-${i + 1}.pdf`,
      uploadedOn: status === 'pending' ? null : uploadedOn,
    };
  });
}

const applications: Application[] = [
  {
    id: 'APP-2026-0001',
    institutionId: 'INST-0001',
    programme: 'B.Tech. Computer Science and Engineering',
    applicationType: 'New programme approval',
    workflow: 'scrutiny_evc',
    status: 'under_scrutiny',
    currentStageKey: 'scrutiny',
    stages: stagesFor('scrutiny_evc', 'scrutiny', [], ''),
    responsibleOfficerId: 'u-rev-01',
    submittedOn: '2026-09-15',
    lastActionOn: '2026-09-15',
  },
  {
    id: 'APP-2026-0002',
    institutionId: 'INST-0001',
    programme: 'Master of Business Administration',
    applicationType: 'Increase in approved intake',
    workflow: 'scrutiny_only',
    status: 'awaiting_clarification',
    currentStageKey: 'scrutiny',
    stages: stagesFor('scrutiny_only', 'scrutiny', [], ''),
    responsibleOfficerId: 'u-rev-01',
    submittedOn: '2026-10-10',
    lastActionOn: '2026-10-20',
  },
  {
    id: 'APP-2026-0003',
    institutionId: 'INST-0002',
    programme: 'Diploma in Civil Engineering',
    applicationType: 'New programme approval',
    workflow: 'evc_sac_shc',
    status: 'awaiting_evc',
    currentStageKey: 'evc',
    stages: stagesFor('evc_sac_shc', 'evc', [], ''),
    responsibleOfficerId: 'u-rev-01',
    submittedOn: '2026-08-20',
    lastActionOn: '2026-08-28',
  },
  {
    id: 'APP-2026-0004',
    institutionId: 'INST-0002',
    programme: 'M.Sc. Data Science',
    applicationType: 'New programme approval',
    workflow: 'evc_sac_shc',
    status: 'under_review',
    currentStageKey: 'sac_shc',
    stages: stagesFor('evc_sac_shc', 'sac_shc', ['evc'], '2026-07-25'),
    responsibleOfficerId: 'u-rev-01',
    submittedOn: '2026-07-01',
    lastActionOn: '2026-07-25',
  },
];

const queries: ScrutinyQuery[] = [
  {
    id: 'QRY-0001',
    applicationId: 'APP-2026-0002',
    kind: 'clarification',
    status: 'open',
    reason: 'Please confirm the faculty-to-student ratio proposed for the requested intake.',
    raisedById: 'u-rev-01',
    raisedOn: '2026-10-20',
    response: null,
    respondedById: null,
    respondedOn: null,
    reviewNote: null,
    reviewedById: null,
    reviewedOn: null,
  },
];

const observations: Observation[] = [
  {
    id: 'OBS-0001',
    applicationId: 'APP-2026-0001',
    authorId: 'u-rev-01',
    recordedOn: '2026-09-18',
    text: 'Initial scrutiny commenced. Prescribed documents are under review.',
  },
];

const checklistItems: ChecklistItem[] = [
  ...checklistFor('APP-2026-0001', ['uploaded', 'uploaded', 'pending', 'pending'], '2026-09-15'),
  ...checklistFor('APP-2026-0002', ['uploaded', 'uploaded', 'uploaded', 'pending'], '2026-10-10'),
  ...checklistFor('APP-2026-0003', ['verified', 'verified', 'verified', 'uploaded'], '2026-08-20'),
  ...checklistFor('APP-2026-0004', ['verified', 'verified', 'verified', 'verified'], '2026-07-01'),
];

const auditEvents: AuditEvent[] = [
  {
    id: 'aud-seed-1',
    applicationId: 'APP-2026-0001',
    relatedRecord: null,
    action: 'Application submitted',
    actorId: 'u-inst-01',
    actorName: 'Ananya Sharma',
    actorRole: 'institution_admin',
    timestamp: '2026-09-15T10:00:00.000Z',
    previousStatus: null,
    newStatus: 'under_scrutiny',
    reason: null,
  },
  {
    id: 'aud-seed-2',
    applicationId: 'APP-2026-0002',
    relatedRecord: 'QRY-0001',
    action: 'Clarification requested',
    actorId: 'u-rev-01',
    actorName: 'Vikram Mehta',
    actorRole: 'regulatory_reviewer',
    timestamp: '2026-10-20T09:30:00.000Z',
    previousStatus: 'under_scrutiny',
    newStatus: 'awaiting_clarification',
    reason: 'Please confirm the faculty-to-student ratio proposed for the requested intake.',
  },
];

export const SEED: DemoDataset = {
  asOfDate: AS_OF,
  institutions: [
    { id: 'INST-0001', name: 'Aravali Institute of Engineering', region: 'North', state: 'Rajasthan' },
    { id: 'INST-0002', name: 'Kaveri College of Engineering', region: 'South', state: 'Karnataka' },
  ],
  users: [
    {
      id: 'u-inst-01',
      email: 'ananya.sharma@aravali.edu.in',
      displayName: 'Ananya Sharma',
      role: 'institution_admin',
      institutionName: 'Aravali Institute of Engineering',
      institutionId: 'INST-0001',
      region: null,
      designation: 'Registrar',
    },
    {
      id: 'u-rev-01',
      email: 'vikram.mehta@aicte.gov.in',
      displayName: 'Vikram Mehta',
      role: 'regulatory_reviewer',
      institutionName: null,
      institutionId: null,
      region: 'North',
      designation: 'Regional Officer',
    },
    {
      id: 'u-rev-02',
      email: 'meera.iyer@aicte.gov.in',
      displayName: 'Meera Iyer',
      role: 'regulatory_reviewer',
      institutionName: null,
      institutionId: null,
      region: 'South',
      designation: 'Regional Officer',
    },
    {
      id: 'u-sys-01',
      email: 'rajiv.nair@aicte.gov.in',
      displayName: 'Rajiv Nair',
      role: 'system_admin',
      institutionName: null,
      institutionId: null,
      region: null,
      designation: 'System Administrator',
    },
  ],
  applications,
  queries,
  observations,
  checklistItems,
  auditEvents,
  evcVisits: [],
  undertakings: [
    {
      id: 'UND-0001',
      institutionId: 'INST-0001',
      condition: 'Submit a current fire-safety compliance undertaking',
      dueDate: '2026-11-15',
      evidence: [],
    },
    {
      id: 'UND-0002',
      institutionId: 'INST-0002',
      condition: 'Confirm accessibility provisions for the campus',
      dueDate: '2026-10-20',
      evidence: [
        {
          id: 'EVD-0001',
          undertakingId: 'UND-0002',
          fileName: 'accessibility-compliance-note.pdf',
          submittedById: 'u-inst-01',
          submittedOn: '2026-10-18',
          status: 'awaiting_verification',
          reviewerNote: null,
        },
      ],
    },
  ],
  documents: [
    {
      id: 'DOC-0001',
      institutionId: 'INST-0001',
      type: 'Registered lease deed',
      submittedOn: '2025-11-01',
      issueDate: '2025-11-01',
      expiryDate: '2027-10-31',
      status: 'verified',
      reminders: [],
      renewals: [],
    },
    {
      id: 'DOC-0002',
      institutionId: 'INST-0001',
      type: 'Fire-safety certificate',
      submittedOn: '2025-11-01',
      issueDate: '2025-11-01',
      expiryDate: '2026-11-15',
      status: 'verified',
      reminders: [
        {
          id: 'REM-0001',
          documentId: 'DOC-0002',
          kind: 'reminder',
          date: '2026-10-15',
          message: 'The document expiry date is approaching.',
        },
      ],
      renewals: [],
    },
    {
      id: 'DOC-0003',
      institutionId: 'INST-0002',
      type: 'Building occupancy certificate',
      submittedOn: '2024-06-01',
      issueDate: '2024-06-01',
      expiryDate: '2026-10-01',
      status: 'verified',
      reminders: [],
      renewals: [],
    },
    {
      id: 'DOC-0004',
      institutionId: 'INST-0002',
      type: 'Land ownership record',
      submittedOn: '2026-10-20',
      issueDate: '2026-10-01',
      expiryDate: '2027-09-30',
      status: 'awaiting_verification',
      reminders: [],
      renewals: [],
    },
  ],
  alerts: [],
  policy: { ...DEMO_POLICY },
  workflowEnabled: {
    scrutiny_only: true,
    scrutiny_evc: true,
    evc_sac_shc: true,
    evc_only: true,
  },
  workflowStagesEnabled: {
    scrutiny_only: { scrutiny: true, decision: true },
    scrutiny_evc: { scrutiny: true, evc: true, decision: true },
    evc_sac_shc: { evc: true, sac_shc: true, decision: true },
    evc_only: { evc: true, decision: true },
  },
};
