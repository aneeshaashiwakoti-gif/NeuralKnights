import { describe, expect, it } from 'vitest';
import { getNextStageKey, WORKFLOW_KINDS, WORKFLOW_TEMPLATES } from '../workflowTemplates';
import { ROLE_CAPABILITIES, can } from '../permissions';
import type { DemoUser } from '../types';

describe('workflow templates (demonstration configuration)', () => {
  it('defines every workflow kind with at least two stages', () => {
    for (const kind of WORKFLOW_KINDS) {
      expect(WORKFLOW_TEMPLATES[kind].stages.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('returns the next stage in order and null at the end', () => {
    expect(getNextStageKey('scrutiny_evc', 'scrutiny')).toBe('evc');
    expect(getNextStageKey('scrutiny_evc', 'evc')).toBe('decision');
    expect(getNextStageKey('scrutiny_evc', 'decision')).toBeNull();
    expect(getNextStageKey('scrutiny_only', 'unknown-stage')).toBeNull();
  });
});

describe('role capabilities', () => {
  const user = (role: DemoUser['role']): DemoUser => ({
    id: 't',
    email: 'user@example.edu.in',
    displayName: 't',
    role,
    institutionName: null,
    institutionId: null,
    region: null,
    designation: 't',
  });

  it('system administrators do not hold statutory workflow capabilities', () => {
    expect(ROLE_CAPABILITIES.system_admin).not.toContain('scrutiny.complete_stage');
    expect(ROLE_CAPABILITIES.system_admin).not.toContain('scrutiny.return');
    expect(can(user('system_admin'), 'scrutiny.complete_stage')).toBe(false);
  });

  it('institution administrators cannot verify compliance evidence or raise queries', () => {
    expect(can(user('institution_admin'), 'document.verify')).toBe(false);
    expect(can(user('institution_admin'), 'scrutiny.request_clarification')).toBe(false);
  });

  it('returns false when there is no signed-in user', () => {
    expect(can(null, 'application.submit')).toBe(false);
  });
});
