import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { Button, ErrorState, FormField, inputClass, PageHeader, PermissionDenied } from '../../components/ui';
import { WORKFLOW_KINDS, WORKFLOW_TEMPLATES, DEMO_CHECKLIST_LABELS } from '../../domain/workflowTemplates';
import { describeError } from '../../services/errors';
import { useAuth } from '../auth/AuthContext';
import { useSubmitApplication } from './hooks';
import { APPLICATION_TYPE_OPTIONS, submitApplicationSchema, type SubmitApplicationValues } from './schemas';

export function NewApplicationPage() {
  const { user, has } = useAuth();
  const navigate = useNavigate();
  const submit = useSubmitApplication();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<SubmitApplicationValues>({
    resolver: zodResolver(submitApplicationSchema),
    defaultValues: {
      programme: '',
      applicationType: '',
      workflow: 'scrutiny_evc',
      declaration: false,
    },
  });
  const { register, handleSubmit, formState } = form;
  const { errors } = formState;

  if (!has('application.submit') || !user?.institutionId) {
    return (
      <>
        <Breadcrumbs items={[{ label: 'Overview', to: '/overview' }, { label: 'Applications', to: '/applications' }, { label: 'New application' }]} />
        <PermissionDenied message="Only authorised institution administrators may submit applications." />
      </>
    );
  }

  const onValid = (values: SubmitApplicationValues) => {
    setServerError(null);
    submit.mutate(
      {
        programme: values.programme,
        applicationType: values.applicationType,
        workflow: values.workflow,
        institutionId: user.institutionId as string,
      },
      {
        onSuccess: (app) => navigate(`/applications/${app.id}`),
        onError: (err) => setServerError(describeError(err)),
      },
    );
  };

  return (
    <>
      <Breadcrumbs items={[{ label: 'Overview', to: '/overview' }, { label: 'Applications', to: '/applications' }, { label: 'New application' }]} />
      <PageHeader
        title="Submit a new application"
        description="Enter the programme details below. The application will enter the first stage of the selected workflow."
      />

      {serverError && (
        <div className="mb-4">
          <ErrorState message={serverError} />
        </div>
      )}

      <form onSubmit={handleSubmit(onValid)} noValidate className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded border border-neutral-300 bg-white p-4 lg:col-span-2">
          <FormField id="institution" label="Institution">
            <input id="institution" className={`${inputClass} bg-neutral-100`} value={user.institutionName ?? ''} readOnly />
          </FormField>

          <FormField
            id="programme"
            label="Programme name"
            error={errors.programme?.message}
            hint="Enter the programme title as it should appear on the application record."
          >
            <input
              id="programme"
              className={inputClass}
              aria-invalid={Boolean(errors.programme)}
              aria-describedby={errors.programme ? 'programme-error' : 'programme-hint'}
              {...register('programme')}
            />
          </FormField>

          <FormField id="applicationType" label="Application type" error={errors.applicationType?.message}>
            <select id="applicationType" className={inputClass} aria-invalid={Boolean(errors.applicationType)} {...register('applicationType')}>
              <option value="">Select an application type</option>
              {APPLICATION_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            id="workflow"
            label="Workflow"
            error={errors.workflow?.message}
            hint="Select the applicable processing sequence."
          >
            <select id="workflow" className={inputClass} aria-invalid={Boolean(errors.workflow)} {...register('workflow')}>
              {WORKFLOW_KINDS.map((k) => (
                <option key={k} value={k}>
                  {WORKFLOW_TEMPLATES[k].label}
                </option>
              ))}
            </select>
          </FormField>

          <div className="flex items-start gap-2">
            <input
              id="declaration"
              type="checkbox"
              className="focus-ring mt-1 h-4 w-4"
              aria-invalid={Boolean(errors.declaration)}
              aria-describedby={errors.declaration ? 'declaration-error' : undefined}
              {...register('declaration')}
            />
            <div>
              <label htmlFor="declaration" className="text-sm">
                I confirm that the information provided in this application is accurate.
              </label>
              {errors.declaration && (
                <p id="declaration-error" className="text-xs font-medium text-red-700">
                  {errors.declaration.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={submit.isPending}>
              Submit application
            </Button>
            <Button variant="secondary" onClick={() => navigate('/applications')}>
              Cancel
            </Button>
          </div>
        </div>

        <aside aria-labelledby="checklist-heading" className="rounded border border-neutral-300 bg-white p-4 lg:col-span-1">
          <h2 id="checklist-heading" className="text-sm font-semibold text-navy-800">
            Required documents
          </h2>
          <p className="mt-1 text-xs text-neutral-600">These items are created as pending. Upload them after submission.</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {DEMO_CHECKLIST_LABELS.map((c) => (
              <li key={c.label}>
                {c.label}
                {c.required ? ' (required)' : ' (optional)'}
              </li>
            ))}
          </ul>
        </aside>
      </form>
    </>
  );
}
