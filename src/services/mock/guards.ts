import { can } from '../../domain/permissions';
import type { Application, Capability, DemoDataset, DemoUser, ScrutinyQuery } from '../../domain/types';
import { ServiceError } from '../errors';

/** Simulated network latency so loading states are visible in the prototype. */
export const MOCK_LATENCY_MS = 120;

export function simulateLatency(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
}

export function requireCapability(actor: DemoUser, capability: Capability): void {
  if (!can(actor, capability)) {
    throw new ServiceError(
      'PERMISSION_DENIED',
      'Your role does not permit this action.',
      `actor ${actor.id} lacks ${capability}`,
    );
  }
}

/**
 * Scope rule: institution admins see their own institution; reviewers see applications in
 * their region; system administrators see everything (view only for workflow actions).
 */
export function canViewApplication(actor: DemoUser, app: Application, institutionRegion: string): boolean {
  if (actor.role === 'system_admin') return true;
  if (actor.role === 'institution_admin') return actor.institutionId === app.institutionId;
  if (actor.role === 'regulatory_reviewer') return actor.region !== null && actor.region === institutionRegion;
  return false;
}

export function requireApplicationAccess(
  actor: DemoUser,
  app: Application,
  institutionRegion: string,
): void {
  if (!canViewApplication(actor, app, institutionRegion)) {
    throw new ServiceError(
      'PERMISSION_DENIED',
      'This application is outside your permitted scope.',
      `actor ${actor.id} outside scope of ${app.id}`,
    );
  }
}

export function findApplicationOrThrow(data: DemoDataset, applicationId: string): Application {
  const app = data.applications.find((a) => a.id === applicationId);
  if (!app) throw new ServiceError('NOT_FOUND', 'Application not found.', applicationId);
  return app;
}

export function findQueryOrThrow(data: DemoDataset, queryId: string): ScrutinyQuery {
  const q = data.queries.find((x) => x.id === queryId);
  if (!q) throw new ServiceError('NOT_FOUND', 'Query not found.', queryId);
  return q;
}

export function institutionRegionOf(data: DemoDataset, institutionId: string): string {
  return data.institutions.find((i) => i.id === institutionId)?.region ?? '';
}

export function invalidTransition(message: string): ServiceError {
  return new ServiceError('INVALID_TRANSITION', message);
}
