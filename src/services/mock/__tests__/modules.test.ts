import { beforeEach, describe, expect, it } from 'vitest';
import { getState, resetDemoData } from '../../../mock/store';
import type { DemoUser } from '../../../domain/types';
import { mockAdminService, mockAiService, mockComplianceService, mockDocumentService, mockEvcService, mockNotificationService, mockReportService } from '../moduleServices';
import { mockAuditService } from '../otherServices';

function user(id: string): DemoUser {
  const found = getState().users.find((item) => item.id === id);
  if (!found) throw new Error(`Missing test user ${id}.`);
  return found;
}

const institution = () => user('u-inst-01');
const reviewer = () => user('u-rev-01');
const southReviewer = () => user('u-rev-02');
const admin = () => user('u-sys-01');

beforeEach(() => resetDemoData());

describe('Scenario 2 and 3: EVC workflow', () => {
  it('schedules and completes a visit, activating the next template stage atomically', async () => {
    const visit = await mockEvcService.schedule(southReviewer(), {
      applicationId: 'APP-2026-0003',
      visitDate: '2026-10-30',
      committeeMemberIds: ['u-rev-01'],
      venue: 'Demonstration campus venue',
    });
    expect(getState().applications.find((app) => app.id === 'APP-2026-0003')?.status).toBe('evc_scheduled');
    await mockEvcService.completeVisit(southReviewer(), visit.id);
    const app = getState().applications.find((item) => item.id === 'APP-2026-0003');
    expect(app?.currentStageKey).toBe('sac_shc');
    expect(app?.status).toBe('under_review');
    expect(app?.stages.find((stage) => stage.key === 'evc')?.status).toBe('completed');
    expect(getState().evcVisits.find((item) => item.id === visit.id)?.status).toBe('completed');
  });

  it('rejects inaccessible applications and visits completed before their scheduled date', async () => {
    await expect(mockEvcService.schedule(institution(), {
      applicationId: 'APP-2026-0003',
      visitDate: '2026-10-30',
      committeeMemberIds: ['u-inst-01'],
      venue: 'North campus',
    })).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    const visit = await mockEvcService.schedule(southReviewer(), {
      applicationId: 'APP-2026-0003',
      visitDate: '2026-11-01',
      committeeMemberIds: ['u-rev-01'],
      venue: 'Demonstration campus venue',
    });
    await expect(mockEvcService.completeVisit(southReviewer(), visit.id)).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  it('validates committee membership and venue before writing', async () => {
    await expect(mockEvcService.schedule(southReviewer(), {
      applicationId: 'APP-2026-0003',
      visitDate: '2026-10-30',
      committeeMemberIds: [],
      venue: 'x',
    })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(getState().evcVisits).toHaveLength(0);
  });
});

describe('Scenario 4: undertaking compliance', () => {
  it('records evidence by file name and allows a scoped reviewer to verify it', async () => {
    await expect(mockComplianceService.submitEvidence(institution(), 'UND-0001', 'evidence.txt'))
      .rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    await mockComplianceService.submitEvidence(institution(), 'UND-0001', 'fire-safety-demo.pdf');
    const undertaking = getState().undertakings.find((item) => item.id === 'UND-0001');
    const evidence = undertaking?.evidence[0];
    expect(evidence?.status).toBe('awaiting_verification');
    await mockComplianceService.reviewEvidence(reviewer(), evidence!.id, 'verify', 'Evidence reviewed for the demonstration.');
    expect(getState().undertakings.find((item) => item.id === 'UND-0001')?.evidence[0]?.status).toBe('verified');
    await expect(mockComplianceService.submitEvidence(institution(), 'UND-0002', 'other-demo.pdf'))
      .rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});

describe('Scenario 5: document expiry and renewal', () => {
  it('computes distinct validity and supports renewal review', async () => {
    const initial = await mockDocumentService.list(institution());
    expect(initial.find((item) => item.id === 'DOC-0001')?.validity).toBe('valid');
    expect(initial.find((item) => item.id === 'DOC-0002')?.validity).toBe('approaching_expiry');
    expect(initial.find((item) => item.id === 'DOC-0003')).toBeUndefined();
    await expect(mockDocumentService.submitRenewal(institution(), 'DOC-0002', 'renewal.txt'))
      .rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    await mockDocumentService.submitRenewal(institution(), 'DOC-0002', 'renewal-demo.pdf');
    const renewal = getState().documents.find((item) => item.id === 'DOC-0002')?.renewals[0];
    expect(renewal?.status).toBe('awaiting_verification');
    await mockDocumentService.reviewRenewal(reviewer(), renewal!.id, 'verify', 'Renewal file name verified in this demo.');
    expect(getState().documents.find((item) => item.id === 'DOC-0002')?.renewals[0]?.status).toBe('verified');
  });
});

describe('Scenarios 6 and 7: explicit alerts, escalation and global audit', () => {
  it('evaluates rules only on request, escalates sample-overdue cases and records transitions', async () => {
    await expect(mockNotificationService.evaluate(reviewer())).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    const created = await mockNotificationService.evaluate(admin());
    expect(created.some((alert) => alert.status === 'escalated')).toBe(true);
    expect(await mockNotificationService.evaluate(admin())).toHaveLength(0);
    const openAlert = getState().alerts.find((alert) => alert.status === 'open');
    expect(openAlert).toBeDefined();
    await mockNotificationService.updateStatus(admin(), openAlert!.id, 'acknowledged', 'Reviewed the demonstration alert.');
    await mockNotificationService.updateStatus(admin(), openAlert!.id, 'resolved', 'The demonstration case was addressed.');
    expect(getState().alerts.find((alert) => alert.id === openAlert!.id)?.status).toBe('resolved');
    await expect(mockNotificationService.updateStatus(admin(), openAlert!.id, 'escalated', 'Attempt to reopen resolved alert.'))
      .rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  it('scopes alerts by their related application or institution and rejects duplicate transitions', async () => {
    await mockNotificationService.evaluate(admin());
    const southAlerts = await mockNotificationService.list(southReviewer());
    expect(southAlerts.some((alert) => alert.relatedRecordId === 'APP-2026-0003')).toBe(true);
    expect(southAlerts.every((alert) => !['APP-2026-0001', 'APP-2026-0002', 'UND-0001', 'DOC-0001'].includes(alert.relatedRecordId))).toBe(true);
    const southAlert = southAlerts.find((alert) => alert.relatedRecordId === 'APP-2026-0003');
    expect(southAlert).toBeDefined();
    await expect(mockNotificationService.updateStatus(reviewer(), southAlert!.id, 'acknowledged', 'Attempt outside region.'))
      .rejects.toMatchObject({ code: 'PERMISSION_DENIED' });

    const openAlert = getState().alerts.find((alert) => alert.status === 'open');
    expect(openAlert).toBeDefined();
    await mockNotificationService.updateStatus(admin(), openAlert!.id, 'acknowledged', 'Reviewed the demonstration alert.');
    await expect(mockNotificationService.updateStatus(admin(), openAlert!.id, 'acknowledged', 'Repeated acknowledgement.'))
      .rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  it('exposes a role-scoped global audit view with functioning filters', async () => {
    const reviewerEvents = await mockAuditService.listGlobal(reviewer());
    expect(reviewerEvents.length).toBeGreaterThan(0);
    expect(reviewerEvents.every((event) => event.applicationId !== 'APP-2026-0003' && event.applicationId !== 'APP-2026-0004')).toBe(true);
    const appEvents = await mockAuditService.listGlobal(admin(), { applicationId: 'APP-2026-0002' });
    expect(appEvents.length).toBeGreaterThan(0);
    expect(appEvents.every((event) => event.applicationId === 'APP-2026-0002')).toBe(true);
    await expect(mockAuditService.listGlobal(institution())).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});

describe('Reporting, administration and AI service contracts', () => {
  it('requires report capability and returns demonstration report rows', async () => {
    await expect(mockReportService.list(reviewer(), 'application_pendency')).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    const rows = await mockReportService.list(admin(), 'document_expiry');
    expect(rows.some((row) => row.documentId === 'DOC-0003')).toBe(true);
  });

  it('validates demonstration configuration and audits successful changes', async () => {
    const config = await mockAdminService.getConfiguration(admin());
    await expect(mockAdminService.updateConfiguration(admin(), {
      ...config,
      policy: { ...config.policy, escalationThresholdDays: -1 },
    })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    const updated = { ...config, policy: { ...config.policy, escalationThresholdDays: 70 } };
    await mockAdminService.updateConfiguration(admin(), updated);
    expect((await mockAdminService.getConfiguration(admin())).policy.escalationThresholdDays).toBe(70);
    expect(getState().auditEvents.some((event) => event.action === 'Configuration updated')).toBe(true);
  });

  it('returns labelled canned AI output for permitted users and enforces application scope', async () => {
    const response = await mockAiService.respond(institution(), 'summarise_application', 'Summarise the current record.', 'APP-2026-0001');
    expect(response.text).toContain('AI ASSISTANCE');
    expect(response.requiresHumanReview).toBe(true);
    await expect(mockAiService.respond(institution(), 'summarise_application', 'Summarise another region.', 'APP-2026-0003'))
      .rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    await expect(mockAiService.respond(admin(), 'procedural_question', 'What is the recorded procedure?'))
      .rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});
