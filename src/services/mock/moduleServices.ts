import { DEMO_POLICY } from '../../domain/policy';
import type {
  DemoAlert,
  DemoUser,
  DocumentRecord,
  EvcVisit,
  EvidenceRecord,
} from '../../domain/types';
import { WORKFLOW_KINDS, WORKFLOW_TEMPLATES, getStageTemplate } from '../../domain/workflowTemplates';
import { getState, nextId, pushAudit, transact } from '../../mock/store';
import { ServiceError } from '../errors';
import type {
  AdminConfiguration,
  AdminService,
  AiAction,
  AiService,
  AuditFilters,
  ComplianceService,
  DocumentListItem,
  DocumentService,
  EvcService,
  NotificationService,
  ReportKind,
  ReportRow,
  ReportService,
  WorkflowService,
} from '../types';
import { daysBetween } from './applicationService';
import {
  canViewApplication,
  findApplicationOrThrow,
  institutionRegionOf,
  invalidTransition,
  requireApplicationAccess,
  requireCapability,
  simulateLatency,
} from './guards';

function requireText(value: string, min: number, max: number, label: string): string {
  const text = value.trim();
  if (text.length < min || text.length > max) {
    throw new ServiceError('VALIDATION_FAILED', `${label} must be ${min}–${max} characters.`);
  }
  return text;
}

function requirePdf(fileName: string): string {
  const name = requireText(fileName, 1, 120, 'File name');
  if (!/\.pdf$/i.test(name)) {
    throw new ServiceError('VALIDATION_FAILED', 'Use a .pdf file name. Only file names are recorded.');
  }
  return name;
}

function requireInstitutionAccess(actor: DemoUser, institutionId: string): void {
  const data = getState();
  const institution = data.institutions.find((item) => item.id === institutionId);
  if (!institution) throw new ServiceError('NOT_FOUND', 'Institution not found.', institutionId);
  if (actor.role === 'institution_admin' && actor.institutionId !== institutionId) {
    throw new ServiceError('PERMISSION_DENIED', 'This record is outside your institution scope.');
  }
  if (actor.role === 'regulatory_reviewer' && actor.region !== institution.region) {
    throw new ServiceError('PERMISSION_DENIED', 'This record is outside your regional scope.');
  }
}

function canViewInstitutionRecord(actor: DemoUser, institutionId: string, data = getState()): boolean {
  const institution = data.institutions.find((item) => item.id === institutionId);
  if (!institution) return false;
  if (actor.role === 'system_admin') return true;
  if (actor.role === 'institution_admin') return actor.institutionId === institutionId;
  return actor.role === 'regulatory_reviewer' && actor.region === institution.region;
}

function canViewAlert(actor: DemoUser, alert: DemoAlert, data = getState()): boolean {
  const application = data.applications.find((item) => item.id === alert.relatedRecordId);
  if (application) {
    return canViewApplication(actor, application, institutionRegionOf(data, application.institutionId));
  }
  const undertaking = data.undertakings.find((item) => item.id === alert.relatedRecordId);
  const document = data.documents.find((item) => item.id === alert.relatedRecordId);
  const institutionId = undertaking?.institutionId ?? document?.institutionId;
  return institutionId ? canViewInstitutionRecord(actor, institutionId, data) : actor.role === 'system_admin';
}

function auditActor(actor: DemoUser) {
  return { actorId: actor.id, actorName: actor.displayName, actorRole: actor.role };
}

function visitOverdue(application: { lastActionOn: string }, asOfDate: string, deadlineDays: number): boolean {
  return daysBetween(application.lastActionOn, asOfDate) > deadlineDays;
}

export const mockWorkflowModule: Pick<WorkflowService, 'listApplications'> = {
  async listApplications(actor, filters = {}) {
    await simulateLatency();
    const data = getState();
    return data.applications
      .filter((app) => canViewApplication(actor, app, institutionRegionOf(data, app.institutionId)))
      .filter((app) => !filters.region || filters.region === 'all' || institutionRegionOf(data, app.institutionId) === filters.region)
      .filter((app) => !filters.stage || filters.stage === 'all' || app.currentStageKey === filters.stage)
      .filter((app) => !filters.status || filters.status === 'all' || app.status === filters.status)
      .filter((app) => !filters.responsibleOfficerId || filters.responsibleOfficerId === 'all' || app.responsibleOfficerId === filters.responsibleOfficerId)
      .map((app) => {
        const institution = data.institutions.find((item) => item.id === app.institutionId);
        if (!institution) throw new ServiceError('NOT_FOUND', 'Institution not found.', app.institutionId);
        return {
          ...app,
          institutionName: institution.name,
          region: institution.region,
          ageDays: daysBetween(app.submittedOn, data.asOfDate),
          openQueryCount: data.queries.filter((query) => query.applicationId === app.id && query.status !== 'verified').length,
        };
      });
  },
};

export const mockEvcService: EvcService = {
  async getPolicy(actor) {
    await simulateLatency();
    if (!['regulatory_reviewer', 'system_admin'].includes(actor.role)) {
      throw new ServiceError('PERMISSION_DENIED', 'Your role cannot view EVC policy details.');
    }
    const data = getState();
    return { policy: { ...data.policy }, asOfDate: data.asOfDate };
  },
  async listQueue(actor) {
    await simulateLatency();
    const data = getState();
    return data.applications
      .filter((app) => app.status === 'awaiting_evc')
      .filter((app) => canViewApplication(actor, app, institutionRegionOf(data, app.institutionId)))
      .map((app) => {
        const institution = data.institutions.find((item) => item.id === app.institutionId);
        if (!institution) throw new ServiceError('NOT_FOUND', 'Institution not found.', app.institutionId);
        return {
          ...app,
          institutionName: institution.name,
          region: institution.region,
          ageDays: daysBetween(app.submittedOn, data.asOfDate),
          openQueryCount: data.queries.filter((query) => query.applicationId === app.id && query.status !== 'verified').length,
        };
      });
  },
  async listVisits(actor) {
    await simulateLatency();
    const data = getState();
    return data.evcVisits.filter((visit) => {
      const app = findApplicationOrThrow(data, visit.applicationId);
      return canViewApplication(actor, app, institutionRegionOf(data, app.institutionId));
    });
  },
  async schedule(actor, input) {
    await simulateLatency();
    requireCapability(actor, 'evc.schedule');
    const data = getState();
    const app = findApplicationOrThrow(data, input.applicationId);
    requireApplicationAccess(actor, app, institutionRegionOf(data, app.institutionId));
    if (app.status !== 'awaiting_evc' || app.currentStageKey !== 'evc') {
      throw invalidTransition('Only an application awaiting its EVC stage can be scheduled.');
    }
    if (data.evcVisits.some((visit) => visit.applicationId === app.id && visit.status === 'scheduled')) {
      throw invalidTransition('This application already has a scheduled EVC visit.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.visitDate) || input.visitDate < data.asOfDate) {
      throw new ServiceError('VALIDATION_FAILED', 'Choose a valid visit date on or after the current processing date.');
    }
    const venue = requireText(input.venue, 3, 160, 'Venue');
    const committeeIds = [...new Set(input.committeeMemberIds)];
    if (!committeeIds.length || committeeIds.some((id) => !data.users.some((user) => user.id === id))) {
      throw new ServiceError('VALIDATION_FAILED', 'Select at least one committee member.');
    }
    let visit: EvcVisit | undefined;
    transact((draft) => {
      const target = draft.applications.find((item) => item.id === app.id);
      if (!target || target.status !== 'awaiting_evc') throw invalidTransition('The EVC queue changed before scheduling.');
      visit = {
        id: nextId('EVC', draft.evcVisits),
        applicationId: target.id,
        visitDate: input.visitDate,
        committeeMemberIds: committeeIds,
        venue,
        status: 'scheduled',
        scheduledById: actor.id,
        scheduledOn: draft.asOfDate,
        completedOn: null,
      };
      draft.evcVisits.push(visit);
      target.status = 'evc_scheduled';
      target.lastActionOn = draft.asOfDate;
      pushAudit(draft, {
        applicationId: target.id,
        relatedRecord: visit.id,
        action: 'EVC visit scheduled',
        ...auditActor(actor),
        previousStatus: 'awaiting_evc',
        newStatus: 'evc_scheduled',
        reason: `Visit scheduled for ${input.visitDate} at ${venue}.`,
      });
    });
    if (!visit) throw new ServiceError('UNKNOWN', 'EVC scheduling did not complete.');
    return visit;
  },
  async completeVisit(actor, visitId) {
    await simulateLatency();
    requireCapability(actor, 'evc.complete');
    const data = getState();
    const visit = data.evcVisits.find((item) => item.id === visitId);
    if (!visit) throw new ServiceError('NOT_FOUND', 'EVC visit not found.', visitId);
    const app = findApplicationOrThrow(data, visit.applicationId);
    requireApplicationAccess(actor, app, institutionRegionOf(data, app.institutionId));
    if (visit.status !== 'scheduled' || app.currentStageKey !== 'evc' || app.status !== 'evc_scheduled') {
      throw invalidTransition('Only a scheduled visit for the active EVC stage can be completed.');
    }
    if (visit.visitDate > data.asOfDate) {
      throw invalidTransition('The visit cannot be marked complete before its scheduled date.');
    }
    const currentIndex = app.stages.findIndex((stage) => stage.key === 'evc');
    const nextKey = app.stages.slice(currentIndex + 1).find((stage) => stage.status === 'pending')?.key ?? null;
    if (!nextKey) throw invalidTransition('No next stage is configured after EVC.');
    const next = getStageTemplate(app.workflow, nextKey);
    if (!next) throw new ServiceError('UNKNOWN', 'Workflow template is inconsistent.');
    const previousStatus = app.status;
    transact((draft) => {
      const currentVisit = draft.evcVisits.find((item) => item.id === visitId);
      const target = draft.applications.find((item) => item.id === app.id);
      if (!currentVisit || !target || currentVisit.status !== 'scheduled' || target.currentStageKey !== 'evc') {
        throw invalidTransition('The EVC visit changed before completion.');
      }
      currentVisit.status = 'completed';
      currentVisit.completedOn = draft.asOfDate;
      target.stages = target.stages.map((stage) => stage.key === 'evc'
        ? { ...stage, status: 'completed', completedOn: draft.asOfDate }
        : stage.key === nextKey ? { ...stage, status: 'active' } : stage);
      target.currentStageKey = nextKey;
      target.status = next.activeStatus;
      target.lastActionOn = draft.asOfDate;
      pushAudit(draft, {
        applicationId: target.id,
        relatedRecord: visitId,
        action: 'EVC visit completed; next workflow stage activated',
        ...auditActor(actor),
        previousStatus,
        newStatus: target.status,
        reason: `Next prescribed stage: ${next.label}`,
      });
    });
  },
};

function undertakingWithInstitution(undertakingId: string) {
  const data = getState();
  const undertaking = data.undertakings.find((item) => item.id === undertakingId);
  if (!undertaking) throw new ServiceError('NOT_FOUND', 'Undertaking not found.', undertakingId);
  const institution = data.institutions.find((item) => item.id === undertaking.institutionId);
  if (!institution) throw new ServiceError('NOT_FOUND', 'Institution not found.', undertaking.institutionId);
  return { undertaking, institution };
}

export const mockComplianceService: ComplianceService = {
  async list(actor) {
    await simulateLatency();
    const data = getState();
    return data.undertakings
      .filter((undertaking) => {
        try {
          requireInstitutionAccess(actor, undertaking.institutionId);
          return true;
        } catch (error) {
          if (error instanceof ServiceError && error.code === 'PERMISSION_DENIED') return false;
          throw error;
        }
      })
      .map((undertaking) => {
        const institution = data.institutions.find((item) => item.id === undertaking.institutionId);
        if (!institution) throw new ServiceError('NOT_FOUND', 'Institution not found.', undertaking.institutionId);
        return { ...undertaking, institutionName: institution.name };
      });
  },
  async get(actor, undertakingId) {
    await simulateLatency();
    const { undertaking, institution } = undertakingWithInstitution(undertakingId);
    requireInstitutionAccess(actor, undertaking.institutionId);
    return { ...undertaking, institutionName: institution.name };
  },
  async submitEvidence(actor, undertakingId, fileName) {
    await simulateLatency();
    requireCapability(actor, 'compliance.submit_evidence');
    const { undertaking } = undertakingWithInstitution(undertakingId);
    requireInstitutionAccess(actor, undertaking.institutionId);
    const name = requirePdf(fileName);
    transact((draft) => {
      const record = draft.undertakings.find((item) => item.id === undertakingId);
      if (!record) throw new ServiceError('NOT_FOUND', 'Undertaking not found.', undertakingId);
      const evidence: EvidenceRecord = {
        id: nextId('EVD', record.evidence),
        undertakingId,
        fileName: name,
        submittedById: actor.id,
        submittedOn: draft.asOfDate,
        status: 'awaiting_verification',
        reviewerNote: null,
      };
      record.evidence.push(evidence);
      pushAudit(draft, {
        applicationId: null,
        relatedRecord: evidence.id,
        action: 'Undertaking evidence submitted',
        ...auditActor(actor),
        previousStatus: null,
        newStatus: evidence.status,
        reason: `${record.id}: ${name}`,
      });
    });
  },
  async reviewEvidence(actor, evidenceId, decision, note) {
    await simulateLatency();
    requireCapability(actor, 'compliance.verify');
    const data = getState();
    const undertaking = data.undertakings.find((item) => item.evidence.some((record) => record.id === evidenceId));
    if (!undertaking) throw new ServiceError('NOT_FOUND', 'Evidence record not found.', evidenceId);
    requireInstitutionAccess(actor, undertaking.institutionId);
    const evidence = undertaking.evidence.find((item) => item.id === evidenceId);
    if (!evidence || evidence.status !== 'awaiting_verification') {
      throw invalidTransition('Only evidence awaiting verification can be reviewed.');
    }
    const reviewerNote = requireText(note, 3, 500, 'Review note');
    transact((draft) => {
      const target = draft.undertakings.find((item) => item.id === undertaking.id)?.evidence.find((item) => item.id === evidenceId);
      if (!target || target.status !== 'awaiting_verification') throw invalidTransition('Evidence changed before review.');
      target.status = decision === 'verify' ? 'verified' : 'clarification_requested';
      target.reviewerNote = reviewerNote;
      pushAudit(draft, {
        applicationId: null,
        relatedRecord: evidenceId,
        action: decision === 'verify' ? 'Undertaking evidence verified' : 'Undertaking clarification requested',
        ...auditActor(actor),
        previousStatus: 'awaiting_verification',
        newStatus: target.status,
        reason: reviewerNote,
      });
    });
  },
};

function documentValidity(document: DocumentRecord, asOfDate: string, approachingDays: number): DocumentListItem['validity'] {
  const latestRenewal = document.renewals[document.renewals.length - 1];
  if (document.status === 'awaiting_verification' || latestRenewal?.status === 'awaiting_verification') {
    return 'awaiting_verification';
  }
  const remaining = daysBetween(asOfDate, document.expiryDate);
  if (remaining < 0) return 'expired';
  if (remaining <= approachingDays) return 'approaching_expiry';
  return 'valid';
}

export const mockDocumentService: DocumentService = {
  async list(actor) {
    await simulateLatency();
    const data = getState();
    return data.documents
      .filter((document) => {
        try {
          requireInstitutionAccess(actor, document.institutionId);
          return true;
        } catch (error) {
          if (error instanceof ServiceError && error.code === 'PERMISSION_DENIED') return false;
          throw error;
        }
      })
      .map((document) => {
        const institution = data.institutions.find((item) => item.id === document.institutionId);
        if (!institution) throw new ServiceError('NOT_FOUND', 'Institution not found.', document.institutionId);
        return {
          ...document,
          institutionName: institution.name,
          validity: documentValidity(document, data.asOfDate, data.policy?.documentApproachingExpiryDays ?? DEMO_POLICY.documentApproachingExpiryDays),
        };
      });
  },
  async submitRenewal(actor, documentId, fileName) {
    await simulateLatency();
    requireCapability(actor, 'renewal.submit');
    const data = getState();
    const document = data.documents.find((item) => item.id === documentId);
    if (!document) throw new ServiceError('NOT_FOUND', 'Document record not found.', documentId);
    requireInstitutionAccess(actor, document.institutionId);
    const name = requirePdf(fileName);
    transact((draft) => {
      const record = draft.documents.find((item) => item.id === documentId);
      if (!record) throw new ServiceError('NOT_FOUND', 'Document record not found.', documentId);
      record.renewals.push({
        id: nextId('REN', record.renewals),
        fileName: name,
        submittedById: actor.id,
        submittedOn: draft.asOfDate,
        status: 'awaiting_verification',
        reviewerNote: null,
      });
      pushAudit(draft, {
        applicationId: null,
        relatedRecord: documentId,
        action: 'Document renewal submitted',
        ...auditActor(actor),
        previousStatus: record.status,
        newStatus: 'awaiting_verification',
        reason: name,
      });
    });
  },
  async reviewRenewal(actor, renewalId, decision, note) {
    await simulateLatency();
    requireCapability(actor, 'document.verify');
    const data = getState();
    const document = data.documents.find((item) => item.renewals.some((renewal) => renewal.id === renewalId));
    if (!document) throw new ServiceError('NOT_FOUND', 'Renewal record not found.', renewalId);
    requireInstitutionAccess(actor, document.institutionId);
    const renewal = document.renewals.find((item) => item.id === renewalId);
    if (!renewal || renewal.status !== 'awaiting_verification') {
      throw invalidTransition('Only a renewal awaiting verification can be reviewed.');
    }
    const reviewerNote = requireText(note, 3, 500, 'Review note');
    transact((draft) => {
      const target = draft.documents.find((item) => item.id === document.id)?.renewals.find((item) => item.id === renewalId);
      if (!target || target.status !== 'awaiting_verification') throw invalidTransition('Renewal changed before review.');
      target.status = decision === 'verify' ? 'verified' : 'clarification_requested';
      target.reviewerNote = reviewerNote;
      pushAudit(draft, {
        applicationId: null,
        relatedRecord: document.id,
        action: decision === 'verify' ? 'Document renewal verified' : 'Document renewal clarification requested',
        ...auditActor(actor),
        previousStatus: 'awaiting_verification',
        newStatus: target.status,
        reason: reviewerNote,
      });
    });
  },
};

function alertFor(
  draft: ReturnType<typeof getState>,
  category: DemoAlert['category'],
  relatedRecordId: string,
  title: string,
  severity: DemoAlert['severity'],
  responsibleParty: string,
  deadline: string,
  escalated: boolean,
): DemoAlert | null {
  const current = draft.alerts.find((alert) => alert.category === category && alert.relatedRecordId === relatedRecordId);
  if (current) {
    if (escalated && current.status !== 'escalated' && current.status !== 'resolved') {
      const previousStatus = current.status;
      current.status = 'escalated';
      current.events.unshift({
        id: nextId('ALE', current.events),
        action: 'Escalated by rules evaluation',
        actorId: 'system',
        actorName: 'Rules engine',
        date: draft.asOfDate,
        note: `Escalation threshold: ${draft.policy.escalationThresholdDays} days.`,
      });
      pushAudit(draft, {
        applicationId: draft.applications.some((app) => app.id === relatedRecordId) ? relatedRecordId : null,
        relatedRecord: current.id,
        action: 'Alert escalated',
        actorId: 'system',
        actorName: 'Rules engine',
        actorRole: 'system',
        previousStatus,
        newStatus: 'escalated',
        reason: current.title,
      });
    }
    return null;
  }
  const alert: DemoAlert = {
    id: nextId('ALT', draft.alerts),
    relatedRecordId,
    category,
    severity,
    responsibleParty,
    deadline,
    status: escalated ? 'escalated' : 'open',
    title,
    events: [{
      id: nextId('ALE', []),
      action: 'Alert created by rules evaluation',
      actorId: 'system',
      actorName: 'Rules engine',
      date: draft.asOfDate,
      note: null,
    }],
  };
  draft.alerts.unshift(alert);
  pushAudit(draft, {
    applicationId: draft.applications.some((app) => app.id === relatedRecordId) ? relatedRecordId : null,
    relatedRecord: alert.id,
    action: 'Alert generated',
    actorId: 'system',
    actorName: 'Rules engine',
    actorRole: 'system',
    previousStatus: null,
    newStatus: alert.status,
    reason: alert.title,
  });
  return alert;
}

export const mockNotificationService: NotificationService = {
  async list(actor) {
    await simulateLatency();
    requireCapability(actor, 'alerts.manage');
    const data = getState();
    return data.alerts.filter((alert) => canViewAlert(actor, alert, data));
  },
  async evaluate(actor) {
    await simulateLatency();
    requireCapability(actor, 'alerts.evaluate');
    const created: DemoAlert[] = [];
    transact((draft) => {
      const policy = draft.policy ?? DEMO_POLICY;
      for (const app of draft.applications) {
        const age = daysBetween(app.submittedOn, draft.asOfDate);
        if (!['approved', 'rejected'].includes(app.status) && age > policy.overdueThresholdDays) {
          const alert = alertFor(
            draft,
            age >= policy.escalationThresholdDays ? 'escalation' : 'application_overdue',
            app.id,
            age >= policy.escalationThresholdDays ? `${app.id} exceeded the configured escalation threshold` : `${app.id} is overdue under the configured policy`,
            age >= policy.escalationThresholdDays ? 'high' : 'medium',
            app.responsibleOfficerId || 'Unassigned officer',
            app.submittedOn,
            age >= policy.escalationThresholdDays,
          );
          if (alert) created.push(alert);
        }
      }
      for (const app of draft.applications.filter((item) => item.status === 'awaiting_evc')) {
        if (visitOverdue(app, draft.asOfDate, policy.evcVisitDeadlineDays)) {
          const alert = alertFor(
            draft,
            'evc_overdue',
            app.id,
            `EVC scheduling is overdue for ${app.id} under the configured policy`,
            'medium',
            app.responsibleOfficerId || 'Unassigned officer',
            app.lastActionOn,
            false,
          );
          if (alert) created.push(alert);
        }
      }
      for (const visit of draft.evcVisits.filter((item) => item.status === 'scheduled')) {
        const app = draft.applications.find((item) => item.id === visit.applicationId);
        if (app && daysBetween(visit.visitDate, draft.asOfDate) > policy.evcVisitDeadlineDays) {
          const alert = alertFor(
            draft,
            'evc_overdue',
            app.id,
            `Scheduled EVC visit for ${app.id} is overdue under the configured policy`,
            'high',
            app.responsibleOfficerId || 'Unassigned officer',
            visit.visitDate,
            false,
          );
          if (alert) created.push(alert);
        }
      }
      for (const undertaking of draft.undertakings) {
        const verified = undertaking.evidence.some((evidence) => evidence.status === 'verified');
        if (!verified && undertaking.dueDate < draft.asOfDate) {
          const alert = alertFor(
            draft,
            'undertaking_due',
            undertaking.id,
            `Undertaking ${undertaking.id} is past its due date`,
            'high',
            undertaking.institutionId,
            undertaking.dueDate,
            false,
          );
          if (alert) created.push(alert);
        }
      }
      for (const document of draft.documents) {
        const daysRemaining = daysBetween(draft.asOfDate, document.expiryDate);
        const approaching = daysRemaining >= 0 && daysRemaining <= policy.documentApproachingExpiryDays;
        const expired = daysRemaining < 0;
        if (approaching || expired) {
          const escalation = expired && Math.abs(daysRemaining) > policy.escalationThresholdDays;
          const alert = alertFor(
            draft,
            'document_expiry',
            document.id,
            expired
              ? `Document ${document.id} has expired`
              : `Document ${document.id} is approaching expiry under the configured policy`,
            escalation ? 'high' : expired ? 'high' : 'medium',
            document.institutionId,
            document.expiryDate,
            escalation,
          );
          if (alert) created.push(alert);
          const reminderKind = escalation ? 'escalation' : 'reminder';
          if (!document.reminders.some((reminder) => reminder.kind === reminderKind)) {
            document.reminders.push({
              id: nextId('REM', document.reminders),
              documentId: document.id,
              kind: reminderKind,
              date: draft.asOfDate,
              message: escalation
                ? 'Escalation recorded after the configured expiry threshold.'
                : 'Reminder generated during rules evaluation.',
            });
          }
        }
      }
    });
    return created;
  },
  async updateStatus(actor, alertId, status, note) {
    await simulateLatency();
    requireCapability(actor, 'alerts.manage');
    const data = getState();
    const alert = data.alerts.find((item) => item.id === alertId);
    if (!alert) throw new ServiceError('NOT_FOUND', 'Alert not found.', alertId);
    if (!canViewAlert(actor, alert, data)) {
      throw new ServiceError('PERMISSION_DENIED', 'This alert is outside your permitted scope.');
    }
    if (
      alert.status === 'resolved' ||
      (status === 'acknowledged' && alert.status !== 'open') ||
      (status === 'escalated' && alert.status === 'escalated')
    ) {
      throw invalidTransition('This alert cannot move to the requested status.');
    }
    const text = requireText(note, 3, 500, 'Event note');
    transact((draft) => {
      const target = draft.alerts.find((item) => item.id === alertId);
      if (!target) throw new ServiceError('NOT_FOUND', 'Alert not found.', alertId);
      const previousStatus = target.status;
      target.status = status;
      target.events.unshift({
        id: nextId('ALE', target.events),
        action: status === 'acknowledged' ? 'Alert acknowledged' : status === 'resolved' ? 'Alert resolved' : 'Alert escalated',
        actorId: actor.id,
        actorName: actor.displayName,
        date: draft.asOfDate,
        note: text,
      });
      pushAudit(draft, {
        applicationId: draft.applications.some((app) => app.id === target.relatedRecordId) ? target.relatedRecordId : null,
        relatedRecord: target.id,
        action: `Alert ${status}`,
        ...auditActor(actor),
        previousStatus,
        newStatus: status,
        reason: text,
      });
    });
  },
};

function scopeAudit(actor: DemoUser, applicationId: string | null): boolean {
  if (actor.role === 'system_admin') return true;
  if (!applicationId) return false;
  const data = getState();
  const app = data.applications.find((item) => item.id === applicationId);
  return app ? canViewApplication(actor, app, institutionRegionOf(data, app.institutionId)) : false;
}

export function filterAuditEvents(actor: DemoUser, filters: AuditFilters = {}) {
  const data = getState();
  return data.auditEvents.filter((event) => {
    if (!scopeAudit(actor, event.applicationId)) return false;
    if (filters.applicationId && !event.applicationId?.toLowerCase().includes(filters.applicationId.toLowerCase())) return false;
    if (filters.action && !event.action.toLowerCase().includes(filters.action.toLowerCase())) return false;
    if (filters.actorId && !event.actorName.toLowerCase().includes(filters.actorId.toLowerCase())) return false;
    const day = event.timestamp.slice(0, 10);
    if (filters.fromDate && day < filters.fromDate) return false;
    if (filters.toDate && day > filters.toDate) return false;
    return true;
  });
}

function requireAdmin(actor: DemoUser): void {
  requireCapability(actor, 'admin.configure_workflow');
}

function copyStageFlags(source: AdminConfiguration['workflowStagesEnabled']): AdminConfiguration['workflowStagesEnabled'] {
  return {
    scrutiny_only: { ...source.scrutiny_only },
    scrutiny_evc: { ...source.scrutiny_evc },
    evc_sac_shc: { ...source.evc_sac_shc },
    evc_only: { ...source.evc_only },
  };
}

export const mockAdminService: AdminService = {
  async getConfiguration(actor) {
    await simulateLatency();
    requireAdmin(actor);
    const data = getState();
    return {
      policy: { ...data.policy },
      workflowEnabled: { ...data.workflowEnabled },
      workflowStagesEnabled: copyStageFlags(data.workflowStagesEnabled),
    };
  },
  async updateConfiguration(actor, configuration: AdminConfiguration) {
    await simulateLatency();
    requireAdmin(actor);
    const policyValues = Object.values(configuration.policy);
    if (policyValues.some((value) => !Number.isInteger(value) || value < 0 || value > 3650)) {
      throw new ServiceError('VALIDATION_FAILED', 'Policy values must be whole days from 0 to 3650.');
    }
    if (!WORKFLOW_KINDS.some((kind) => configuration.workflowEnabled[kind])) {
      throw new ServiceError('VALIDATION_FAILED', 'Enable at least one workflow template.');
    }
    for (const kind of WORKFLOW_KINDS) {
      const configured = configuration.workflowStagesEnabled[kind];
      const templateStages = WORKFLOW_TEMPLATES[kind].stages;
      if (!configured || Object.keys(configured).some((key) => !templateStages.some((stage) => stage.key === key))) {
        throw new ServiceError('VALIDATION_FAILED', `Stage configuration is invalid for ${kind}.`);
      }
      if (configuration.workflowEnabled[kind] && !templateStages.some((stage) => configured[stage.key] === true)) {
        throw new ServiceError('VALIDATION_FAILED', `Enable at least one stage in ${WORKFLOW_TEMPLATES[kind].label}.`);
      }
    }
    transact((draft) => {
      const previous = JSON.stringify({ policy: draft.policy, workflowEnabled: draft.workflowEnabled, workflowStagesEnabled: draft.workflowStagesEnabled });
      draft.policy = { ...configuration.policy };
      draft.workflowEnabled = { ...configuration.workflowEnabled };
      draft.workflowStagesEnabled = copyStageFlags(configuration.workflowStagesEnabled);
      pushAudit(draft, {
        applicationId: null,
        relatedRecord: null,
        action: 'Configuration updated',
        ...auditActor(actor),
        previousStatus: previous,
        newStatus: 'updated',
        reason: 'Workflow template and stage availability plus policy values changed.',
      });
    });
  },
};

function daysUntil(from: string, until: string): number {
  return daysBetween(from, until);
}

function reportRows(kind: ReportKind, actor: DemoUser): ReportRow[] {
  const data = getState();
  const applications = data.applications.filter((app) => canViewApplication(actor, app, institutionRegionOf(data, app.institutionId)));
  switch (kind) {
    case 'application_pendency':
      return applications.map((app) => ({ applicationId: app.id, status: app.status, stage: app.currentStageKey, ageDays: daysBetween(app.submittedOn, data.asOfDate) }));
    case 'stage_processing':
      return applications.map((app) => ({ applicationId: app.id, activeStage: app.currentStageKey, lastActionOn: app.lastActionOn, ageDays: daysBetween(app.lastActionOn, data.asOfDate) }));
    case 'region_performance':
      return applications.map((app) => ({ applicationId: app.id, region: institutionRegionOf(data, app.institutionId), status: app.status }));
    case 'evc':
      return data.evcVisits.filter((visit) => {
        const app = data.applications.find((item) => item.id === visit.applicationId);
        return app && canViewApplication(actor, app, institutionRegionOf(data, app.institutionId));
      }).map((visit) => ({ applicationId: visit.applicationId, visitDate: visit.visitDate, status: visit.status, venue: visit.venue }));
    case 'undertakings':
      return data.undertakings.filter((item) => {
        try { requireInstitutionAccess(actor, item.institutionId); return true; }
        catch (error) { if (error instanceof ServiceError && error.code === 'PERMISSION_DENIED') return false; throw error; }
      }).map((item) => ({ undertakingId: item.id, institutionId: item.institutionId, dueDate: item.dueDate, verifiedEvidence: item.evidence.filter((e) => e.status === 'verified').length }));
    case 'document_expiry':
      return data.documents.filter((item) => {
        try { requireInstitutionAccess(actor, item.institutionId); return true; }
        catch (error) { if (error instanceof ServiceError && error.code === 'PERMISSION_DENIED') return false; throw error; }
      }).map((item) => ({ documentId: item.id, institutionId: item.institutionId, type: item.type, expiryDate: item.expiryDate, daysRemaining: daysUntil(data.asOfDate, item.expiryDate) }));
    case 'escalations':
      return data.alerts.filter((item) => item.status === 'escalated').map((item) => ({ alertId: item.id, category: item.category, relatedRecordId: item.relatedRecordId, deadline: item.deadline, status: item.status }));
    case 'workload':
      return data.users.filter((user) => user.role === 'regulatory_reviewer').map((user) => ({ officer: user.displayName, assignedApplications: applications.filter((app) => app.responsibleOfficerId === user.id).length }));
  }
}

export const mockReportService: ReportService = {
  async list(actor, kind) {
    await simulateLatency();
    requireCapability(actor, 'reports.export');
    return reportRows(kind, actor);
  },
};

const AI_ACTION_LABELS: Record<AiAction, string> = {
  summarise_application: 'Application summary',
  explain_deficiencies: 'Recorded deficiency explanation',
  missing_information: 'Possible missing-information review',
  draft_communication: 'Administrative communication draft',
  procedural_question: 'Procedural question',
};

export const mockAiService: AiService = {
  async respond(actor, action, input, applicationId) {
    await simulateLatency();
    requireCapability(actor, 'ai.use');
    if (input.trim().length < 3) throw new ServiceError('VALIDATION_FAILED', 'Enter at least 3 characters.');
    let sources: string[] = [];
    if (applicationId) {
      const app = findApplicationOrThrow(getState(), applicationId);
      requireApplicationAccess(actor, app, institutionRegionOf(getState(), app.institutionId));
      sources = [`Application ${app.id}`, 'Recorded application history'];
    }
    return {
      text: `[AI ASSISTANCE — NOT A VERIFIED REGULATORY FINDING]\n${AI_ACTION_LABELS[action]}: This response is based only on the information supplied here. Review the underlying record and applicable authoritative materials before use.`,
      sourceReferences: sources,
      uncertainty: 'high',
      generated: true,
      requiresHumanReview: true,
    };
  },
};

export function currentDemoPolicy() {
  return { ...getState().policy };
}
