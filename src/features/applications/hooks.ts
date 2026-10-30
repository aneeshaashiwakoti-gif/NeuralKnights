import { useMutation, useQuery } from '@tanstack/react-query';
import type { DemoUser } from '../../domain/types';
import type { ApplicationFilters, DashboardFilters, RaiseQueryInput, SubmitApplicationInput } from '../../services/types';
import { services } from '../../services';
import { useAuth } from '../auth/AuthContext';

/** Route-level guards guarantee a signed-in user; this narrows the type for hooks. */
export function useRequiredUser(): DemoUser {
  const { user } = useAuth();
  if (!user) throw new Error('useRequiredUser called without a signed-in user');
  return user;
}

export const queryKeys = {
  applications: (actorId: string, filters: ApplicationFilters) => ['applications', actorId, filters] as const,
  applicationDetail: (actorId: string, id: string) => ['application', actorId, id] as const,
  dashboard: (actorId: string, filters: DashboardFilters) => ['dashboard', actorId, filters] as const,
  templates: () => ['workflow-templates'] as const,
};

export function useApplicationList(filters: ApplicationFilters) {
  const user = useRequiredUser();
  return useQuery({
    queryKey: queryKeys.applications(user.id, filters),
    queryFn: () => services.applications.list(user, filters),
  });
}

export function useApplicationDetail(applicationId: string) {
  const user = useRequiredUser();
  return useQuery({
    queryKey: queryKeys.applicationDetail(user.id, applicationId),
    queryFn: () => services.applications.getDetail(user, applicationId),
  });
}

export function useDashboard(filters: DashboardFilters) {
  const user = useRequiredUser();
  return useQuery({
    queryKey: queryKeys.dashboard(user.id, filters),
    queryFn: () => services.dashboard.getSummary(user, filters),
  });
}

export function useWorkflowTemplates() {
  return useQuery({
    queryKey: queryKeys.templates(),
    queryFn: async () => services.workflow.listTemplates(),
    staleTime: Infinity,
  });
}

/**
 * Mutations do not invalidate queries themselves: the store bridge (app/StoreBridge.tsx)
 * refreshes every query whenever the shared demonstration state changes, so all modules agree.
 */
export function useSubmitApplication() {
  const user = useRequiredUser();
  return useMutation({
    mutationFn: (input: SubmitApplicationInput) => services.applications.submit(user, input),
  });
}

export function useApplicationAction<TVars>(fn: (user: DemoUser, vars: TVars) => Promise<unknown>) {
  const user = useRequiredUser();
  return useMutation({
    mutationFn: (vars: TVars) => fn(user, vars),
  });
}

export const applicationActions = {
  uploadChecklistItem: (user: DemoUser, v: { checklistItemId: string; fileName: string }) =>
    services.applications.uploadChecklistItem(user, v.checklistItemId, v.fileName),
  verifyChecklistItem: (user: DemoUser, v: { checklistItemId: string }) =>
    services.applications.verifyChecklistItem(user, v.checklistItemId),
  recordObservation: (user: DemoUser, v: { applicationId: string; text: string }) =>
    services.applications.recordObservation(user, v.applicationId, v.text),
  raiseQuery: (user: DemoUser, v: { applicationId: string } & RaiseQueryInput) =>
    services.applications.raiseQuery(user, v.applicationId, { kind: v.kind, reason: v.reason }),
  respondToQuery: (user: DemoUser, v: { queryId: string; response: string }) =>
    services.applications.respondToQuery(user, v.queryId, v.response),
  reviewQueryResponse: (user: DemoUser, v: { queryId: string; decision: 'accept' | 'reject'; note: string }) =>
    services.applications.reviewQueryResponse(user, v.queryId, v.decision, v.note),
  completeCurrentStage: (user: DemoUser, v: { applicationId: string }) =>
    services.applications.completeCurrentStage(user, v.applicationId),
};
