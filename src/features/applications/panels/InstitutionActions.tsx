import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, EmptyState, ErrorState, FormField, inputClass, Panel, SuccessMessage } from '../../../components/ui';
import { CHECKLIST_STATUS_LABEL } from '../../../domain/labels';
import { describeError } from '../../../services/errors';
import type { ApplicationDetail } from '../../../services/types';
import { applicationActions, useApplicationAction } from '../hooks';
import {
  respondQuerySchema,
  type RespondQueryValues,
  uploadChecklistSchema,
  type UploadChecklistValues,
} from '../schemas';
import type { ScrutinyQuery } from '../../../domain/types';

/** Actions available to an institution administrator for their own application. */
export function InstitutionActions({ detail }: { detail: ApplicationDetail }) {
  const openQueries = detail.queries.filter((q) => q.status === 'open');
  const uploadable = detail.checklist.filter((c) => c.status !== 'verified');

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Upload a prescribed document" id="upload-heading">
        {uploadable.length === 0 ? (
          <EmptyState title="All checklist documents are verified" />
        ) : (
          <UploadForm detail={detail} items={uploadable.map((c) => ({ id: c.id, label: c.label }))} />
        )}
      </Panel>

      <Panel title="Respond to open queries" id="respond-heading">
        {openQueries.length === 0 ? (
          <EmptyState
            title="No open queries"
            description="When the reviewer requests clarification or returns the application, a response form appears here."
          />
        ) : (
          <div className="space-y-6">
            {openQueries.map((q) => (
              <RespondForm key={q.id} query={q} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function UploadForm({ detail, items }: { detail: ApplicationDetail; items: { id: string; label: string }[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useApplicationAction(applicationActions.uploadChecklistItem);
  const form = useForm<UploadChecklistValues>({
    resolver: zodResolver(uploadChecklistSchema),
    defaultValues: { checklistItemId: items[0]?.id ?? '', fileName: '' },
  });
  const { register, handleSubmit, formState, reset } = form;

  const onValid = (v: UploadChecklistValues) => {
    setMessage(null);
    setError(null);
    mutation.mutate(v, {
      onSuccess: () => {
        setMessage('Document recorded. The reviewer can now verify it.');
        reset({ checklistItemId: v.checklistItemId, fileName: '' });
      },
      onError: (err) => setError(describeError(err)),
    });
  };

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate className="space-y-4">
      <p className="text-xs text-neutral-700">
        Application {detail.application.id}. Enter the document file name for the application record.
      </p>
      <FormField id="checklistItemId" label="Checklist item" error={formState.errors.checklistItemId?.message}>
        <select id="checklistItemId" className={inputClass} {...register('checklistItemId')}>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        id="fileName"
        label="File name"
        error={formState.errors.fileName?.message}
        hint="Example: registered-lease-deed.pdf"
      >
        <input id="fileName" className={inputClass} aria-invalid={Boolean(formState.errors.fileName)} {...register('fileName')} />
      </FormField>
      {error && <ErrorState message={error} />}
      {message && <SuccessMessage message={message} />}
      <Button type="submit" loading={mutation.isPending}>
        Record upload
      </Button>
      <ul className="text-xs text-neutral-700">
        {detail.checklist.map((c) => (
          <li key={c.id}>
            {c.label}: {CHECKLIST_STATUS_LABEL[c.status]}
          </li>
        ))}
      </ul>
    </form>
  );
}

function RespondForm({ query }: { query: ScrutinyQuery }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useApplicationAction(applicationActions.respondToQuery);
  const form = useForm<RespondQueryValues>({
    resolver: zodResolver(respondQuerySchema),
    defaultValues: { response: '' },
  });
  const { register, handleSubmit, formState, reset } = form;
  const fieldId = `response-${query.id}`;

  const onValid = (v: RespondQueryValues) => {
    setMessage(null);
    setError(null);
    mutation.mutate(
      { queryId: query.id, response: v.response },
      {
        onSuccess: () => {
          setMessage('Response submitted. The application returns to scrutiny for reviewer verification.');
          reset({ response: '' });
        },
        onError: (err) => setError(describeError(err)),
      },
    );
  };

  return (
    <div className="rounded border border-neutral-200 p-3">
      <p className="text-sm">
        <span className="font-medium">{query.id}</span>{' '}
        <span className="text-xs uppercase text-neutral-600">
          {query.kind === 'clarification' ? 'Clarification' : 'Deficiency'}
        </span>
      </p>
      <p className="mt-1 text-sm text-neutral-800">{query.reason}</p>
      <form onSubmit={handleSubmit(onValid)} noValidate className="mt-3 space-y-3">
        <FormField
          id={fieldId}
          label="Your response"
          error={formState.errors.response?.message}
          hint="Answer the reviewer's query specifically. Attach evidence references by file name where relevant."
        >
          <textarea
            id={fieldId}
            rows={4}
            className={inputClass}
            aria-invalid={Boolean(formState.errors.response)}
            {...register('response')}
          />
        </FormField>
        {error && <ErrorState message={error} />}
        {message && <SuccessMessage message={message} />}
        <Button type="submit" loading={mutation.isPending}>
          Submit response
        </Button>
      </form>
    </div>
  );
}
