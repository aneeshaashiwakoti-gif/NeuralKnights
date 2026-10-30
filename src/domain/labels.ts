import type { ApplicationStatus, ChecklistStatus, StageStatus } from './types';

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  under_scrutiny: 'Under scrutiny',
  awaiting_clarification: 'Awaiting clarification',
  returned_to_institution: 'Returned to institution',
  awaiting_evc: 'Awaiting EVC',
  evc_scheduled: 'EVC scheduled',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
};

/** Status tone drives colour AND is always paired with the text label. */
export type Tone = 'neutral' | 'info' | 'warning' | 'danger' | 'success';

export const APPLICATION_STATUS_TONE: Record<ApplicationStatus, Tone> = {
  under_scrutiny: 'info',
  awaiting_clarification: 'warning',
  returned_to_institution: 'danger',
  awaiting_evc: 'info',
  evc_scheduled: 'info',
  under_review: 'info',
  approved: 'success',
  rejected: 'danger',
};

export const STAGE_STATUS_LABEL: Record<StageStatus, string> = {
  completed: 'Completed',
  active: 'Active',
  pending: 'Pending',
  returned: 'Returned',
  blocked: 'Blocked',
};

export const STAGE_STATUS_TONE: Record<StageStatus, Tone> = {
  completed: 'success',
  active: 'info',
  pending: 'neutral',
  returned: 'danger',
  blocked: 'warning',
};

export const CHECKLIST_STATUS_LABEL: Record<ChecklistStatus, string> = {
  pending: 'Not uploaded',
  uploaded: 'Uploaded, awaiting verification',
  verified: 'Verified',
};

export const CHECKLIST_STATUS_TONE: Record<ChecklistStatus, Tone> = {
  pending: 'neutral',
  uploaded: 'warning',
  verified: 'success',
};

export const QUERY_STATUS_LABEL: Record<'open' | 'responded' | 'verified', string> = {
  open: 'Open: awaiting institution response',
  responded: 'Response received: awaiting review',
  verified: 'Verified',
};

export const QUERY_STATUS_TONE: Record<'open' | 'responded' | 'verified', Tone> = {
  open: 'warning',
  responded: 'info',
  verified: 'success',
};

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
