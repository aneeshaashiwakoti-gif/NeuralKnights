import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DEMO_REGIONS } from '../../domain/policy';
import { APPLICATION_STATUS_LABEL, formatDate } from '../../domain/labels';
import type { ApplicationStatus, Capability } from '../../domain/types';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { EmptyState, ErrorState, LoadingState, Panel, PageHeader, StatusChip, inputClass } from '../../components/ui';
import { describeError } from '../../services/errors';
import { useDashboard } from '../applications/hooks';
import { useAuth } from '../auth/AuthContext';

const MODULES: { title: string; description: string; path: string; requiresAny?: Capability[] }[] = [
  { title: 'Applications', description: 'Search applications and review their current status.', path: '/applications' },
  { title: 'Workflow Monitoring', description: 'Review applications by active stage and processing age.', path: '/workflow' },
  { title: 'EVC Management', description: 'Review the visit queue, schedule committee visits and record completion.', path: '/evc', requiresAny: ['evc.schedule'] },
  { title: 'Compliance', description: 'Review institutional undertakings and submitted evidence.', path: '/compliance', requiresAny: ['compliance.verify', 'compliance.submit_evidence'] },
  { title: 'Document Validity', description: 'Review document validity and renewal records.', path: '/documents' },
  { title: 'Alerts', description: 'Review notifications, due dates and recorded escalations.', path: '/alerts', requiresAny: ['alerts.manage'] },
  { title: 'Reports', description: 'Review processing, compliance and workload reports.', path: '/reports', requiresAny: ['reports.export'] },
  { title: 'Audit Trail', description: 'Review application and administrative activity history.', path: '/audit', requiresAny: ['audit.view'] },
];

export function DashboardPage() {
  const [region, setRegion] = useState<string>('all');
  const [status, setStatus] = useState<ApplicationStatus | 'all'>('all');
  const { has } = useAuth();
  const query = useDashboard({ region, status });
  const modules = MODULES.filter((module) => !module.requiresAny || module.requiresAny.some((capability) => has(capability)));
  const kpis = query.data
    ? [
        { label: 'Applications in scope', value: query.data.totalApplications, color: 'border-navy-700' },
        { label: 'Under scrutiny', value: query.data.underScrutiny, color: 'border-status-info' },
        { label: 'Awaiting clarification', value: query.data.awaitingClarificationOrReturned, color: 'border-status-warning' },
        { label: 'Awaiting EVC', value: query.data.awaitingEvc, color: 'border-status-success' },
      ]
    : [
        { label: 'Applications in scope', value: '—', color: 'border-navy-700' },
        { label: 'Under scrutiny', value: '—', color: 'border-status-info' },
        { label: 'Awaiting clarification', value: '—', color: 'border-status-warning' },
        { label: 'Awaiting EVC', value: '—', color: 'border-status-success' },
      ];

  return (
    <>
      <Breadcrumbs items={[{ label: 'Overview' }]} />
      <PageHeader title="Overview" description="Application processing and institutional compliance at a glance." />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Application indicators" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item) => (
            <div key={item.label} className={`min-h-24 border border-neutral-300 border-l-[3px] ${item.color} bg-white p-3`}>
              <p className="text-sm text-neutral-700">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-navy-800">{item.value}</p>
            </div>
          ))}
        </section>
        <Panel title="Notices and alerts" id="overview-notices">
          <ul className="divide-y divide-neutral-200">
            <li className="py-2 first:pt-0">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <time className="text-caption text-neutral-700" dateTime={query.data?.asOfDate ?? ''}>
                  {query.data ? formatDate(query.data.asOfDate) : 'Current'}
                </time>
                <StatusChip label="Information" tone="info" />
              </div>
              <p className="text-sm">Review pending submissions and recorded clarifications in the application registry.</p>
            </li>
            <li className="py-2">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <time className="text-caption text-neutral-700" dateTime={query.data?.asOfDate ?? ''}>
                  {query.data ? formatDate(query.data.asOfDate) : 'Current'}
                </time>
                <StatusChip label={query.data?.overdueApplications ? 'Attention' : 'Information'} tone={query.data?.overdueApplications ? 'warning' : 'info'} />
              </div>
              <p className="text-sm">
                {query.data?.overdueApplications
                  ? `${query.data.overdueApplications} application(s) exceed the configured follow-up period.`
                  : 'Application records and processing summaries are available below.'}
              </p>
            </li>
          </ul>
        </Panel>
      </div>

      <section className="my-6" aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="mb-3 text-section text-navy-800">Services</h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => (
            <li key={module.path} className="flex min-h-40 flex-col rounded border border-neutral-300 bg-white p-4">
              <h3 className="font-semibold text-navy-800">{module.title}</h3>
              <p className="mt-1 text-sm text-neutral-700">{module.description}</p>
              <Link to={module.path} className="focus-ring mt-auto inline-block w-fit pt-3 text-sm font-semibold text-navy-700 underline">
                Open module
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="processing-heading" className="mb-4">
        <h2 id="processing-heading" className="text-section text-navy-800">Application processing summary</h2>
        <p className="mt-1 text-sm text-neutral-700">Filter the records available to your account.</p>
      </section>
      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="dash-region" className="mb-1 block text-sm font-medium">Region</label>
          <select id="dash-region" className={inputClass} value={region} onChange={(event) => setRegion(event.target.value)}>
            <option value="all">All regions</option>
            {DEMO_REGIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="dash-status" className="mb-1 block text-sm font-medium">Application status</label>
          <select
            id="dash-status"
            className={inputClass}
            value={status}
            onChange={(event) => setStatus(event.target.value as ApplicationStatus | 'all')}
          >
            <option value="all">All statuses</option>
            {(Object.keys(APPLICATION_STATUS_LABEL) as ApplicationStatus[]).map((item) => (
              <option key={item} value={item}>{APPLICATION_STATUS_LABEL[item]}</option>
            ))}
          </select>
        </div>
      </div>

      {query.isPending && <LoadingState label="Loading application summary…" />}
      {query.isError && <ErrorState message={describeError(query.error)} onRetry={() => void query.refetch()} />}
      {query.isSuccess && (
        <>
          <p className="mb-3 text-xs text-neutral-700">Records available: {query.data.scope}. Data as of {formatDate(query.data.asOfDate)}.</p>
          {query.data.totalApplications === 0 ? (
            <EmptyState title="No applications are available for the selected filters." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Applications by active stage" id="stage-pendency">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b border-neutral-300"><th scope="col" className="py-2">Stage</th><th scope="col" className="py-2">Applications</th></tr></thead>
                  <tbody className="divide-y divide-neutral-200">
                    {query.data.stagePendency.map((item) => (
                      <tr key={item.stageKey}><th scope="row" className="py-2 font-normal">{item.stageLabel}</th><td className="py-2 tabular-nums">{item.count}</td></tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
              <Panel title="Application age" id="ageing">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b border-neutral-300"><th scope="col" className="py-2">Days since submission</th><th scope="col" className="py-2">Applications</th></tr></thead>
                  <tbody className="divide-y divide-neutral-200">
                    {query.data.ageingBuckets.map((item) => (
                      <tr key={item.bucket}><th scope="row" className="py-2 font-normal">{item.bucket}</th><td className="py-2 tabular-nums">{item.count}</td></tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
              <Panel title="Regional distribution" id="region-dist">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b border-neutral-300"><th scope="col" className="py-2">Region</th><th scope="col" className="py-2">Applications</th></tr></thead>
                  <tbody className="divide-y divide-neutral-200">
                    {query.data.regionDistribution.map((item) => (
                      <tr key={item.region}><th scope="row" className="py-2 font-normal">{item.region}</th><td className="py-2 tabular-nums">{item.count}</td></tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
              <Panel title="Queries and reviews" id="queries-summary">
                <p className="text-sm text-neutral-800">
                  {query.data.openQueries} unresolved {query.data.openQueries === 1 ? 'query' : 'queries'};{' '}
                  {query.data.queriesAwaitingReview} institution {query.data.queriesAwaitingReview === 1 ? 'response is' : 'responses are'} awaiting review.
                </p>
                <Link to="/applications" className="focus-ring mt-3 inline-block rounded text-sm text-navy-700 underline">
                  Open the application registry
                </Link>
              </Panel>
            </div>
          )}
        </>
      )}
    </>
  );
}
