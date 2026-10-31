import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, EmptyState, ErrorState, FormField, inputClass, Panel, SuccessMessage } from '../../../components/ui';
import { describeError } from '../../../services/errors';
import type { ApplicationDetail } from '../../../services/types';
import type { ScrutinyQuery } from '../../../domain/types';
import { applicationActions, useApplicationAction } from '../hooks';
import {
  observationSchema,
  type ObservationValues,
  raiseQuerySchema,
  type RaiseQueryValues,
  reviewResponseSchema,
  type ReviewResponseValues,
} from '../schemas';

/** Actions available to a regulatory reviewer. Every mutation is re-validated by the service layer. */
export function ReviewerActions({ detail }: { detail: ApplicationDetail }) {
  const app = detail.application;
  const underScrutiny = app.status === 'under_scrutiny';
  const uploaded = detail.checklist.filter((c) => c.status === 'uploaded');
  const responded = detail.queries.filter((q) => q.status === 'responded');

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Verify uploaded documents" id="verify-heading">
        {uploaded.length === 0 ? (
          <EmptyState title="No documents awaiting verification" />
        ) : (
          <ul className="space-y-2">
            {uploaded.map((c) => (
              <VerifyRow key={c.id} checklistItemId={c.id} label={c.label} fileName={c.fileName} />
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Record a scrutiny observation" id="observe-heading">
        <ObservationForm applicationId={app.id} />
      </Panel>

      <Panel title="Raise a query" id="raise-heading">
        {underScrutiny ? (
          <RaiseQueryForm applicationId={app.id} />
        ) : (
          <EmptyState
            title="Queries cannot be raised now"
            description={`The application is ${app.status.replace(/_/g, ' ')}. Queries are raised while it is under scrutiny.`}
          />
        )}
      </Panel>

      <Panel title="Review institution responses" id="review-heading">
        {responded.length === 0 ? (
          <EmptyState title="No responses awaiting review" />
        ) : (
          <div className="space-y-6">
            {responded.map((q) => (
              <ReviewResponse key={q.id} query={q} />
            ))}
          </div>
        )}
      </Panel>

      <div className="lg:col-span-2">
        <CompleteStage detail={detail} />
      </div>
    </div>
  );
}

function VerifyRow({ checklistItemId, label, fileName }: { checklistItemId: string; label: string; fileName: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const mutation = useApplicationAction(applicationActions.verifyChecklistItem);
  return (
    <li className="rounded border border-neutral-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <div className="font-medium">{label}</div>
          <div className="text-xs text-neutral-600">Recorded file name: {fileName ?? '—'}</div>
        </div>
        <Button
          variant="secondary"
          loading={mutation.isPending}
          onClick={() => {
            setError(null);
            setMessage(null);
            mutation.mutate(
              { checklistItemId },
              {
                onSuccess: () => setMessage(`${label} verified.`),
                onError: (err) => setError(describeError(err)),
              },
            );
          }}
        >
          Verify
        </Button>
      </div>
      {error && <div className="mt-2"><ErrorState message={error} /></div>}
      {message && <div className="mt-2"><SuccessMessage message={message} /></div>}
    </li>
  );
}

function ObservationForm({ applicationId }: { applicationId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useApplicationAction(applicationActions.recordObservation);
  const form = useForm<ObservationValues>({ resolver: zodResolver(observationSchema), defaultValues: { text: '' } });
  const { register, handleSubmit, formState, reset } = form;

  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={handleSubmit((v) => {
        setMessage(null);
        setError(null);
        mutation.mutate(
          { applicationId, text: v.text },
          {
            onSuccess: () => {
              setMessage('Observation recorded in the application history.');
              reset({ text: '' });
            },
            onError: (err) => setError(describeError(err)),
          },
        );
      })}
    >
      <FormField id="observation-text" label="Observation" error={formState.errors.text?.message} required>
        <textarea
          id="observation-text"
          rows={3}
          className={inputClass}
          aria-invalid={Boolean(formState.errors.text)}
          {...register('text')}
        />
      </FormField>
      {error && <ErrorState message={error} />}
      {message && <SuccessMessage message={message} />}
      <Button type="submit" loading={mutation.isPending}>
        Record observation
      </Button>
    </form>
  );
}

function RaiseQueryForm({ applicationId }: { applicationId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useApplicationAction(applicationActions.raiseQuery);
  const form = useForm<RaiseQueryValues>({
    resolver: zodResolver(raiseQuerySchema),
    defaultValues: { kind: 'clarification', reason: '' },
  });
  const { register, handleSubmit, formState, reset } = form;

  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={handleSubmit((v) => {
        setMessage(null);
        setError(null);
        mutation.mutate(
          { applicationId, kind: v.kind, reason: v.reason },
          {
            onSuccess: () => {
              setMessage(
                v.kind === 'clarification'
                  ? 'Clarification requested. The institution has been notified.'
                  : 'Application returned with a deficiency. The reason is recorded.',
              );
              reset({ kind: 'clarification', reason: '' });
            },
            onError: (err) => setError(describeError(err)),
          },
        );
      })}
    >
      <FormField id="query-kind" label="Type of query" error={formState.errors.kind?.message} required>
        <select id="query-kind" className={inputClass} {...register('kind')}>
          <option value="clarification">Clarification (application remains with the institution until answered)</option>
          <option value="deficiency">Deficiency (return application to the institution)</option>
        </select>
      </FormField>
      <FormField id="query-reason" label="Reason" error={formState.errors.reason?.message} hint="State the specific information or correction required." required>
        <textarea id="query-reason" rows={3} className={inputClass} aria-invalid={Boolean(formState.errors.reason)} {...register('reason')} />
      </FormField>
      {error && <ErrorState message={error} />}
      {message && <SuccessMessage message={message} />}
      <Button type="submit" loading={mutation.isPending}>
        Raise query
      </Button>
    </form>
  );
}

function ReviewResponse({ query }: { query: ScrutinyQuery }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useApplicationAction(applicationActions.reviewQueryResponse);
  const form = useForm<ReviewResponseValues>({ resolver: zodResolver(reviewResponseSchema), defaultValues: { note: '' } });
  const { register, handleSubmit, formState, reset } = form;
  const fieldId = `review-note-${query.id}`;

  const submitWith = (decision: 'accept' | 'reject') =>
    handleSubmit((v) => {
      setMessage(null);
      setError(null);
      mutation.mutate(
        { queryId: query.id, decision, note: v.note },
        {
          onSuccess: () => {
            setMessage(
              decision === 'accept'
                ? `${query.id} verified. Scrutiny can proceed once all queries are verified.`
                : `${query.id} reopened. The institution must respond again.`,
            );
            reset({ note: '' });
          },
          onError: (err) => setError(describeError(err)),
        },
      );
    });

  return (
    <div className="rounded border border-neutral-200 p-3 text-sm">
      <div className="font-medium">{query.id}</div>
      <p className="mt-1 text-neutral-800">
        <span className="font-medium">Query: </span>
        {query.reason}
      </p>
      <p className="mt-2 border-l-2 border-navy-300 pl-3">
        <span className="font-medium">Institution response: </span>
        {query.response}
      </p>
      <form noValidate className="mt-3 space-y-3">
        <FormField id={fieldId} label="Review note" error={formState.errors.note?.message} required>
          <textarea id={fieldId} rows={2} className={inputClass} aria-invalid={Boolean(formState.errors.note)} {...register('note')} />
        </FormField>
        {error && <ErrorState message={error} />}
        {message && <SuccessMessage message={message} />}
        <div className="flex flex-wrap gap-2">
          <Button onClick={submitWith('accept')} loading={mutation.isPending}>
            Accept response
          </Button>
          <Button variant="danger" onClick={submitWith('reject')} loading={mutation.isPending}>
            Reject and reopen query
          </Button>
        </div>
      </form>
    </div>
  );
}

function CompleteStage({ detail }: { detail: ApplicationDetail }) {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useApplicationAction(applicationActions.completeCurrentStage);
  const app = detail.application;

  if (app.currentStageKey !== 'scrutiny') {
    return (
      <Panel title="Complete the current stage" id="complete-heading">
        <EmptyState
          title="Use the relevant stage workspace to continue processing."
          description="Stage actions are available from the workflow monitoring and EVC management workspaces."
        />
      </Panel>
    );
  }

  const unresolved = detail.queries.filter((q) => q.status !== 'verified').length;
  const unverifiedRequired = detail.checklist.filter((c) => c.required && c.status !== 'verified').length;
  const blockers: string[] = [];
  if (app.status !== 'under_scrutiny') blockers.push('The application must be under scrutiny.');
  if (unresolved > 0) blockers.push(`${unresolved} ${unresolved === 1 ? 'query is' : 'queries are'} unresolved.`);
  if (unverifiedRequired > 0) blockers.push(`${unverifiedRequired} required document(s) not yet verified.`);
  const ready = blockers.length === 0;

  return (
    <Panel title="Complete scrutiny and advance the workflow" id="complete-heading">
      {ready ? (
        <p className="text-sm text-neutral-800">
          All required checks are complete. Completing scrutiny records the completion and moves the application to
          the next prescribed stage in its template.
        </p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-800" aria-label="Blocking conditions">
          {blockers.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
      <div className="mt-3 space-y-3">
        {error && <ErrorState message={error} />}
        {message && <SuccessMessage message={message} />}
        {!confirming ? (
          <Button onClick={() => setConfirming(true)} disabled={!ready}>
            Complete scrutiny…
          </Button>
        ) : (
          <div role="group" aria-label="Confirm completion" className="rounded border border-neutral-300 bg-neutral-100 p-3 text-sm">
            <p className="font-medium">Confirm: complete scrutiny for {app.id}?</p>
            <p className="mt-1 text-xs text-neutral-700">This is recorded in the audit history. The service re-checks all conditions.</p>
            <div className="mt-3 flex gap-2">
              <Button
                loading={mutation.isPending}
                onClick={() => {
                  setError(null);
                  setMessage(null);
                  mutation.mutate(
                    { applicationId: app.id },
                    {
                      onSuccess: () => {
                        setConfirming(false);
                        setMessage('Scrutiny completed. The next prescribed stage is now active.');
                      },
                      onError: (err) => {
                        setConfirming(false);
                        setError(describeError(err));
                      },
                    },
                  );
                }}
              >
                Confirm completion
              </Button>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
