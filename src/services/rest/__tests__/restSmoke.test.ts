import { afterEach, describe, expect, it, vi } from 'vitest';
import { SEED } from '../../../mock/seed';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('VITE_DATA_SOURCE=rest smoke test', () => {
  it('selects the REST adapter and every method fails explicitly with NOT_IMPLEMENTED', async () => {
    vi.stubEnv('VITE_DATA_SOURCE', 'rest');
    vi.resetModules();
    const { services } = await import('../../index');
    const actor = SEED.users[0];
    if (!actor) throw new Error('Missing demonstration test actor.');

    expect(() => services.auth.findDemoUser(actor.id)).toThrowError(
      expect.objectContaining({ code: 'NOT_IMPLEMENTED' }),
    );
    await expect(services.auth.authenticate('user@example.edu.in', 'password')).rejects.toMatchObject({
      code: 'NOT_IMPLEMENTED',
    });
    expect(() => services.workflow.listTemplates()).toThrowError(
      expect.objectContaining({ code: 'NOT_IMPLEMENTED' }),
    );
    expect(() => services.workflow.getTemplate('scrutiny_only')).toThrowError(
      expect.objectContaining({ code: 'NOT_IMPLEMENTED' }),
    );

    const pending = [
      services.auth.listDemoUsers(),
      services.applications.list(actor),
      services.applications.getDetail(actor, 'APP-2026-0001'),
      services.applications.submit(actor, { programme: 'Civil Engineering', applicationType: 'New approval', workflow: 'scrutiny_evc', institutionId: 'INST-0001' }),
      services.applications.uploadChecklistItem(actor, 'checklist-id', 'demo.pdf'),
      services.applications.verifyChecklistItem(actor, 'checklist-id'),
      services.applications.recordObservation(actor, 'APP-2026-0001', 'A test observation.'),
      services.applications.raiseQuery(actor, 'APP-2026-0001', { kind: 'clarification', reason: 'A test clarification request.' }),
      services.applications.respondToQuery(actor, 'query-id', 'A test response.'),
      services.applications.reviewQueryResponse(actor, 'query-id', 'accept', 'A test review note.'),
      services.applications.completeCurrentStage(actor, 'APP-2026-0001'),
      services.workflow.listApplications(actor),
      services.dashboard.getSummary(actor),
      services.audit.listForApplication(actor, 'APP-2026-0001'),
      services.audit.listGlobal(actor),
      services.evc.listQueue(actor),
      services.evc.listVisits(actor),
      services.evc.getPolicy(actor),
      services.evc.schedule(actor, { applicationId: 'APP-2026-0003', visitDate: '2026-10-30', committeeMemberIds: [actor.id], venue: 'Test venue' }),
      services.evc.completeVisit(actor, 'visit-id'),
      services.compliance.list(actor),
      services.compliance.get(actor, 'undertaking-id'),
      services.compliance.submitEvidence(actor, 'undertaking-id', 'demo.pdf'),
      services.compliance.reviewEvidence(actor, 'evidence-id', 'verify', 'Test note.'),
      services.documents.list(actor),
      services.documents.submitRenewal(actor, 'document-id', 'demo.pdf'),
      services.documents.reviewRenewal(actor, 'renewal-id', 'verify', 'Test note.'),
      services.notifications.list(actor),
      services.notifications.evaluate(actor),
      services.notifications.updateStatus(actor, 'alert-id', 'acknowledged', 'Test note.'),
      services.reports.list(actor, 'application_pendency'),
      services.admin.getConfiguration(actor),
      services.admin.updateConfiguration(actor, { policy: SEED.policy, workflowEnabled: SEED.workflowEnabled, workflowStagesEnabled: SEED.workflowStagesEnabled }),
      services.ai.respond(actor, 'procedural_question', 'A test question.'),
    ];
    for (const result of pending) {
      await expect(result).rejects.toMatchObject({ code: 'NOT_IMPLEMENTED' });
    }
  });
});
