/**
 * Scenario 1 — Application processing (problem statement Section 9).
 * Institution submits; reviewer verifies documents, records observation, raises a query;
 * institution responds; reviewer verifies the response; reviewer completes scrutiny;
 * the workflow advances to the next prescribed stage.
 *
 * STATUS: written but NOT EXECUTED. Requires `npm install` and `npm test`.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { getState, resetDemoData } from '../../../mock/store';
import type { DemoUser } from '../../../domain/types';
import { mockApplicationService as svc } from '../applicationService';
import { mockDashboardService } from '../otherServices';

function userById(id: string): DemoUser {
  const u = getState().users.find((x) => x.id === id);
  if (!u) throw new Error(`test fixture missing user ${id}`);
  return u;
}

const institution = () => userById('u-inst-01');
const reviewer = () => userById('u-rev-01');
const sysAdmin = () => userById('u-sys-01');

const SUBMISSION = {
  programme: 'B.Sc. Civil Engineering',
  applicationType: 'New programme approval',
  workflow: 'scrutiny_evc' as const,
  institutionId: 'INST-0001',
};

beforeEach(() => {
  resetDemoData();
});

describe('Scenario 1: application processing', () => {
  it('runs submission → verification → clarification → response → verification → next stage', async () => {
    // 1. Institution submits.
    const app = await svc.submit(institution(), SUBMISSION);
    expect(app.status).toBe('under_scrutiny');
    expect(app.currentStageKey).toBe('scrutiny');

    // 2. Institution uploads the required checklist documents.
    const before = await svc.getDetail(institution(), app.id);
    for (const item of before.checklist.filter((c) => c.required)) {
      await svc.uploadChecklistItem(institution(), item.id, `${item.id}.pdf`);
    }

    // 3. Reviewer verifies uploaded documents and records an observation.
    const afterUpload = await svc.getDetail(reviewer(), app.id);
    for (const item of afterUpload.checklist.filter((c) => c.status === 'uploaded')) {
      await svc.verifyChecklistItem(reviewer(), item.id);
    }
    await svc.recordObservation(reviewer(), app.id, 'Faculty list reviewed against the submitted checklist (test).');

    // 4. Reviewer raises a clarification → application waits on the institution.
    await svc.raiseQuery(reviewer(), app.id, {
      kind: 'clarification',
      reason: 'Please confirm the laboratory capacity for the proposed intake (test).',
    });
    let detail = await svc.getDetail(reviewer(), app.id);
    expect(detail.application.status).toBe('awaiting_clarification');
    const query = detail.queries.find((q) => q.status === 'open');
    expect(query).toBeDefined();

    // 5. Scrutiny cannot be completed while a query is open.
    await expect(svc.completeCurrentStage(reviewer(), app.id)).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
    });

    // 6. Institution responds → back under scrutiny, response awaiting review.
    await svc.respondToQuery(institution(), query!.id, 'Laboratory capacity is 60 seats per batch (test response).');
    detail = await svc.getDetail(reviewer(), app.id);
    expect(detail.application.status).toBe('under_scrutiny');
    expect(detail.queries.find((q) => q.id === query!.id)?.status).toBe('responded');

    // 7. Reviewer verifies the response.
    await svc.reviewQueryResponse(reviewer(), query!.id, 'accept', 'Capacity response is satisfactory (test).');

    // 8. Reviewer completes scrutiny → next prescribed stage becomes active.
    await svc.completeCurrentStage(reviewer(), app.id);
    detail = await svc.getDetail(reviewer(), app.id);
    expect(detail.application.status).toBe('awaiting_evc');
    expect(detail.application.currentStageKey).toBe('evc');
    expect(detail.stages.find((s) => s.key === 'scrutiny')?.status).toBe('completed');
    expect(detail.stages.find((s) => s.key === 'evc')?.status).toBe('active');

    // 9. Audit history reflects each state change for this application.
    const actions = detail.auditEvents.map((e) => e.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'Application submitted',
        'Checklist document uploaded',
        'Checklist document verified',
        'Observation recorded',
        'Clarification requested',
        'Query response submitted',
        'Query response verified',
        'Scrutiny completed; next stage activated',
      ]),
    );
  }, 20_000);

  it('handles a deficiency return: response rejected, then accepted', async () => {
    const app = await svc.submit(institution(), SUBMISSION);
    await svc.raiseQuery(reviewer(), app.id, {
      kind: 'deficiency',
      reason: 'Required infrastructure certificate is missing from the submission (test).',
    });
    let detail = await svc.getDetail(reviewer(), app.id);
    expect(detail.application.status).toBe('returned_to_institution');
    expect(detail.stages.find((s) => s.key === 'scrutiny')?.status).toBe('returned');

    const queryId = detail.queries.find((q) => q.status === 'open')!.id;
    await svc.respondToQuery(institution(), queryId, 'Certificate uploaded as a new document (test response).');

    await svc.reviewQueryResponse(reviewer(), queryId, 'reject', 'The uploaded file does not show the certificate (test).');
    detail = await svc.getDetail(reviewer(), app.id);
    expect(detail.application.status).toBe('returned_to_institution');
    expect(detail.queries.find((q) => q.id === queryId)?.status).toBe('open');

    await svc.respondToQuery(institution(), queryId, 'Corrected certificate attached as a new document (test response).');
    await svc.reviewQueryResponse(reviewer(), queryId, 'accept', 'Corrected certificate is satisfactory (test).');
    detail = await svc.getDetail(reviewer(), app.id);
    expect(detail.queries.find((q) => q.id === queryId)?.status).toBe('verified');
  }, 20_000);
});

describe('Permission and scope checks (mock enforces the same rules a backend must)', () => {
  it('institution administrators cannot raise queries or complete scrutiny', async () => {
    const app = await svc.submit(institution(), SUBMISSION);
    await expect(
      svc.raiseQuery(institution(), app.id, { kind: 'clarification', reason: 'Attempted by institution (test).' }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    await expect(svc.completeCurrentStage(institution(), app.id)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  }, 20_000);

  it('a reviewer cannot see applications outside their region', async () => {
    // APP-2026-0003 belongs to a South-region institution; the demo reviewer is North.
    await expect(svc.getDetail(reviewer(), 'APP-2026-0003')).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  }, 20_000);

  it('an institution cannot submit for another institution', async () => {
    await expect(svc.submit(institution(), { ...SUBMISSION, institutionId: 'INST-0002' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  }, 20_000);

  it('a system administrator has view scope but no workflow authority', async () => {
    await expect(svc.completeCurrentStage(sysAdmin(), 'APP-2026-0001')).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  }, 20_000);
});

describe('Cross-module consistency', () => {
  it('a new submission appears in the dashboard summary for the same reviewer region', async () => {
    const before = await mockDashboardService.getSummary(reviewer());
    await svc.submit(institution(), SUBMISSION);
    const after = await mockDashboardService.getSummary(reviewer());
    expect(after.totalApplications).toBe(before.totalApplications + 1);
    expect(after.underScrutiny).toBe(before.underScrutiny + 1);
  }, 20_000);
});
