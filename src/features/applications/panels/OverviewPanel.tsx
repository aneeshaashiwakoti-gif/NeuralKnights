import { APPLICATION_STATUS_LABEL, formatDate, STAGE_STATUS_LABEL, STAGE_STATUS_TONE } from '../../../domain/labels';
import { getNextStageKey, getStageTemplate } from '../../../domain/workflowTemplates';
import { Panel, StatusChip } from '../../../components/ui';
import type { ApplicationDetail } from '../../../services/types';

export function WorkflowTimeline({ detail }: { detail: ApplicationDetail }) {
  const { application, stages } = detail;
  return (
    <ol aria-label="Workflow stages" className="space-y-3">
      {stages.map((stage, i) => {
        const template = getStageTemplate(application.workflow, stage.key);
        const isActive = stage.key === application.currentStageKey;
        return (
          <li key={stage.key} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                stage.status === 'completed'
                  ? 'border-green-700 bg-green-700 text-white'
                  : isActive
                    ? 'border-navy-700 bg-white text-navy-800'
                    : 'border-neutral-400 bg-white text-neutral-600'
              }`}
            >
              {i + 1}
            </span>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-neutral-900">{stage.label}</span>
                <StatusChip label={STAGE_STATUS_LABEL[stage.status]} tone={STAGE_STATUS_TONE[stage.status]} />
                {stage.completedOn && (
                  <span className="text-xs text-neutral-600">Completed {formatDate(stage.completedOn)}</span>
                )}
              </div>
              {template && isActive && (
                <p className="mt-1 text-xs text-neutral-700">
                  Current status: {APPLICATION_STATUS_LABEL[template.activeStatus]}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function OverviewPanel({ detail }: { detail: ApplicationDetail }) {
  const { application: app, institution, responsibleOfficer, workflowTemplate } = detail;
  const nextKey = getNextStageKey(app.workflow, app.currentStageKey);
  const nextStage = nextKey ? getStageTemplate(app.workflow, nextKey) : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Panel title="Application details" id="details-heading">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-neutral-600">Application ID</dt>
              <dd className="font-medium">{app.id}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-neutral-600">Application type</dt>
              <dd>{app.applicationType}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-neutral-600">Institution</dt>
              <dd>{institution.name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-neutral-600">Region and state</dt>
              <dd>
                {institution.region} · {institution.state}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-neutral-600">Submitted</dt>
              <dd>{formatDate(app.submittedOn)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-neutral-600">Last action</dt>
              <dd>{formatDate(app.lastActionOn)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-neutral-600">Responsible officer</dt>
              <dd>{responsibleOfficer ? responsibleOfficer.displayName : 'Not assigned'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-neutral-600">Workflow</dt>
              <dd>{workflowTemplate.label}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Workflow timeline" id="timeline-heading">
          <WorkflowTimeline detail={detail} />
          <div className="mt-4 border-t border-neutral-200 pt-3 text-sm">
            {nextStage ? (
              <p>
                <span className="font-medium">Next prescribed stage in this template:</span> {nextStage.label}
              </p>
            ) : (
              <p className="text-neutral-700">
                No further stage is defined in this workflow. Final decisions rest with the statutory authority.
              </p>
            )}
          </div>
        </Panel>
      </div>

    </div>
  );
}
