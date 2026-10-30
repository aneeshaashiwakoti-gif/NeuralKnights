import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import {
  Button,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  PageHeader,
  Panel,
  PermissionDenied,
  StatusChip,
  SuccessMessage,
  inputClass,
} from '../../components/ui';
import { DEMO_REGIONS, DEMO_POLICY } from '../../domain/policy';
import { APPLICATION_STATUS_LABEL } from '../../domain/labels';
import type { ApplicationStatus, DemoAlert, DemoPolicy, WorkflowKind } from '../../domain/types';
import { WORKFLOW_KINDS, WORKFLOW_TEMPLATES } from '../../domain/workflowTemplates';
import { describeError } from '../../services/errors';
import { services } from '../../services';
import type {
  AdminConfiguration,
  AiAction,
  AuditFilters,
  DocumentValidity,
  ReportKind,
  ReportRow,
  WorkflowFilters,
} from '../../services/types';
import { useAuth } from '../auth/AuthContext';
import { evcScheduleSchema, fileNameSchema, policySchema } from './schemas';

const STAGE_OPTIONS = [
  ['scrutiny', 'Scrutiny'],
  ['evc', 'EVC'],
  ['sac_shc', 'SAC/SHC'],
  ['decision', 'Decision record'],
] as const;
const STATUSES = Object.keys(APPLICATION_STATUS_LABEL) as ApplicationStatus[];
const statusClass = `${inputClass} max-w-xs`;

function useAction() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const run = async (operation: () => Promise<unknown>, successText: string) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await operation();
      await queryClient.invalidateQueries();
      setSuccess(successText);
    } catch (reason) {
      setError(describeError(reason));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, success, run, setError };
}

function Feedback({ error, success }: { error: string; success: string }) {
  return (
    <div className="space-y-2" aria-live="polite">
      {error && <div role="alert" className="text-sm font-medium text-red-800">{error}</div>}
      {success && <SuccessMessage message={success} />}
    </div>
  );
}

function ModuleFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Overview', to: '/overview' }, { label: title }]} />
      <PageHeader title={title} description={description} />
      <div className="space-y-4">{children}</div>
    </>
  );
}

function QueryState<T>({
  query,
  children,
}: {
  query: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown; data?: T };
  children: (data: T) => React.ReactNode;
}) {
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState message={describeError(query.error)} onRetry={() => void query.refetch()} />;
  if (query.data === undefined) return <EmptyState title="No records are available." />;
  return <>{children(query.data)}</>;
}

export function WorkflowPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<WorkflowFilters>({});
  const peopleQuery = useQuery({ queryKey: ['module-people'], queryFn: () => services.auth.listDemoUsers() });
  const query = useQuery({
    queryKey: ['workflow-list', user?.id, filters],
    queryFn: () => user ? services.workflow.listApplications(user, filters) : Promise.resolve([]),
  });
  const update = <K extends keyof WorkflowFilters>(key: K, value: NonNullable<WorkflowFilters[K]>) =>
    setFilters((previous) => ({ ...previous, [key]: value }));

  return (
    <ModuleFrame title="Workflow Monitoring" description="Filter the role-scoped application list by active stage, region, status and responsible officer.">
      <Panel title="Filters">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FormField id="workflow-region" label="Region">
            <select id="workflow-region" className={statusClass} value={filters.region ?? 'all'} onChange={(e) => update('region', e.target.value)}>
              <option value="all">All regions</option>
              {DEMO_REGIONS.map((region) => <option key={region}>{region}</option>)}
            </select>
          </FormField>
          <FormField id="workflow-stage" label="Stage">
            <select id="workflow-stage" className={statusClass} value={filters.stage ?? 'all'} onChange={(e) => update('stage', e.target.value)}>
              <option value="all">All stages</option>
              {STAGE_OPTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </FormField>
          <FormField id="workflow-status" label="Status">
            <select id="workflow-status" className={statusClass} value={filters.status ?? 'all'} onChange={(e) => update('status', e.target.value as ApplicationStatus | 'all')}>
              <option value="all">All statuses</option>
              {STATUSES.map((status) => <option key={status} value={status}>{APPLICATION_STATUS_LABEL[status]}</option>)}
            </select>
          </FormField>
          <FormField id="workflow-officer" label="Responsible officer">
            <select id="workflow-officer" className={statusClass} value={filters.responsibleOfficerId ?? 'all'} onChange={(e) => update('responsibleOfficerId', e.target.value)}>
              <option value="all">All officers</option>
              {(peopleQuery.data ?? []).map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
            </select>
          </FormField>
        </div>
      </Panel>
      <QueryState query={query}>
        {(rows) => rows.length ? (
          <div className="overflow-x-auto rounded border border-neutral-300 bg-white">
            <table className="min-w-[760px] w-full text-left text-sm">
              <caption className="p-3 text-left font-semibold">Applications by active stage</caption>
              <thead className="bg-neutral-100"><tr>{['Application', 'Institution', 'Region', 'Stage', 'Status', 'Officer', 'Age (days)'].map((h) => <th key={h} scope="col" className="p-2">{h}</th>)}</tr></thead>
              <tbody>{rows.map((row) => (
                <tr key={row.id} className="border-t border-neutral-200">
                  <td className="p-2"><Link className="text-navy-700 underline" to={`/applications/${row.id}`}>{row.id}</Link></td>
                  <td className="p-2">{row.institutionName}</td><td className="p-2">{row.region}</td>
                  <td className="p-2">{row.stages.find((stage) => stage.key === row.currentStageKey)?.label ?? row.currentStageKey}</td>
                  <td className="p-2">{APPLICATION_STATUS_LABEL[row.status]}</td>
                  <td className="p-2">{peopleQuery.data?.find((person) => person.id === row.responsibleOfficerId)?.displayName ?? 'Unassigned'}</td>
                  <td className="p-2">{row.ageDays}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <EmptyState title="No applications match these filters." />}
      </QueryState>
    </ModuleFrame>
  );
}

export function EvcPage() {
  const { user, has } = useAuth();
  const action = useAction();
  const [applicationId, setApplicationId] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [venue, setVenue] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [validationError, setValidationError] = useState('');
  const query = useQuery({
    queryKey: ['evc-data', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Sign in is required.');
      const [queue, visits, people, policy, allAudit] = await Promise.all([
        services.evc.listQueue(user),
        services.evc.listVisits(user),
        services.auth.listDemoUsers(),
        services.evc.getPolicy(user),
        services.audit.listGlobal(user),
      ]);
      return {
        queue,
        visits,
        people,
        policy: policy.policy,
        asOfDate: policy.asOfDate,
        audit: allAudit.filter((event) => {
          const action = event.action.toLowerCase();
          return action.includes('evc') || action.includes('escalat');
        }),
      };
    },
    enabled: Boolean(user),
  });
  const data = query.data;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    const parsed = evcScheduleSchema.safeParse({ applicationId, visitDate, committeeMemberIds: members, venue });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Check the visit details.');
      return;
    }
    setValidationError('');
    void action.run(() => services.evc.schedule(user, parsed.data), 'EVC visit scheduled.');
  };

  return (
    <ModuleFrame title="EVC Management" description="Manage the Expert Visit Committee queue, scheduled visits and visit history.">
      <Feedback error={validationError || action.error} success={action.success} />
      {has('evc.schedule') && (
        <Panel title="Schedule visit">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            <FormField id="evc-application" label="Application">
              <select id="evc-application" className={inputClass} value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
                <option value="">Select an awaiting EVC application</option>
                {(data?.queue ?? []).map((item) => <option key={item.id} value={item.id}>{item.id} — {item.programme}</option>)}
              </select>
            </FormField>
            <FormField id="evc-date" label="Visit date" hint={`Select a date on or after ${data?.asOfDate ?? 'the current processing date'}.`}>
              <input id="evc-date" type="date" className={inputClass} value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
            </FormField>
            <FormField id="evc-members" label="Committee members" hint="Use Ctrl/Command to select more than one member.">
              <select id="evc-members" className={inputClass} multiple value={members} onChange={(e) => setMembers(Array.from(e.target.selectedOptions, (option) => option.value))}>
                {(data?.people ?? []).map((person) => <option key={person.id} value={person.id}>{person.displayName} — {person.designation}</option>)}
              </select>
            </FormField>
            <FormField id="evc-venue" label="Venue">
              <input id="evc-venue" className={inputClass} value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={160} />
            </FormField>
            <div className="md:col-span-2"><Button type="submit" loading={action.busy} disabled={!has('evc.schedule')}>Schedule visit</Button></div>
          </form>
        </Panel>
      )}
      <QueryState query={query}>
        {(result) => (
          <>
            <Panel title="Awaiting EVC queue">
              {result.queue.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-[660px] w-full text-left text-sm">
                    <thead className="bg-neutral-100"><tr>{['Application', 'Institution', 'Region', 'Ageing', 'EVC scheduling deadline'].map((h) => <th key={h} scope="col" className="p-2">{h}</th>)}</tr></thead>
                    <tbody>{result.queue.map((item) => {
                      const overdue = dayDistance(item.lastActionOn, result.asOfDate) > result.policy.evcVisitDeadlineDays;
                      return <tr key={item.id} className="border-t">
                        <td className="p-2"><Link to={`/applications/${item.id}`} className="underline text-navy-700">{item.id}</Link></td>
                        <td className="p-2">{item.institutionName}</td><td className="p-2">{item.region}</td><td className="p-2">{item.ageDays} days</td>
                        <td className="p-2"><StatusChip label={overdue ? 'Overdue — configured policy' : 'Within configured period'} tone={overdue ? 'warning' : 'success'} /></td>
                      </tr>;
                    })}</tbody>
                  </table>
                </div>
              ) : <EmptyState title="The EVC queue is empty in this scope." />}
              <p className="mt-3 text-xs text-neutral-700">Configured visit follow-up period: {result.policy.evcVisitDeadlineDays} days from the last application action.</p>
            </Panel>
            <Panel title="Scheduled visits">
              {result.visits.length ? <ul className="space-y-3">{result.visits.map((visit) => {
                const app = result.queue.find((item) => item.id === visit.applicationId);
                const overdue = visit.status === 'scheduled' && visitDateOverdue(visit.visitDate, result.policy.evcVisitDeadlineDays, result.asOfDate);
                return <li key={visit.id} className="rounded border border-neutral-200 p-3">
                  <p className="font-medium">{visit.applicationId} · {visit.visitDate} · {visit.venue}</p>
                  <p className="text-sm">Committee: {visit.committeeMemberIds.map((id) => result.people.find((person) => person.id === id)?.displayName ?? id).join(', ')}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2"><StatusChip label={visit.status === 'completed' ? 'Completed' : 'Scheduled'} tone={visit.status === 'completed' ? 'success' : 'info'} />{overdue && <StatusChip label="Overdue — configured policy" tone="warning" />}</p>
                  {visit.status === 'scheduled' && has('evc.complete') && <Button className="mt-2" variant="secondary" disabled={visit.visitDate > result.asOfDate} loading={action.busy} onClick={() => user && void action.run(() => services.evc.completeVisit(user, visit.id), 'Visit completed and the next workflow stage activated.')}>Mark visit completed</Button>}
                  {app && <p className="text-xs text-neutral-600">Workflow transition is recorded for {app.id}.</p>}
                </li>;
              })}</ul> : <EmptyState title="No EVC visits have been scheduled." />}
            </Panel>
            <Panel title="EVC and escalation history">
              {result.audit.length ? <ul className="space-y-2">{result.audit.map((event) => <li key={event.id} className="border-b border-neutral-200 pb-2 text-sm"><strong>{event.action}</strong> · {event.applicationId ?? event.relatedRecord ?? '—'} · {event.actorName} · {event.timestamp}</li>)}</ul> : <p className="text-sm text-neutral-700">No EVC or escalation events recorded in this scope.</p>}
            </Panel>
          </>
        )}
      </QueryState>
    </ModuleFrame>
  );
}

function visitDateOverdue(visitDate: string, days: number, asOfDate: string): boolean {
  const visit = Date.parse(`${visitDate}T00:00:00Z`);
  const asOf = Date.parse(`${asOfDate}T00:00:00Z`);
  return Number.isFinite(visit) && (asOf - visit) / 86_400_000 > days;
}

function dayDistance(from: string, to: string): number {
  const day = 86_400_000;
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / day);
}

function EvidenceActions({ undertakingId, evidenceId }: { undertakingId: string; evidenceId: string }) {
  const { user, has } = useAuth();
  const action = useAction();
  const [note, setNote] = useState('');
  if (!has('compliance.verify')) return null;
  return <div className="mt-2 flex flex-wrap items-end gap-2">
    <FormField id={`evidence-note-${evidenceId}`} label="Reviewer note"><input id={`evidence-note-${evidenceId}`} className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
    <Button variant="secondary" loading={action.busy} onClick={() => user && void action.run(() => services.compliance.reviewEvidence(user, evidenceId, 'verify', note), `Evidence for ${undertakingId} verified.`)}>Verify</Button>
    <Button variant="secondary" loading={action.busy} onClick={() => user && void action.run(() => services.compliance.reviewEvidence(user, evidenceId, 'clarify', note), 'Clarification requested.')}>Request clarification</Button>
    <Feedback error={action.error} success={action.success} />
  </div>;
}

export function CompliancePage() {
  const { undertakingId } = useParams();
  return undertakingId ? <ComplianceDetailPage undertakingId={undertakingId} /> : <ComplianceRegisterPage />;
}

function ComplianceRegisterPage() {
  const { user, has } = useAuth();
  const query = useQuery({ queryKey: ['compliance-list', user?.id], queryFn: () => user ? services.compliance.list(user) : Promise.resolve([]) });
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const action = useAction();
  const submit = (event: FormEvent, id: string) => {
    event.preventDefault();
    if (!user) return;
    const parsed = fileNameSchema.safeParse(evidence[id] ?? '');
    if (!parsed.success) {
      action.setError(parsed.error.issues[0]?.message ?? 'Enter a PDF file name.');
      return;
    }
    void action.run(() => services.compliance.submitEvidence(user, id, parsed.data), 'Evidence file name recorded.');
  };
  return (
    <ModuleFrame title="Compliance and Undertakings" description="Institution-wise undertaking register, evidence history and reviewer verification queue.">
      <Feedback error={action.error} success={action.success} />
      <QueryState query={query}>
        {(items) => items.length ? <div className="space-y-3">{items.map((item) => {
          const latest = item.evidence[item.evidence.length - 1];
          return <Panel key={item.id} title={`${item.institutionName} — ${item.condition}`}>
            <p className="text-sm">Due date: {item.dueDate} · <Link className="underline text-navy-700" to={`/compliance/${item.id}`}>Open undertaking details</Link></p>
            <p className="mt-1 text-sm">Latest evidence: {latest ? `${latest.fileName} — ${latest.status.replace(/_/g, ' ')}` : 'None submitted'}</p>
            {has('compliance.submit_evidence') && (
              <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(event) => submit(event, item.id)}>
                <FormField id={`evidence-file-${item.id}`} label="Evidence file name" hint="PDF file names only; no file content is stored.">
                  <input id={`evidence-file-${item.id}`} className={inputClass} value={evidence[item.id] ?? ''} onChange={(e) => setEvidence((state) => ({ ...state, [item.id]: e.target.value }))} />
                </FormField>
                <Button type="submit" loading={action.busy}>Record evidence</Button>
              </form>
            )}
            {item.evidence.filter((record) => record.status === 'awaiting_verification').map((record) => <EvidenceActions key={record.id} undertakingId={item.id} evidenceId={record.id} />)}
          </Panel>;
        })}</div> : <EmptyState title="No undertakings are available in this scope." />}
      </QueryState>
    </ModuleFrame>
  );
}

function ComplianceDetailPage({ undertakingId }: { undertakingId: string }) {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ['compliance-detail', user?.id, undertakingId], queryFn: () => user ? services.compliance.get(user, undertakingId) : Promise.reject(new Error('Sign in is required.')) });
  return (
    <ModuleFrame title={`Undertaking ${undertakingId}`} description="Evidence history and current verification state.">
      <QueryState query={query}>
        {(item) => <Panel title={item.condition}>
          <p>Institution: {item.institutionName} · Due date: {item.dueDate}</p>
          {item.evidence.length ? <div className="mt-3 overflow-x-auto"><table className="min-w-[600px] w-full text-left text-sm">
            <thead className="bg-neutral-100"><tr>{['File name', 'Submitted', 'Status', 'Reviewer note'].map((heading) => <th scope="col" key={heading} className="p-2">{heading}</th>)}</tr></thead>
            <tbody>{item.evidence.map((record) => <tr key={record.id} className="border-t"><td className="p-2">{record.fileName}</td><td className="p-2">{record.submittedOn}</td><td className="p-2">{record.status.replace(/_/g, ' ')}</td><td className="p-2">{record.reviewerNote ?? '—'}</td></tr>)}</tbody>
          </table></div> : <EmptyState title="No evidence has been submitted." />}
        </Panel>}
      </QueryState>
    </ModuleFrame>
  );
}

const VALIDITY_INFO: Record<DocumentValidity, { label: string; tone: 'success' | 'warning' | 'danger' | 'info' }> = {
  valid: { label: 'Valid', tone: 'success' },
  approaching_expiry: { label: 'Approaching expiry', tone: 'warning' },
  expired: { label: 'Expired', tone: 'danger' },
  awaiting_verification: { label: 'Awaiting verification', tone: 'info' },
};

export function DocumentsPage() {
  const { user, has } = useAuth();
  const action = useAction();
  const query = useQuery({ queryKey: ['documents-list', user?.id], queryFn: () => user ? services.documents.list(user) : Promise.resolve([]) });
  const [names, setNames] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<DocumentValidity | 'all'>('all');
  const submitRenewal = (event: FormEvent, id: string) => {
    event.preventDefault();
    if (!user) return;
    const parsed = fileNameSchema.safeParse(names[id] ?? '');
    if (!parsed.success) {
      action.setError(parsed.error.issues[0]?.message ?? 'Enter a PDF file name.');
      return;
    }
    void action.run(() => services.documents.submitRenewal(user, id, parsed.data), 'Renewal file name submitted for reviewer verification.');
  };
  const items = (query.data ?? []).filter((item) => filter === 'all' || item.validity === filter);
  return (
    <ModuleFrame title="Document Validity" description="Document register, calculated validity, renewals, reminders and escalation history.">
      <div className="flex flex-wrap gap-3">
        <FormField id="document-validity-filter" label="Validity status">
          <select id="document-validity-filter" className={statusClass} value={filter} onChange={(e) => setFilter(e.target.value as DocumentValidity | 'all')}>
            <option value="all">All statuses</option>{Object.entries(VALIDITY_INFO).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
          </select>
        </FormField>
      </div>
      <Feedback error={action.error} success={action.success} />
      <QueryState query={query}>
        {() => items.length ? <div className="space-y-3">{items.map((document) => {
          const latest = document.renewals[document.renewals.length - 1];
          return <Panel key={document.id} title={`${document.institutionName} — ${document.type}`}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <StatusChip label={VALIDITY_INFO[document.validity].label} tone={VALIDITY_INFO[document.validity].tone} />
              <span>Submitted {document.submittedOn}</span><span>Issued {document.issueDate}</span><span>Expires {document.expiryDate}</span>
            </div>
            {has('renewal.submit') && <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(event) => submitRenewal(event, document.id)}>
              <FormField id={`renewal-${document.id}`} label="Renewal file name" hint="Enter the file name of the renewal document.">
                <input id={`renewal-${document.id}`} className={inputClass} value={names[document.id] ?? ''} onChange={(e) => setNames((state) => ({ ...state, [document.id]: e.target.value }))} />
              </FormField>
              <Button type="submit" loading={action.busy}>Submit renewal</Button>
            </form>}
            {latest && <p className="mt-2 text-sm">Latest renewal: {latest.fileName} · {latest.status.replace(/_/g, ' ')}{latest.reviewerNote ? ` · ${latest.reviewerNote}` : ''}</p>}
            {has('document.verify') && document.renewals.filter((renewal) => renewal.status === 'awaiting_verification').map((renewal) => (
              <div key={renewal.id} className="mt-2 flex flex-wrap items-end gap-2">
                <FormField id={`renewal-note-${renewal.id}`} label="Reviewer note">
                  <input id={`renewal-note-${renewal.id}`} className={inputClass} value={notes[renewal.id] ?? ''} onChange={(e) => setNotes((state) => ({ ...state, [renewal.id]: e.target.value }))} />
                </FormField>
                <Button variant="secondary" loading={action.busy} onClick={() => user && void action.run(() => services.documents.reviewRenewal(user, renewal.id, 'verify', notes[renewal.id] ?? ''), 'Renewal verified.')}>Verify renewal</Button>
                <Button variant="secondary" loading={action.busy} onClick={() => user && void action.run(() => services.documents.reviewRenewal(user, renewal.id, 'clarify', notes[renewal.id] ?? ''), 'Clarification requested for renewal.')}>Request clarification</Button>
              </div>
            ))}
            <details className="mt-3"><summary className="cursor-pointer font-medium">Reminder and escalation history</summary>
              {document.reminders.length ? <ul className="mt-2 list-disc pl-5 text-sm">{document.reminders.map((item) => <li key={item.id}>{item.date} · {item.kind} · {item.message}</li>)}</ul> : <p className="mt-2 text-sm">No reminder or escalation history is recorded.</p>}
            </details>
          </Panel>;
        })}</div> : <EmptyState title="No documents match this validity filter." />}
      </QueryState>
    </ModuleFrame>
  );
}

const ALERT_CATEGORY: Record<DemoAlert['category'], string> = {
  application_overdue: 'Application overdue',
  evc_overdue: 'EVC scheduling',
  undertaking_due: 'Undertaking due',
  document_expiry: 'Document expiry',
  escalation: 'Escalation',
};

export function AlertsPage() {
  const { user, has } = useAuth();
  const action = useAction();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const query = useQuery({ queryKey: ['alerts', user?.id], queryFn: () => user ? services.notifications.list(user) : Promise.resolve([]) });
  return (
    <ModuleFrame title="Alerts and Escalations" description="Evaluate configured rules to generate alerts. Rules are not evaluated automatically in the background.">
      <div className="flex flex-wrap items-center gap-3">
        {has('alerts.evaluate') && <Button loading={action.busy} onClick={() => user && void action.run(() => services.notifications.evaluate(user), 'Alert rules evaluated.')}>Evaluate alerts</Button>}
        <p className="text-sm text-neutral-700">System Administrator action · no automatic background escalation.</p>
      </div>
      <Feedback error={action.error} success={action.success} />
      <QueryState query={query}>
        {(alerts) => alerts.length ? <div className="space-y-3">{alerts.map((alert) => <AlertCard key={alert.id} alert={alert} note={notes[alert.id] ?? ''} setNote={(value) => setNotes((state) => ({ ...state, [alert.id]: value }))} busy={action.busy} onAction={(status) => user && void action.run(() => services.notifications.updateStatus(user, alert.id, status, notes[alert.id] ?? ''), `Alert ${status}.`)} canManage={has('alerts.manage')} />)}</div> : <EmptyState title="No alerts are recorded. Evaluate the rules to generate eligible alerts." />}
      </QueryState>
    </ModuleFrame>
  );
}

function AlertCard({
  alert,
  note,
  setNote,
  busy,
  onAction,
  canManage,
}: {
  alert: DemoAlert;
  note: string;
  setNote: (value: string) => void;
  busy: boolean;
  onAction: (status: 'acknowledged' | 'resolved' | 'escalated') => void;
  canManage: boolean;
}) {
  const tone = alert.severity === 'high' ? 'danger' : alert.severity === 'medium' ? 'warning' : 'info';
  return <Panel title={alert.title}>
    <div className="flex flex-wrap gap-2 text-sm"><StatusChip label={`${alert.severity} severity`} tone={tone} /><StatusChip label={alert.status} tone={alert.status === 'resolved' ? 'success' : alert.status === 'escalated' ? 'danger' : 'info'} /><span>{ALERT_CATEGORY[alert.category]}</span><span>Responsible party: {alert.responsibleParty}</span><span>Deadline: {alert.deadline}</span></div>
    {canManage && alert.status !== 'resolved' && <div className="mt-3 flex flex-wrap items-end gap-2">
      <FormField id={`alert-note-${alert.id}`} label="Action note" hint="At least 3 characters are required."><input id={`alert-note-${alert.id}`} className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
      {alert.status === 'open' && <Button variant="secondary" loading={busy} onClick={() => onAction('acknowledged')}>Acknowledge</Button>}
      <Button variant="secondary" loading={busy} onClick={() => onAction('resolved')}>Resolve</Button>
      {alert.status !== 'escalated' && <Button variant="secondary" loading={busy} onClick={() => onAction('escalated')}>Escalate</Button>}
    </div>}
    <details className="mt-3"><summary className="cursor-pointer font-medium">Event history ({alert.events.length})</summary><ol className="mt-2 list-decimal pl-5 text-sm">{alert.events.map((event) => <li key={event.id}>{event.date} · {event.action} · {event.actorName}{event.note ? ` · ${event.note}` : ''}</li>)}</ol></details>
  </Panel>;
}

const REPORT_OPTIONS: { kind: ReportKind; label: string }[] = [
  { kind: 'application_pendency', label: 'Application pendency' },
  { kind: 'stage_processing', label: 'Stage-wise processing' },
  { kind: 'region_performance', label: 'Region performance' },
  { kind: 'evc', label: 'EVC scheduling and completion' },
  { kind: 'undertakings', label: 'Undertaking compliance' },
  { kind: 'document_expiry', label: 'Document expiry' },
  { kind: 'escalations', label: 'Escalations' },
  { kind: 'workload', label: 'Workload distribution' },
];

export function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(rows: ReportRow[], name: string) {
  const headers = rows.length ? Object.keys(rows[0]) : ['No report columns'];
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${name}-report.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ReportsPage() {
  const { user, has } = useAuth();
  const [kind, setKind] = useState<ReportKind>('application_pendency');
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['report', user?.id, kind], queryFn: () => user ? services.reports.list(user, kind) : Promise.resolve([]) });
  const rows = useMemo(() => (query.data ?? []).filter((row) => !search || Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(search.toLowerCase()))), [query.data, search]);
  return (
    <ModuleFrame title="Reports" description="Filter the current report and export records as a CSV file.">
      {!has('reports.export') && <PermissionDenied message="Your role cannot access these reports." />}
      <div className="flex flex-wrap items-end gap-3">
        <FormField id="report-type" label="Report">
          <select id="report-type" className={statusClass} value={kind} onChange={(e) => setKind(e.target.value as ReportKind)}>{REPORT_OPTIONS.map((item) => <option key={item.kind} value={item.kind}>{item.label}</option>)}</select>
        </FormField>
        <FormField id="report-search" label="Filter current data">
          <input id="report-search" className={statusClass} value={search} onChange={(e) => setSearch(e.target.value)} />
        </FormField>
        <Button variant="secondary" disabled={!has('reports.export') || query.isPending} onClick={() => downloadCsv(rows, kind)}>Export filtered CSV</Button>
      </div>
      <p className="text-sm text-neutral-700">{rows.length} row(s) after filtering.</p>
      <QueryState query={query}>
        {(reportRows) => reportRows.length ? <div className="overflow-x-auto rounded border border-neutral-300 bg-white"><table className="min-w-[600px] w-full text-left text-sm">
          <caption className="p-3 text-left font-semibold">{REPORT_OPTIONS.find((item) => item.kind === kind)?.label}</caption>
          <thead className="bg-neutral-100"><tr>{Object.keys(reportRows[0]).map((header) => <th key={header} scope="col" className="p-2">{header}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => <tr key={index} className="border-t">{Object.keys(reportRows[0]).map((header) => <td key={header} className="p-2">{row[header] ?? '—'}</td>)}</tr>)}</tbody>
        </table></div> : <EmptyState title="No report rows match the current filter." />}
      </QueryState>
    </ModuleFrame>
  );
}

export function AuditPage() {
  const { user, has } = useAuth();
  const [filters, setFilters] = useState<AuditFilters>({});
  const query = useQuery({
    queryKey: ['audit-global', user?.id, filters],
    queryFn: () => user ? services.audit.listGlobal(user, filters) : Promise.resolve([]),
    enabled: has('audit.view'),
  });
  const update = <K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) => setFilters((current) => ({ ...current, [key]: value }));
  if (!has('audit.view')) return <PermissionDenied message="Your role cannot view the global audit trail." />;
  return (
    <ModuleFrame title="Audit Trail" description="Global role-scoped event history. Activity history in this browser is not tamper-evident.">
      <Panel title="Filters">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <FormField id="audit-app" label="Application ID"><input id="audit-app" className={inputClass} value={filters.applicationId ?? ''} onChange={(e) => update('applicationId', e.target.value)} /></FormField>
          <FormField id="audit-action" label="Action"><input id="audit-action" className={inputClass} value={filters.action ?? ''} onChange={(e) => update('action', e.target.value)} /></FormField>
          <FormField id="audit-actor" label="Actor"><input id="audit-actor" className={inputClass} value={filters.actorId ?? ''} onChange={(e) => update('actorId', e.target.value)} /></FormField>
          <FormField id="audit-from" label="From date"><input id="audit-from" type="date" className={inputClass} value={filters.fromDate ?? ''} onChange={(e) => update('fromDate', e.target.value)} /></FormField>
          <FormField id="audit-to" label="To date"><input id="audit-to" type="date" className={inputClass} value={filters.toDate ?? ''} onChange={(e) => update('toDate', e.target.value)} /></FormField>
        </div>
      </Panel>
      <QueryState query={query}>
        {(events) => events.length ? <div className="overflow-x-auto rounded border border-neutral-300 bg-white"><table className="min-w-[760px] w-full text-left text-sm">
          <caption className="p-3 text-left font-semibold">Global audit events, newest first</caption>
          <thead className="bg-neutral-100"><tr>{['Date', 'Application', 'Action', 'Actor', 'Role', 'Previous status', 'New status', 'Reason'].map((h) => <th key={h} scope="col" className="p-2">{h}</th>)}</tr></thead>
          <tbody>{events.map((event) => <tr key={event.id} className="border-t"><td className="p-2">{event.timestamp}</td><td className="p-2">{event.applicationId ?? '—'}</td><td className="p-2">{event.action}</td><td className="p-2">{event.actorName}</td><td className="p-2">{event.actorRole}</td><td className="p-2">{event.previousStatus ?? '—'}</td><td className="p-2">{event.newStatus ?? '—'}</td><td className="p-2">{event.reason ?? '—'}</td></tr>)}</tbody>
        </table></div> : <EmptyState title="No audit events match the current filters." />}
      </QueryState>
    </ModuleFrame>
  );
}

const POLICY_LABELS: Record<keyof DemoPolicy, string> = {
  overdueThresholdDays: 'Overdue threshold (days)',
  escalationThresholdDays: 'Escalation threshold (days)',
  queryResponseWindowDays: 'Query response window (days)',
  evcVisitDeadlineDays: 'EVC scheduling window (days)',
  documentApproachingExpiryDays: 'Document approaching-expiry window (days)',
};

export function AdminPage() {
  const { user, has } = useAuth();
  const action = useAction();
  const query = useQuery({
    queryKey: ['admin-configuration', user?.id],
    queryFn: () => user ? services.admin.getConfiguration(user) : Promise.reject(new Error('Sign in is required.')),
    enabled: has('admin.configure_workflow'),
  });
  const [policy, setPolicy] = useState<DemoPolicy>({ ...DEMO_POLICY });
  const [enabled, setEnabled] = useState<Record<WorkflowKind, boolean>>({
    scrutiny_only: true, scrutiny_evc: true, evc_sac_shc: true, evc_only: true,
  });
  const [stageEnabled, setStageEnabled] = useState<AdminConfiguration['workflowStagesEnabled']>({
    scrutiny_only: { scrutiny: true, decision: true },
    scrutiny_evc: { scrutiny: true, evc: true, decision: true },
    evc_sac_shc: { evc: true, sac_shc: true, decision: true },
    evc_only: { evc: true, decision: true },
  });
  const [formError, setFormError] = useState('');
  useEffect(() => {
    if (query.data) {
      setPolicy(query.data.policy);
      setEnabled(query.data.workflowEnabled);
      setStageEnabled(query.data.workflowStagesEnabled);
    }
  }, [query.data]);
  if (!has('admin.configure_workflow')) return <PermissionDenied message="Administration is restricted to System Administrators with admin.configure_workflow." />;
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    const parsed = policySchema.safeParse(policy);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Check all policy values.');
      return;
    }
    const invalidWorkflow = WORKFLOW_KINDS.find((kind) =>
      enabled[kind] && !WORKFLOW_TEMPLATES[kind].stages.some((stage) => stageEnabled[kind][stage.key]),
    );
    if (invalidWorkflow) {
      setFormError(`Enable at least one stage in ${WORKFLOW_TEMPLATES[invalidWorkflow].label}.`);
      return;
    }
    setFormError('');
    const configuration: AdminConfiguration = {
      policy: parsed.data,
      workflowEnabled: enabled,
      workflowStagesEnabled: stageEnabled,
    };
    void action.run(() => services.admin.updateConfiguration(user, configuration), 'Configuration saved and recorded in the audit trail.');
  };
  return (
    <ModuleFrame title="Administration" description="Manage workflow stage availability and processing policy values.">
      <Feedback error={formError || action.error} success={action.success} />
      <QueryState query={query}>
        {() => <form onSubmit={save} className="space-y-4">
          <Panel title="Workflow templates">
            <div className="grid gap-3 sm:grid-cols-2">{WORKFLOW_KINDS.map((kind) => <fieldset key={kind} className="rounded border border-neutral-300 p-3">
              <legend className="font-semibold">{WORKFLOW_TEMPLATES[kind].label}</legend>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={enabled[kind]} onChange={(e) => setEnabled((current) => ({ ...current, [kind]: e.target.checked }))} />
                <span>Enable this template — {WORKFLOW_TEMPLATES[kind].description}</span>
              </label>
              <div className="mt-2 space-y-1">
                {WORKFLOW_TEMPLATES[kind].stages.map((stage) => <label key={stage.key} className="flex items-center gap-2 pl-4 text-sm">
                  <input type="checkbox" disabled={!enabled[kind]} checked={stageEnabled[kind][stage.key] ?? false} onChange={(e) => setStageEnabled((current) => ({ ...current, [kind]: { ...current[kind], [stage.key]: e.target.checked } }))} />
                  <span>Include {stage.label} stage</span>
                </label>)}
              </div>
            </fieldset>)}</div>
          </Panel>
          <Panel title="Policy values (days)">
            <div className="grid gap-3 sm:grid-cols-2">{(Object.keys(POLICY_LABELS) as (keyof DemoPolicy)[]).map((key) => <FormField key={key} id={`policy-${key}`} label={POLICY_LABELS[key]}>
              <input id={`policy-${key}`} type="number" min={0} max={3650} className={inputClass} value={policy[key]} onChange={(e) => setPolicy((current) => ({ ...current, [key]: Number(e.target.value) }))} />
            </FormField>)}</div>
          </Panel>
          <Button type="submit" loading={action.busy}>Save configuration</Button>
        </form>}
      </QueryState>
    </ModuleFrame>
  );
}

const AI_ACTIONS: { value: AiAction; label: string }[] = [
  { value: 'summarise_application', label: 'Summarise an application' },
  { value: 'explain_deficiencies', label: 'Explain recorded deficiencies' },
  { value: 'missing_information', label: 'Highlight possible missing information' },
  { value: 'draft_communication', label: 'Draft an administrative communication' },
  { value: 'procedural_question', label: 'Answer a procedural question' },
];

export function AiPage() {
  const { user, has } = useAuth();
  const [actionName, setActionName] = useState<AiAction>('summarise_application');
  const [applicationId, setApplicationId] = useState('');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [response, setResponse] = useState<Awaited<ReturnType<typeof services.ai.respond>> | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const applications = useQuery({ queryKey: ['ai-applications', user?.id], queryFn: () => user ? services.applications.list(user) : Promise.resolve([]), enabled: has('ai.use') });
  if (!has('ai.use')) return <PermissionDenied message="Your role does not have the ai.use capability." />;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setError('');
    setResponse(null);
    setReviewed(false);
    setBusy(true);
    try {
      const result = await services.ai.respond(user, actionName, input, applicationId || undefined);
      setResponse(result);
    } catch (reason) {
      setError(describeError(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ModuleFrame title="AI Assistance" description="Review application records, identify possible missing information and prepare administrative drafts.">
      <p role="note" className="rounded border border-saffron-500 bg-saffron-50 p-3 text-sm text-neutral-800">
        AI assistance may be incomplete or inaccurate and is not a verified regulatory finding. A human must review all output before use.
      </p>
      <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded border border-neutral-300 bg-white p-4">
        <FormField id="ai-task" label="Assistance function"><select id="ai-task" className={inputClass} value={actionName} onChange={(e) => setActionName(e.target.value as AiAction)}>{AI_ACTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></FormField>
        <FormField id="ai-app" label="Application (optional)"><select id="ai-app" className={inputClass} value={applicationId} onChange={(e) => setApplicationId(e.target.value)}><option value="">No application selected</option>{(applications.data ?? []).map((app) => <option key={app.id} value={app.id}>{app.id} — {app.programme}</option>)}</select></FormField>
        <FormField id="ai-input" label="Question or context"><textarea id="ai-input" className={inputClass} rows={4} value={input} onChange={(e) => setInput(e.target.value)} minLength={3} /></FormField>
        <Button type="submit" loading={busy}>Generate response</Button>
      </form>
      <Feedback error={error} success="" />
      {response && <section aria-labelledby="ai-output-title" className="rounded border-2 border-saffron-600 bg-saffron-50 p-4">
        <h2 id="ai-output-title" className="font-semibold text-navy-800">AI-generated response — requires human review</h2>
        <p className="mt-2 text-sm font-medium">Uncertainty: {response.uncertainty}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm">{response.text}</p>
        <h3 className="mt-3 text-sm font-semibold">Source references</h3>
        {response.sourceReferences.length ? <ul className="list-disc pl-5 text-sm">{response.sourceReferences.map((source) => <li key={source}>{source}</li>)}</ul> : <p className="text-sm">No source references were provided.</p>}
        <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />I have reviewed this output against the underlying record and authoritative materials; I understand it is not a verified finding.</label>
      </section>}
    </ModuleFrame>
  );
}
