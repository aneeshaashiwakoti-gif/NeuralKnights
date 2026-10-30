import type { Capability } from '../domain/types';

export interface NavItem {
  key: string;
  label: string;
  path: string;
  /** Undefined = visible to any signed-in role. */
  requires?: Capability;
}

/** Primary navigation, in the order given by the problem statement (Section 5). */
export const PRIMARY_NAV: NavItem[] = [
  { key: 'overview', label: 'Overview', path: '/overview' },
  { key: 'applications', label: 'Applications', path: '/applications' },
  { key: 'workflow', label: 'Workflow Monitoring', path: '/workflow' },
  { key: 'evc', label: 'EVC Management', path: '/evc', requires: 'evc.schedule' },
  { key: 'compliance', label: 'Compliance and Undertakings', path: '/compliance' },
  { key: 'documents', label: 'Document Validity', path: '/documents' },
  { key: 'alerts', label: 'Alerts and Escalations', path: '/alerts', requires: 'alerts.manage' },
  { key: 'reports', label: 'Reports', path: '/reports', requires: 'reports.export' },
  { key: 'audit', label: 'Audit Trail', path: '/audit', requires: 'audit.view' },
  { key: 'ai', label: 'AI Assistance', path: '/ai', requires: 'ai.use' },
  { key: 'admin', label: 'Administration', path: '/admin', requires: 'admin.configure_workflow' },
];
