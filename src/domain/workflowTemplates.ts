import type { ApplicationStatus, ChecklistItem, WorkflowKind } from './types';

/**
 * DEMONSTRATION WORKFLOW TEMPLATES. These are configurable prototype data, not the
 * regulatory routing. The applicable APH (Approval Process Handbook) decides real
 * routing; the backend must validate and execute every real transition.
 */

export interface StageTemplate {
  key: string;
  label: string;
  /** Application status shown while this stage is the active one. */
  activeStatus: ApplicationStatus;
}

export interface WorkflowTemplate {
  kind: WorkflowKind;
  label: string;
  description: string;
  stages: StageTemplate[];
}

const SCRUTINY: StageTemplate = { key: 'scrutiny', label: 'Scrutiny', activeStatus: 'under_scrutiny' };
const EVC: StageTemplate = { key: 'evc', label: 'EVC', activeStatus: 'awaiting_evc' };
const SAC_SHC: StageTemplate = { key: 'sac_shc', label: 'SAC/SHC', activeStatus: 'under_review' };
const DECISION: StageTemplate = { key: 'decision', label: 'Decision record', activeStatus: 'under_review' };

export const WORKFLOW_TEMPLATES: Record<WorkflowKind, WorkflowTemplate> = {
  scrutiny_only: {
    kind: 'scrutiny_only',
    label: 'Only Scrutiny',
    description: 'Scrutiny followed by a recorded decision stage.',
    stages: [SCRUTINY, DECISION],
  },
  scrutiny_evc: {
    kind: 'scrutiny_evc',
    label: 'Scrutiny + EVC',
    description: 'Scrutiny, Expert Visit Committee, then decision record.',
    stages: [SCRUTINY, EVC, DECISION],
  },
  evc_sac_shc: {
    kind: 'evc_sac_shc',
    label: 'EVC + SAC/SHC',
    description: 'EVC visit, then SAC/SHC review, then decision record.',
    stages: [EVC, SAC_SHC, DECISION],
  },
  evc_only: {
    kind: 'evc_only',
    label: 'Only EVC',
    description: 'EVC visit then decision record.',
    stages: [EVC, DECISION],
  },
};

export const WORKFLOW_KINDS: WorkflowKind[] = ['scrutiny_only', 'scrutiny_evc', 'evc_sac_shc', 'evc_only'];

/** Demonstration checklist. Not the prescribed document list; do not treat as regulatory. */
export const DEMO_CHECKLIST_LABELS: { label: string; required: boolean }[] = [
  { label: 'Land or lease documents', required: true },
  { label: 'Faculty details', required: true },
  { label: 'Infrastructure certificate', required: true },
  { label: 'Fee payment receipt', required: false },
];

export function getStageTemplate(kind: WorkflowKind, stageKey: string): StageTemplate | undefined {
  return WORKFLOW_TEMPLATES[kind].stages.find((s) => s.key === stageKey);
}

/** Next stage in the template, or null when the template has no further stage. */
export function getNextStageKey(kind: WorkflowKind, currentKey: string): string | null {
  const stages = WORKFLOW_TEMPLATES[kind].stages;
  const idx = stages.findIndex((s) => s.key === currentKey);
  if (idx < 0 || idx >= stages.length - 1) return null;
  return stages[idx + 1].key;
}

/** Required checklist items must be verified by a reviewer before scrutiny can be completed. */
export function allRequiredChecklistVerified(items: ChecklistItem[]): boolean {
  return items.filter((i) => i.required).every((i) => i.status === 'verified');
}
