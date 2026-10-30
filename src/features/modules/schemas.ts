import { z } from 'zod';

export const evcScheduleSchema = z.object({
  applicationId: z.string().min(1, 'Select an application.'),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a visit date.'),
  committeeMemberIds: z.array(z.string()).min(1, 'Select at least one committee member.'),
  venue: z.string().trim().min(3, 'Enter a venue of at least 3 characters.').max(160, 'Venue must be 160 characters or fewer.'),
});

export const fileNameSchema = z.string().trim().min(1, 'Enter a file name.').max(120, 'File name must be 120 characters or fewer.').regex(/\.pdf$/i, 'Use a .pdf file name.');

export const policySchema = z.object({
  overdueThresholdDays: z.number().int().min(0).max(3650),
  escalationThresholdDays: z.number().int().min(0).max(3650),
  queryResponseWindowDays: z.number().int().min(0).max(3650),
  evcVisitDeadlineDays: z.number().int().min(0).max(3650),
  documentApproachingExpiryDays: z.number().int().min(0).max(3650),
});
