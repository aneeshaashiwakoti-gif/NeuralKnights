/**
 * DEMONSTRATION POLICY VALUES. These are configurable sample thresholds used to drive the
 * prototype's ageing, overdue and escalation views. They are NOT official AICTE timelines.
 * A real system must load applicable timelines from authorised configuration.
 */
export const DEMO_POLICY = {
  /** Applications older than this (days since submission) are shown as overdue. */
  overdueThresholdDays: 30,
  /** Overdue applications older than this are escalated to the System Administrator view. */
  escalationThresholdDays: 60,
  /** Sample response window for a raised query before it is flagged. */
  queryResponseWindowDays: 15,
  /** Demonstration window after the scheduled visit date before an EVC visit is overdue. */
  evcVisitDeadlineDays: 14,
  /** Documents inside this demonstration window are shown as approaching expiry. */
  documentApproachingExpiryDays: 30,
} as const;

/** Demonstration regions used for filters. Matches the fictional seed institutions. */
export const DEMO_REGIONS = ['North', 'South'] as const;

export const STAGE_LABELS: Record<string, string> = {
  scrutiny: 'Scrutiny',
  evc: 'EVC',
  sac_shc: 'SAC/SHC',
  decision: 'Decision record',
};
