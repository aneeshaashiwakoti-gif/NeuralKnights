import type { Capability, DemoUser, RoleId } from './types';

/**
 * Role → capability map. Configurable in a real system; here it is a static
 * prototype table. Frontend checks are for UX only — the backend must enforce.
 */
export const ROLE_CAPABILITIES: Record<RoleId, readonly Capability[]> = {
  institution_admin: [
    'application.submit',
    'application.view_own_institution',
    'document.upload',
    'deficiency.respond',
    'compliance.submit_evidence',
    'renewal.submit',
    'ai.use',
  ],
  regulatory_reviewer: [
    'application.view_authorised',
    'document.verify',
    'scrutiny.record_observation',
    'scrutiny.request_clarification',
    'scrutiny.complete_stage',
    'scrutiny.return',
    'scrutiny.review_response',
    'evc.schedule',
    'evc.complete',
    'compliance.verify',
    'audit.view',
    'ai.use',
    'alerts.manage',
  ],
  system_admin: [
    'application.view_all',
    'alerts.evaluate',
    'alerts.view_escalations',
    'reports.export',
    'audit.view',
    'admin.configure_workflow',
    'alerts.manage',
  ],
};

export function can(user: DemoUser | null, capability: Capability): boolean {
  if (!user) return false;
  return ROLE_CAPABILITIES[user.role].includes(capability);
}

export const ROLE_LABELS: Record<RoleId, string> = {
  institution_admin: 'Institution Administrator',
  regulatory_reviewer: 'Regulatory Reviewer',
  system_admin: 'System Administrator',
};
