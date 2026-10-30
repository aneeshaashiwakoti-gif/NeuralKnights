import type { AuditEvent, DemoUser } from '../../domain/types';
import { STAGE_LABELS } from '../../domain/policy';
import { WORKFLOW_KINDS, WORKFLOW_TEMPLATES } from '../../domain/workflowTemplates';
import { getState } from '../../mock/store';
import { ServiceError } from '../errors';
import type {
  AuditService,
  AuthService,
  DashboardFilters,
  DashboardService,
  DashboardSummary,
  WorkflowService,
} from '../types';
import { daysBetween } from './applicationService';
import {
  canViewApplication,
  findApplicationOrThrow,
  institutionRegionOf,
  requireApplicationAccess,
  requireCapability,
  simulateLatency,
} from './guards';
import { filterAuditEvents, mockWorkflowModule } from './moduleServices';

export const mockWorkflowService: WorkflowService = {
  listTemplates() {
    const enabled = getState().workflowEnabled;
    return WORKFLOW_KINDS.filter((kind) => enabled[kind]).map((kind) => ({
      ...WORKFLOW_TEMPLATES[kind],
      stages: WORKFLOW_TEMPLATES[kind].stages.filter(
        (stage) => getState().workflowStagesEnabled[kind][stage.key] !== false,
      ),
    }));
  },
  getTemplate(kind) {
    const t = WORKFLOW_TEMPLATES[kind];
    if (!t || !getState().workflowEnabled[kind]) throw new ServiceError('NOT_FOUND', 'Workflow template not found.', kind);
    return {
      ...t,
      stages: t.stages.filter((stage) => getState().workflowStagesEnabled[kind][stage.key] !== false),
    };
  },
  listApplications: mockWorkflowModule.listApplications,
};

function scopeLabel(actor: DemoUser): string {
  if (actor.role === 'institution_admin') return 'Institution view';
  if (actor.role === 'regulatory_reviewer') return `Regional view (${actor.region ?? 'unassigned'})`;
  return 'System-wide view';
}

function ageBucket(days: number): string {
  if (days <= 30) return '0–30 days';
  if (days <= 60) return '31–60 days';
  if (days <= 90) return '61–90 days';
  return 'Over 90 days';
}

export const mockDashboardService: DashboardService = {
  async getSummary(actor: DemoUser, filters: DashboardFilters = {}): Promise<DashboardSummary> {
    await simulateLatency();
    const data = getState();
    const visible = data.applications
      .filter((app) => canViewApplication(actor, app, institutionRegionOf(data, app.institutionId)))
      .map((app) => {
        const region = institutionRegionOf(data, app.institutionId);
        return { app, region, ageDays: daysBetween(app.submittedOn, data.asOfDate) };
      })
      .filter(({ app, region }) => {
        if (filters.region && filters.region !== 'all' && region !== filters.region) return false;
        if (filters.status && filters.status !== 'all' && app.status !== filters.status) return false;
        return true;
      });

    const visibleIds = new Set(visible.map((v) => v.app.id));
    const queries = data.queries.filter((q) => visibleIds.has(q.applicationId));
    const open = queries.filter((q) => q.status !== 'verified');

    const stageCounts = new Map<string, number>();
    const regionCounts = new Map<string, number>();
    const ageCounts = new Map<string, number>(
      ['0–30 days', '31–60 days', '61–90 days', 'Over 90 days'].map((b) => [b, 0]),
    );
    for (const { app, region, ageDays } of visible) {
      stageCounts.set(app.currentStageKey, (stageCounts.get(app.currentStageKey) ?? 0) + 1);
      regionCounts.set(region, (regionCounts.get(region) ?? 0) + 1);
      const b = ageBucket(ageDays);
      ageCounts.set(b, (ageCounts.get(b) ?? 0) + 1);
    }

    const isClosed = (s: string) => s === 'approved' || s === 'rejected';
    return {
      asOfDate: data.asOfDate,
      totalApplications: visible.length,
      underScrutiny: visible.filter((v) => v.app.status === 'under_scrutiny').length,
      awaitingClarificationOrReturned: visible.filter(
        (v) => v.app.status === 'awaiting_clarification' || v.app.status === 'returned_to_institution',
      ).length,
      awaitingEvc: visible.filter((v) => v.app.status === 'awaiting_evc').length,
      openQueries: open.length,
      queriesAwaitingReview: queries.filter((q) => q.status === 'responded').length,
      overdueApplications: visible.filter((v) => !isClosed(v.app.status) && v.ageDays > data.policy.overdueThresholdDays)
        .length,
      overdueThresholdDays: data.policy.overdueThresholdDays,
      stagePendency: [...stageCounts.entries()].map(([key, count]) => ({
        stageKey: key,
        stageLabel: STAGE_LABELS[key] ?? key,
        count,
      })),
      regionDistribution: [...regionCounts.entries()].map(([region, count]) => ({ region, count })),
      ageingBuckets: [...ageCounts.entries()].map(([bucket, count]) => ({ bucket, count })),
      scope: scopeLabel(actor),
    };
  },
};

export const mockAuditService: AuditService = {
  async listForApplication(actor: DemoUser, applicationId: string): Promise<AuditEvent[]> {
    await simulateLatency();
    requireCapability(actor, 'audit.view');
    const data = getState();
    const app = findApplicationOrThrow(data, applicationId);
    const inst = data.institutions.find((i) => i.id === app.institutionId);
    requireApplicationAccess(actor, app, inst?.region ?? '');
    return data.auditEvents.filter((e) => e.applicationId === applicationId);
  },
  async listGlobal(actor: DemoUser, filters = {}) {
    await simulateLatency();
    requireCapability(actor, 'audit.view');
    return filterAuditEvents(actor, filters);
  },
};

export const mockAuthService: AuthService = {
  async listDemoUsers() {
    await simulateLatency();
    return getState().users;
  },
  findDemoUser(userId) {
    return getState().users.find((user) => user.id === userId);
  },
  async authenticate(email, password) {
    await simulateLatency();
    void password;
    const user = getState().users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) throw new ServiceError('UNAUTHORISED', 'Email or password is incorrect.');
    return user;
  },
};
