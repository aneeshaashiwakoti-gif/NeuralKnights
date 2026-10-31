import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { APPLICATION_STATUS_LABEL, APPLICATION_STATUS_TONE, formatDate, STAGE_STATUS_TONE } from '../../domain/labels';
import type { ApplicationStatus } from '../../domain/types';
import { useAuth } from '../auth/AuthContext';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { EmptyState, ErrorState, inputClass, LoadingState, PageHeader, StatusChip } from '../../components/ui';
import { describeError } from '../../services/errors';
import { useApplicationList } from './hooks';

export function ApplicationsListPage() {
  const { has } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ApplicationStatus | 'all'>('all');
  const query = useApplicationList({ search, status });

  return (
    <>
      <Breadcrumbs items={[{ label: 'Overview', to: '/overview' }, { label: 'Applications' }]} />
      <PageHeader
        title="Applications"
        description="Registry of applications visible to your role. Results are limited by institution or region scope."
        actions={
          has('application.submit') ? (
            <Link
              to="/applications/new"
              className="focus-ring inline-flex items-center gap-2 rounded border border-navy-700 bg-navy-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-navy-800"
            >
              <Plus size={14} aria-hidden="true" /> New application
            </Link>
          ) : null
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div>
          <label htmlFor="app-search" className="mb-1 block text-sm font-medium">
            Search by application ID, programme or institution
          </label>
          <input
            id="app-search"
            type="search"
            className={inputClass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. APP-2026 or Computer"
          />
        </div>
        <div>
          <label htmlFor="app-status" className="mb-1 block text-sm font-medium">
            Status
          </label>
          <select
            id="app-status"
            className={inputClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as ApplicationStatus | 'all')}
          >
            <option value="all">All statuses</option>
            {(Object.keys(APPLICATION_STATUS_LABEL) as ApplicationStatus[]).map((s) => (
              <option key={s} value={s}>
                {APPLICATION_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {query.isPending && <LoadingState label="Loading applications…" />}
      {query.isError && <ErrorState message={describeError(query.error)} onRetry={() => void query.refetch()} />}
      {query.isSuccess && query.data.length === 0 && (
        <EmptyState
          title="No applications match these filters"
          description="Clear the search or status filter, or submit a new application."
        />
      )}
      {query.isSuccess && query.data.length > 0 && (
        <div className="overflow-x-auto rounded border border-neutral-300 bg-white">
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">Applications, newest first</caption>
            <thead className="bg-neutral-100 text-caption text-neutral-700">
              <tr>
                <th scope="col" className="px-3 py-2">Application ID</th>
                <th scope="col" className="px-3 py-2">Programme</th>
                <th scope="col" className="px-3 py-2">Institution</th>
                <th scope="col" className="px-3 py-2">Region</th>
                <th scope="col" className="px-3 py-2">Status</th>
                <th scope="col" className="px-3 py-2">Current stage</th>
                <th scope="col" className="px-3 py-2">Submitted</th>
                <th scope="col" className="px-3 py-2">Age (days)</th>
                <th scope="col" className="px-3 py-2">Open queries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {query.data.map((item) => {
                const stage = item.stages.find((s) => s.key === item.currentStageKey);
                return (
                  <tr key={item.id} className="hover:bg-neutral-50">
                    <td className="px-3 py-2 font-medium">
                      <Link to={`/applications/${item.id}`} className="focus-ring rounded font-mono text-navy-700 underline">
                        {item.id}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{item.programme}</td>
                    <td className="px-3 py-2">{item.institutionName}</td>
                    <td className="px-3 py-2">{item.region}</td>
                    <td className="px-3 py-2">
                      <StatusChip label={APPLICATION_STATUS_LABEL[item.status]} tone={APPLICATION_STATUS_TONE[item.status]} />
                    </td>
                    <td className="px-3 py-2">
                      {stage ? <StatusChip label={stage.label} tone={STAGE_STATUS_TONE[stage.status]} /> : '—'}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{formatDate(item.submittedOn)}</td>
                    <td className="px-3 py-2 tabular-nums">{item.ageDays}</td>
                    <td className="px-3 py-2 tabular-nums">{item.openQueryCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-neutral-600">
        Records shown: {query.isSuccess ? query.data.length : '—'}.
      </p>
    </>
  );
}
