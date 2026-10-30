import type {
  Application,
  ApplicationStatus,
  ChecklistItem,
  DemoDataset,
  DemoUser,
  Observation,
  ScrutinyQuery,
  WorkflowStage,
} from '../../domain/types';
import {
  DEMO_CHECKLIST_LABELS,
  WORKFLOW_KINDS,
  WORKFLOW_TEMPLATES,
  allRequiredChecklistVerified,
  getStageTemplate,
} from '../../domain/workflowTemplates';
import { getState, nextId, pushAudit, transact } from '../../mock/store';
import { ServiceError } from '../errors';
import type {
  ApplicationDetail,
  ApplicationFilters,
  ApplicationListItem,
  ApplicationService,
  RaiseQueryInput,
  SubmitApplicationInput,
} from '../types';
import {
  canViewApplication,
  findApplicationOrThrow,
  findQueryOrThrow,
  institutionRegionOf,
  invalidTransition,
  requireApplicationAccess,
  requireCapability,
  simulateLatency,
} from './guards';

/** Whole days between two ISO calendar dates (YYYY-MM-DD). */
export function daysBetween(fromIso: string, toIso: string): number {
  const DAY_MS = 86_400_000;
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS);
}

function requireText(value: string, min: number, max: number, field: string): string {
  const v = value.trim();
  if (v.length < min) {
    throw new ServiceError('VALIDATION_FAILED', `${field} must be at least ${min} characters.`);
  }
  if (v.length > max) {
    throw new ServiceError('VALIDATION_FAILED', `${field} must be ${max} characters or fewer.`);
  }
  return v;
}

function institutionOf(data: DemoDataset, institutionId: string) {
  const inst = data.institutions.find((i) => i.id === institutionId);
  if (!inst) throw new ServiceError('NOT_FOUND', 'Institution not found.', institutionId);
  return inst;
}

function setStage(app: Application, key: string, status: WorkflowStage['status'], completedOn?: string): void {
  app.stages = app.stages.map((s) =>
    s.key === key ? { ...s, status, completedOn: completedOn ?? s.completedOn } : s,
  );
}

function touch(draft: DemoDataset, applicationId: string): Application {
  const app = draft.applications.find((a) => a.id === applicationId);
  if (!app) throw new ServiceError('NOT_FOUND', 'Application not found.', applicationId);
  app.lastActionOn = draft.asOfDate;
  return app;
}

function toListItem(data: DemoDataset, app: Application): ApplicationListItem {
  const inst = institutionOf(data, app.institutionId);
  return {
    ...app,
    institutionName: inst.name,
    region: inst.region,
    ageDays: daysBetween(app.submittedOn, data.asOfDate),
    openQueryCount: data.queries.filter((q) => q.applicationId === app.id && q.status !== 'verified').length,
  };
}

function nextApplicationId(data: DemoDataset): string {
  const year = data.asOfDate.slice(0, 4);
  let n = data.applications.length + 1;
  let id = `APP-${year}-${String(n).padStart(4, '0')}`;
  while (data.applications.some((a) => a.id === id)) {
    n += 1;
    id = `APP-${year}-${String(n).padStart(4, '0')}`;
  }
  return id;
}

/**
 * Mock implementation of ApplicationService. Enforces the same capability and scope checks
 * a backend must enforce. Every mutation is a single atomic `transact`, including its audit event.
 */
export const mockApplicationService: ApplicationService = {
  async list(actor: DemoUser, filters: ApplicationFilters = {}): Promise<ApplicationListItem[]> {
    await simulateLatency();
    const data = getState();
    const q = (filters.search ?? '').trim().toLowerCase();
    return data.applications
      .filter((app) => canViewApplication(actor, app, institutionRegionOf(data, app.institutionId)))
      .map((app) => toListItem(data, app))
      .filter((item) => {
        if (!q) return true;
        return (
          item.id.toLowerCase().includes(q) ||
          item.programme.toLowerCase().includes(q) ||
          item.institutionName.toLowerCase().includes(q)
        );
      })
      .filter((item) => !filters.status || filters.status === 'all' || item.status === filters.status)
      .filter((item) => !filters.region || filters.region === 'all' || item.region === filters.region)
      .filter(
        (item) =>
          !filters.institutionId || filters.institutionId === 'all' || item.institutionId === filters.institutionId,
      )
      .sort((a, b) => b.submittedOn.localeCompare(a.submittedOn));
  },

  async getDetail(actor: DemoUser, applicationId: string): Promise<ApplicationDetail> {
    await simulateLatency();
    const data = getState();
    const app = findApplicationOrThrow(data, applicationId);
    const institution = institutionOf(data, app.institutionId);
    requireApplicationAccess(actor, app, institution.region);
    return {
      application: app,
      institution,
      responsibleOfficer: data.users.find((u) => u.id === app.responsibleOfficerId) ?? null,
      people: data.users,
      stages: app.stages,
      checklist: data.checklistItems.filter((c) => c.applicationId === app.id),
      queries: data.queries
        .filter((q) => q.applicationId === app.id)
        .sort((a, b) => b.raisedOn.localeCompare(a.raisedOn)),
      observations: data.observations
        .filter((o) => o.applicationId === app.id)
        .sort((a, b) => b.recordedOn.localeCompare(a.recordedOn)),
      auditEvents: data.auditEvents.filter((e) => e.applicationId === app.id),
      workflowTemplate: {
        ...WORKFLOW_TEMPLATES[app.workflow],
        stages: WORKFLOW_TEMPLATES[app.workflow].stages.filter((stage) => app.stages.some((record) => record.key === stage.key)),
      },
    };
  },

  async submit(actor: DemoUser, input: SubmitApplicationInput): Promise<Application> {
    await simulateLatency();
    requireCapability(actor, 'application.submit');
    if (actor.institutionId !== input.institutionId) {
      throw new ServiceError('PERMISSION_DENIED', 'You may only submit applications for your own institution.');
    }
    const programme = requireText(input.programme, 3, 120, 'Programme name');
    const applicationType = requireText(input.applicationType, 3, 80, 'Application type');
    if (!WORKFLOW_KINDS.includes(input.workflow)) {
      throw new ServiceError('VALIDATION_FAILED', 'Select a workflow representation.');
    }
    const snapshot = getState();
    if (!snapshot.workflowEnabled[input.workflow]) {
      throw new ServiceError('VALIDATION_FAILED', 'This workflow is currently unavailable.');
    }
    const inst = institutionOf(snapshot, input.institutionId);

    const template = WORKFLOW_TEMPLATES[input.workflow];
    const templateStages = template.stages.filter((stage) => snapshot.workflowStagesEnabled[input.workflow][stage.key] !== false);
    if (!templateStages.length) throw new ServiceError('VALIDATION_FAILED', 'Enable at least one stage in this workflow.');
    const firstStage = templateStages[0];
    let created: Application | undefined;

    transact((draft) => {
      const id = nextApplicationId(draft);
      const responsible = draft.users.find((u) => u.role === 'regulatory_reviewer' && u.region === inst.region);
      const app: Application = {
        id,
        institutionId: inst.id,
        programme,
        applicationType,
        workflow: input.workflow,
        status: firstStage.activeStatus,
        currentStageKey: firstStage.key,
        stages: templateStages.map(
          (s, i): WorkflowStage => ({ key: s.key, label: s.label, status: i === 0 ? 'active' : 'pending' }),
        ),
        responsibleOfficerId: responsible?.id ?? '',
        submittedOn: draft.asOfDate,
        lastActionOn: draft.asOfDate,
      };
      draft.applications.push(app);
      DEMO_CHECKLIST_LABELS.forEach((c, i) => {
        draft.checklistItems.push({
          id: `${id}-chk-${i + 1}`,
          applicationId: id,
          label: c.label,
          required: c.required,
          status: 'pending',
          fileName: null,
          uploadedOn: null,
        });
      });
      pushAudit(draft, {
        applicationId: id,
        relatedRecord: null,
        action: 'Application submitted',
        actorId: actor.id,
        actorName: actor.displayName,
        actorRole: actor.role,
        previousStatus: null,
        newStatus: app.status,
        reason: `Workflow: ${template.label}`,
      });
      created = app;
    });

    if (!created) throw new ServiceError('UNKNOWN', 'Submission did not complete.');
    return created;
  },

  async uploadChecklistItem(actor: DemoUser, checklistItemId: string, fileName: string): Promise<void> {
    await simulateLatency();
    requireCapability(actor, 'document.upload');
    const data = getState();
    const item = data.checklistItems.find((c) => c.id === checklistItemId);
    if (!item) throw new ServiceError('NOT_FOUND', 'Checklist item not found.', checklistItemId);
    const app = findApplicationOrThrow(data, item.applicationId);
    requireApplicationAccess(actor, app, institutionRegionOf(data, app.institutionId));
    if (item.status === 'verified') {
      throw invalidTransition('This document has already been verified and cannot be replaced.');
    }
    const name = requireText(fileName, 1, 120, 'File name');
    if (!/\.pdf$/i.test(name)) {
      throw new ServiceError(
        'VALIDATION_FAILED',
        'Only PDF file names are accepted. Enter the file name; file contents are not stored.',
      );
    }
    transact((draft) => {
      const it = draft.checklistItems.find((c) => c.id === checklistItemId) as ChecklistItem;
      const previous = it.status;
      it.status = 'uploaded';
      it.fileName = name;
      it.uploadedOn = draft.asOfDate;
      touch(draft, it.applicationId);
      pushAudit(draft, {
        applicationId: it.applicationId,
        relatedRecord: it.id,
        action: 'Checklist document uploaded',
        actorId: actor.id,
        actorName: actor.displayName,
        actorRole: actor.role,
        previousStatus: previous,
        newStatus: 'uploaded',
        reason: it.label,
      });
    });
  },

  async verifyChecklistItem(actor: DemoUser, checklistItemId: string): Promise<void> {
    await simulateLatency();
    requireCapability(actor, 'document.verify');
    const data = getState();
    const item = data.checklistItems.find((c) => c.id === checklistItemId);
    if (!item) throw new ServiceError('NOT_FOUND', 'Checklist item not found.', checklistItemId);
    const app = findApplicationOrThrow(data, item.applicationId);
    requireApplicationAccess(actor, app, institutionRegionOf(data, app.institutionId));
    if (item.status !== 'uploaded') {
      throw invalidTransition('Only uploaded documents can be verified.');
    }
    transact((draft) => {
      const it = draft.checklistItems.find((c) => c.id === checklistItemId) as ChecklistItem;
      it.status = 'verified';
      touch(draft, it.applicationId);
      pushAudit(draft, {
        applicationId: it.applicationId,
        relatedRecord: it.id,
        action: 'Checklist document verified',
        actorId: actor.id,
        actorName: actor.displayName,
        actorRole: actor.role,
        previousStatus: 'uploaded',
        newStatus: 'verified',
        reason: it.label,
      });
    });
  },

  async recordObservation(actor: DemoUser, applicationId: string, text: string): Promise<void> {
    await simulateLatency();
    requireCapability(actor, 'scrutiny.record_observation');
    const data = getState();
    const app = findApplicationOrThrow(data, applicationId);
    requireApplicationAccess(actor, app, institutionRegionOf(data, app.institutionId));
    const body = requireText(text, 5, 2000, 'Observation');
    transact((draft) => {
      const obs: Observation = {
        id: nextId('OBS', draft.observations),
        applicationId,
        authorId: actor.id,
        recordedOn: draft.asOfDate,
        text: body,
      };
      draft.observations.push(obs);
      touch(draft, applicationId);
      pushAudit(draft, {
        applicationId,
        relatedRecord: obs.id,
        action: 'Observation recorded',
        actorId: actor.id,
        actorName: actor.displayName,
        actorRole: actor.role,
        previousStatus: null,
        newStatus: null,
        reason: null,
      });
    });
  },

  async raiseQuery(actor: DemoUser, applicationId: string, input: RaiseQueryInput): Promise<void> {
    await simulateLatency();
    requireCapability(actor, input.kind === 'clarification' ? 'scrutiny.request_clarification' : 'scrutiny.return');
    const data = getState();
    const app = findApplicationOrThrow(data, applicationId);
    requireApplicationAccess(actor, app, institutionRegionOf(data, app.institutionId));
    if (app.status !== 'under_scrutiny') {
      throw invalidTransition('Queries can only be raised while the application is under scrutiny.');
    }
    const reason = requireText(input.reason, 10, 1000, 'Reason');
    const newStatus: ApplicationStatus =
      input.kind === 'clarification' ? 'awaiting_clarification' : 'returned_to_institution';
    const stageStatus = input.kind === 'clarification' ? 'blocked' : 'returned';
    const previousStatus = app.status;

    transact((draft) => {
      const query: ScrutinyQuery = {
        id: nextId('QRY', draft.queries),
        applicationId,
        kind: input.kind,
        status: 'open',
        reason,
        raisedById: actor.id,
        raisedOn: draft.asOfDate,
        response: null,
        respondedById: null,
        respondedOn: null,
        reviewNote: null,
        reviewedById: null,
        reviewedOn: null,
      };
      draft.queries.push(query);
      const d = touch(draft, applicationId);
      d.status = newStatus;
      setStage(d, d.currentStageKey, stageStatus);
      pushAudit(draft, {
        applicationId,
        relatedRecord: query.id,
        action: input.kind === 'clarification' ? 'Clarification requested' : 'Application returned with deficiency',
        actorId: actor.id,
        actorName: actor.displayName,
        actorRole: actor.role,
        previousStatus,
        newStatus,
        reason,
      });
    });
  },

  async respondToQuery(actor: DemoUser, queryId: string, response: string): Promise<void> {
    await simulateLatency();
    requireCapability(actor, 'deficiency.respond');
    const data = getState();
    const query = findQueryOrThrow(data, queryId);
    const app = findApplicationOrThrow(data, query.applicationId);
    requireApplicationAccess(actor, app, institutionRegionOf(data, app.institutionId));
    if (query.status !== 'open') {
      throw invalidTransition('This query is not awaiting a response.');
    }
    if (app.status !== 'awaiting_clarification' && app.status !== 'returned_to_institution') {
      throw invalidTransition('The application is not awaiting a response from the institution.');
    }
    const body = requireText(response, 10, 2000, 'Response');
    const previousStatus = app.status;

    transact((draft) => {
      const q = draft.queries.find((x) => x.id === queryId) as ScrutinyQuery;
      q.status = 'responded';
      q.response = body;
      q.respondedById = actor.id;
      q.respondedOn = draft.asOfDate;
      const d = touch(draft, q.applicationId);
      d.status = 'under_scrutiny';
      setStage(d, d.currentStageKey, 'active');
      pushAudit(draft, {
        applicationId: q.applicationId,
        relatedRecord: q.id,
        action: 'Query response submitted',
        actorId: actor.id,
        actorName: actor.displayName,
        actorRole: actor.role,
        previousStatus,
        newStatus: 'under_scrutiny',
        reason: 'Institution response recorded; awaiting reviewer verification.',
      });
    });
  },

  async reviewQueryResponse(
    actor: DemoUser,
    queryId: string,
    decision: 'accept' | 'reject',
    note: string,
  ): Promise<void> {
    await simulateLatency();
    requireCapability(actor, 'scrutiny.review_response');
    const data = getState();
    const query = findQueryOrThrow(data, queryId);
    const app = findApplicationOrThrow(data, query.applicationId);
    requireApplicationAccess(actor, app, institutionRegionOf(data, app.institutionId));
    if (query.status !== 'responded') {
      throw invalidTransition('Only responses awaiting review can be reviewed.');
    }
    const reviewNote = requireText(note, 5, 1000, 'Review note');

    transact((draft) => {
      const q = draft.queries.find((x) => x.id === queryId) as ScrutinyQuery;
      const d = touch(draft, q.applicationId);
      q.reviewNote = reviewNote;
      q.reviewedById = actor.id;
      q.reviewedOn = draft.asOfDate;
      if (decision === 'accept') {
        q.status = 'verified';
        pushAudit(draft, {
          applicationId: q.applicationId,
          relatedRecord: q.id,
          action: 'Query response verified',
          actorId: actor.id,
          actorName: actor.displayName,
          actorRole: actor.role,
          previousStatus: 'responded',
          newStatus: 'verified',
          reason: reviewNote,
        });
      } else {
        const reopenedStatus: ApplicationStatus =
          q.kind === 'clarification' ? 'awaiting_clarification' : 'returned_to_institution';
        const previousStatus = d.status;
        q.status = 'open';
        d.status = reopenedStatus;
        setStage(d, d.currentStageKey, q.kind === 'clarification' ? 'blocked' : 'returned');
        pushAudit(draft, {
          applicationId: q.applicationId,
          relatedRecord: q.id,
          action: 'Query response rejected; query reopened',
          actorId: actor.id,
          actorName: actor.displayName,
          actorRole: actor.role,
          previousStatus,
          newStatus: reopenedStatus,
          reason: reviewNote,
        });
      }
    });
  },

  async completeCurrentStage(actor: DemoUser, applicationId: string): Promise<void> {
    await simulateLatency();
    requireCapability(actor, 'scrutiny.complete_stage');
    const data = getState();
    const app = findApplicationOrThrow(data, applicationId);
    requireApplicationAccess(actor, app, institutionRegionOf(data, app.institutionId));

    if (app.currentStageKey !== 'scrutiny') {
      throw invalidTransition(
        'Only the scrutiny stage can be completed here. Continue later stages from their respective workspaces.',
      );
    }
    if (app.status !== 'under_scrutiny') {
      throw invalidTransition('The application must be under scrutiny before this stage can be completed.');
    }
    const unresolved = data.queries.filter((q) => q.applicationId === app.id && q.status !== 'verified').length;
    if (unresolved > 0) {
      throw invalidTransition(
        `${unresolved} ${unresolved === 1 ? 'query is' : 'queries are'} unresolved. Responses must be verified first.`,
      );
    }
    const checklist = data.checklistItems.filter((c) => c.applicationId === app.id);
    if (!allRequiredChecklistVerified(checklist)) {
      throw invalidTransition('All required checklist documents must be verified before scrutiny can be completed.');
    }
    const currentIndex = app.stages.findIndex((stage) => stage.key === app.currentStageKey);
    const nextKey = app.stages.slice(currentIndex + 1).find((stage) => stage.status === 'pending')?.key ?? null;
    if (!nextKey) {
      throw invalidTransition('No further stage is defined for this workflow template.');
    }
    const next = getStageTemplate(app.workflow, nextKey);
    if (!next) throw new ServiceError('UNKNOWN', 'Workflow template is inconsistent.');
    const previousStatus = app.status;

    transact((draft) => {
      const d = touch(draft, applicationId);
      setStage(d, 'scrutiny', 'completed', draft.asOfDate);
      setStage(d, nextKey, 'active');
      d.currentStageKey = nextKey;
      d.status = next.activeStatus;
      pushAudit(draft, {
        applicationId,
        relatedRecord: null,
        action: 'Scrutiny completed; next stage activated',
        actorId: actor.id,
        actorName: actor.displayName,
        actorRole: actor.role,
        previousStatus,
        newStatus: next.activeStatus,
        reason: `Next prescribed stage: ${next.label}`,
      });
    });
  },
};
