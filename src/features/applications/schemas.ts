import { z } from 'zod';

/** Client-side validation mirrors (and never replaces) the service-layer checks. */

export const APPLICATION_TYPE_OPTIONS = ['New programme approval', 'Increase in approved intake'] as const;

export const submitApplicationSchema = z.object({
  programme: z
    .string()
    .trim()
    .min(3, 'Enter at least 3 characters.')
    .max(120, 'Use 120 characters or fewer.'),
  applicationType: z
    .string()
    .min(1, 'Select an application type.')
    .refine((v) => (APPLICATION_TYPE_OPTIONS as readonly string[]).includes(v), 'Select a listed type.'),
  workflow: z.enum(['scrutiny_only', 'scrutiny_evc', 'evc_sac_shc', 'evc_only'], {
    errorMap: () => ({ message: 'Select a workflow.' }),
  }),
  declaration: z.boolean().refine((v) => v === true, {
    message: 'Confirm that the information provided is accurate.',
  }),
});
export type SubmitApplicationValues = z.infer<typeof submitApplicationSchema>;

export const uploadChecklistSchema = z.object({
  checklistItemId: z.string().min(1, 'Select a checklist item.'),
  fileName: z
    .string()
    .trim()
    .min(1, 'Enter the file name.')
    .max(120, 'Use 120 characters or fewer.')
    .regex(/\.pdf$/i, 'Enter a PDF file name.'),
});
export type UploadChecklistValues = z.infer<typeof uploadChecklistSchema>;

export const respondQuerySchema = z.object({
  response: z
    .string()
    .trim()
    .min(10, 'Enter at least 10 characters.')
    .max(2000, 'Use 2000 characters or fewer.'),
});
export type RespondQueryValues = z.infer<typeof respondQuerySchema>;

export const observationSchema = z.object({
  text: z.string().trim().min(5, 'Enter at least 5 characters.').max(2000, 'Use 2000 characters or fewer.'),
});
export type ObservationValues = z.infer<typeof observationSchema>;

export const raiseQuerySchema = z.object({
  kind: z.enum(['clarification', 'deficiency'], { errorMap: () => ({ message: 'Select the type of query.' }) }),
  reason: z.string().trim().min(10, 'Enter at least 10 characters.').max(1000, 'Use 1000 characters or fewer.'),
});
export type RaiseQueryValues = z.infer<typeof raiseQuerySchema>;

export const reviewResponseSchema = z.object({
  note: z.string().trim().min(5, 'Enter at least 5 characters.').max(1000, 'Use 1000 characters or fewer.'),
});
export type ReviewResponseValues = z.infer<typeof reviewResponseSchema>;
