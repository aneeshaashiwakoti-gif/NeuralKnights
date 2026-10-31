import { useRef, useState, type KeyboardEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { ErrorState, LoadingState, PageHeader, PermissionDenied, StatusChip } from '../../components/ui';
import { APPLICATION_STATUS_LABEL, APPLICATION_STATUS_TONE } from '../../domain/labels';
import { isServiceError, describeError } from '../../services/errors';
import { useApplicationDetail } from './hooks';
import { OverviewPanel } from './panels/OverviewPanel';
import { DocumentsPanel, ObservationsPanel, HistoryPanel } from './panels/RecordsPanels';
import { ActionsPanel } from './panels/ActionsPanel';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'documents', label: 'Documents' },
  { key: 'observations', label: 'Observations and queries' },
  { key: 'workflow', label: 'Workflow history' },
  { key: 'actions', label: 'Actions' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export function ApplicationDetailPage() {
  const { applicationId = '' } = useParams();
  const query = useApplicationDetail(applicationId);
  const [tab, setTab] = useState<TabKey>('overview');
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = (index + 1) % TABS.length;
    if (e.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = TABS.length - 1;
    if (next !== null) {
      e.preventDefault();
      setTab(TABS[next].key);
      tabRefs.current[TABS[next].key]?.focus();
    }
  };

  const crumbs = (
    <Breadcrumbs
      items={[
        { label: 'Overview', to: '/overview' },
        { label: 'Applications', to: '/applications' },
        { label: applicationId },
      ]}
    />
  );

  if (query.isPending) {
    return (
      <>
        {crumbs}
        <LoadingState label="Loading application…" />
      </>
    );
  }

  if (query.isError) {
    if (isServiceError(query.error) && query.error.code === 'PERMISSION_DENIED') {
      return (
        <>
          {crumbs}
          <PermissionDenied message="This application is outside your permitted scope. Access is limited by institution or region." />
        </>
      );
    }
    return (
      <>
        {crumbs}
        <ErrorState message={describeError(query.error)} onRetry={() => void query.refetch()} />
      </>
    );
  }

  const d = query.data;
  const app = d.application;

  return (
    <>
      {crumbs}
      <PageHeader
        title={<><span className="font-mono">{app.id}</span>: {app.programme}</>}
        description={`${d.institution.name} · ${d.workflowTemplate.label}`}
        actions={
          <StatusChip label={APPLICATION_STATUS_LABEL[app.status]} tone={APPLICATION_STATUS_TONE[app.status]} />
        }
      />

      <div role="tablist" aria-label="Application sections" className="mb-4 flex flex-wrap gap-1 border-b border-neutral-300">
        {TABS.map((t, i) => {
          const selected = tab === t.key;
          return (
            <button
              key={t.key}
              ref={(el) => {
                tabRefs.current[t.key] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${t.key}`}
              aria-selected={selected}
              aria-controls={`panel-${t.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(t.key)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
              className={`focus-ring -mb-px border-b-2 px-3 py-2 text-sm ${
                selected ? 'border-navy-500 font-semibold text-navy-800' : 'border-transparent text-neutral-700 hover:text-navy-800'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0} className="focus-ring">
        {tab === 'overview' && <OverviewPanel detail={d} />}
        {tab === 'documents' && <DocumentsPanel detail={d} />}
        {tab === 'observations' && <ObservationsPanel detail={d} />}
        {tab === 'workflow' && <HistoryPanel detail={d} />}
        {tab === 'actions' && <ActionsPanel detail={d} />}
      </div>
    </>
  );
}
