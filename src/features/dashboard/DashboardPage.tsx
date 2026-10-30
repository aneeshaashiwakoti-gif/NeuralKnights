import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DEMO_REGIONS } from '../../domain/policy';
import { APPLICATION_STATUS_LABEL, formatDate } from '../../domain/labels';
import type { ApplicationStatus } from '../../domain/types';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { EmptyState, ErrorState, LoadingState, Panel, PageHeader, inputClass } from '../../components/ui';
import { describeError } from '../../services/errors';
import { useDashboard } from '../applications/hooks';
import { useAuth } from '../auth/AuthContext';

const MODULES = [
  { title: 'Application registry', description: 'Search applications and review their current status.', path: '/applications' },
  { title: 'Workflow monitoring', description: 'Review applications by active stage and processing age.', path: '/workflow' },
  { title: 'Compliance register', description: 'Review undertakings and submitted evidence.', path: '/compliance' },
  { title: 'Document register', description: 'Review document validity and renewal records.', path: '/documents' },
];

export function DashboardPage() {
  const [region, setRegion] = useState<string>('all');
  const [status, setStatus] = useState<ApplicationStatus | 'all'>('all');
  const { has } = useAuth();
  const query = useDashboard({ region, status });
  const modules = MODULES.filter(
    (module) => module.path !== '/compliance' || has('compliance.verify') || has('compliance.submit_evidence'),
  );

  return (
    <>
      <Breadcrumbs items={[{ label: 'Overview' }]} />
      <PageHeader title="Overview" description="Application processing and institutional compliance at a glance." />

      <Panel title="Notices" id="overview-notices">
        <ul className="divide-y divide-neutral-200">
          <li className="py-2">
            <time className="mr-3 text-xs font-medium text-neutral-600" dateTime={query.data?.asOfDate ?? ''}>
              {query.data ? formatDate(query.data.asOfDate) : 'Current'}
            </time>
            <span className="text-sm">Application processing information is available in the operational summary below.</span>
          </li>
          <li className="py-2">
            <time className="mr-3 text-xs font-medium text-neutral-600" dateTime={query.data?.asOfDate ?? ''}>
              {query.data ? formatDate(query.data.asOfDate) : 'Current'}
            </time>
            <span className="text-sm">Review pending submissions and recorded clarifications through the application registry.</span>
          </li>
        </ul>
      </Panel>

      <section className="my-6" aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="mb-3 text-lg font-semibold text-navy-800">Services</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {modules.map((module) => (
            <li key={module.path} className="rounded border border-neutral-300 bg-white p-4">
              <h3 className="font-semibold text-navy-800">{module.title}</h3>
              <p className="mt-1 text-sm text-neutral-700">{module.description}</p>
              <Link to={module.path} className="focus-ring mt-3 inline-block rounded text-sm font-medium text-navy-700 underline">
                Learn more
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="processing-heading" className="mb-4">
        <h2 id="processing-heading" className="text-xl font-semibold text-navy-800">Application processing summary</h2>
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
