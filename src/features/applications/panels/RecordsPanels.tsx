import {
  CHECKLIST_STATUS_LABEL,
  CHECKLIST_STATUS_TONE,
  APPLICATION_STATUS_LABEL,
  formatDate,
  formatDateTime,
  QUERY_STATUS_LABEL,
  QUERY_STATUS_TONE,
} from '../../../domain/labels';
import { EmptyState, Panel, StatusChip } from '../../../components/ui';
import type { ApplicationDetail } from '../../../services/types';

function nameOf(detail: ApplicationDetail, userId: string | null): string {
  if (!userId) return '—';
  return detail.people.find((p) => p.id === userId)?.displayName ?? userId;
}

export function DocumentsPanel({ detail }: { detail: ApplicationDetail }) {
  return (
    <Panel title="Document checklist" id="docs-heading">
      {detail.checklist.length === 0 ? (
        <EmptyState title="No checklist items recorded" />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">Document checklist for this application</caption>
            <thead className="text-xs uppercase text-neutral-700">
              <tr>
                <th scope="col" className="py-2 pr-4">Item</th>
                <th scope="col" className="py-2 pr-4">Required</th>
                <th scope="col" className="py-2 pr-4">Status</th>
                <th scope="col" className="py-2 pr-4">File name (recorded only)</th>
                <th scope="col" className="py-2">Uploaded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {detail.checklist.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 pr-4">{item.label}</td>
                  <td className="py-2 pr-4">{item.required ? 'Yes' : 'No'}</td>
                  <td className="py-2 pr-4">
                    <StatusChip label={CHECKLIST_STATUS_LABEL[item.status]} tone={CHECKLIST_STATUS_TONE[item.status]} />
                  </td>
                  <td className="py-2 pr-4">{item.fileName ?? '—'}</td>
                  <td className="py-2">{formatDate(item.uploadedOn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

export function ObservationsPanel({ detail }: { detail: ApplicationDetail }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Queries (clarifications and deficiencies)" id="queries-heading">
        {detail.queries.length === 0 ? (
          <EmptyState title="No queries raised" description="Clarifications and deficiencies raised by the reviewer appear here." />
        ) : (
          <ul className="space-y-4">
            {detail.queries.map((q) => (
              <li key={q.id} className="rounded border border-neutral-200 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{q.id}</span>
                  <span className="text-xs uppercase text-neutral-600">
                    {q.kind === 'clarification' ? 'Clarification' : 'Deficiency (return)'}
                  </span>
                  <StatusChip label={QUERY_STATUS_LABEL[q.status]} tone={QUERY_STATUS_TONE[q.status]} />
                </div>
                <p className="mt-2">
                  <span className="font-medium">Raised by {nameOf(detail, q.raisedById)}</span> on {formatDate(q.raisedOn)}:
                  <br />
                  {q.reason}
                </p>
                {q.response && (
                  <p className="mt-2 border-l-2 border-navy-300 pl-3">
                    <span className="font-medium">Institution response</span>
                    {q.respondedOn ? ` (${formatDate(q.respondedOn)})` : ''}:
                    <br />
                    {q.response}
                  </p>
                )}
                {q.reviewNote && (
                  <p className="mt-2 border-l-2 border-saffron-500 pl-3">
                    <span className="font-medium">Reviewer note by {nameOf(detail, q.reviewedById)}</span>
                    {q.reviewedOn ? ` (${formatDate(q.reviewedOn)})` : ''}:
                    <br />
                    {q.reviewNote}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Scrutiny observations" id="observations-heading">
        {detail.observations.length === 0 ? (
          <EmptyState title="No observations recorded" />
        ) : (
          <ul className="space-y-3 text-sm">
            {detail.observations.map((o) => (
              <li key={o.id} className="rounded border border-neutral-200 p-3">
                <div className="text-xs text-neutral-600">
                  {o.id} · {nameOf(detail, o.authorId)} · {formatDate(o.recordedOn)}
                </div>
                <p className="mt-1">{o.text}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

export function HistoryPanel({ detail }: { detail: ApplicationDetail }) {
  return (
    <Panel title="Workflow and action history" id="history-heading">
      <p className="mb-3 text-xs text-neutral-700">
        Activity history is held in browser storage and is not tamper-evident.
      </p>
      {detail.auditEvents.length === 0 ? (
        <EmptyState title="No events recorded for this application" />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">Action history for this application, newest first</caption>
            <thead className="text-xs uppercase text-neutral-700">
              <tr>
                <th scope="col" className="py-2 pr-3">Timestamp</th>
                <th scope="col" className="py-2 pr-3">Action</th>
                <th scope="col" className="py-2 pr-3">Actor and role</th>
                <th scope="col" className="py-2 pr-3">Previous status</th>
                <th scope="col" className="py-2 pr-3">New status</th>
                <th scope="col" className="py-2 pr-3">Reason</th>
                <th scope="col" className="py-2">Related record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {detail.auditEvents.map((e) => (
                <tr key={e.id} className="align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(e.timestamp)}</td>
                  <td className="py-2 pr-3">{e.action}</td>
                  <td className="py-2 pr-3">
                    {e.actorName}
                    <div className="text-xs text-neutral-600">{e.actorRole.replace(/_/g, ' ')}</div>
                  </td>
                  <td className="py-2 pr-3">{labelOrDash(e.previousStatus)}</td>
                  <td className="py-2 pr-3">{labelOrDash(e.newStatus)}</td>
                  <td className="py-2 pr-3">{e.reason ?? '—'}</td>
                  <td className="py-2">{e.relatedRecord ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function labelOrDash(status: string | null): string {
  if (!status) return '—';
  return (APPLICATION_STATUS_LABEL as Record<string, string>)[status] ?? status.replace(/_/g, ' ');
}
