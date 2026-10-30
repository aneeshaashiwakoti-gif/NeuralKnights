import { ServiceError } from '../errors';
import type { ServiceSet } from '../types';

/**
 * REST ADAPTER — NOT IMPLEMENTED.
 *
 * This file exists so the service boundary is explicit. Every method fails with
 * NOT_IMPLEMENTED. No endpoint paths, request bodies or response shapes are defined here,
 * because none have been verified against the existing Express backend.
 *
 * To implement: replace each method with calls through `createHttpClient` once the backend
 * contract in INTEGRATION.md is confirmed. Map server errors onto `ServiceErrorCode`.
 */
function notImplemented(method: string): never {
  throw new ServiceError(
    'NOT_IMPLEMENTED',
    'The service is temporarily unavailable.',
    `REST adapter method not implemented: ${method}`,
  );
}

export function createRestServices(): ServiceSet {
  return {
    auth: {
      listDemoUsers: async () => notImplemented('auth.listDemoUsers'),
      findDemoUser: () => notImplemented('auth.findDemoUser'),
      authenticate: async () => notImplemented('auth.authenticate'),
    },
    applications: {
      list: async () => notImplemented('applications.list'),
      getDetail: async () => notImplemented('applications.getDetail'),
      submit: async () => notImplemented('applications.submit'),
      uploadChecklistItem: async () => notImplemented('applications.uploadChecklistItem'),
      verifyChecklistItem: async () => notImplemented('applications.verifyChecklistItem'),
      recordObservation: async () => notImplemented('applications.recordObservation'),
      raiseQuery: async () => notImplemented('applications.raiseQuery'),
      respondToQuery: async () => notImplemented('applications.respondToQuery'),
      reviewQueryResponse: async () => notImplemented('applications.reviewQueryResponse'),
      completeCurrentStage: async () => notImplemented('applications.completeCurrentStage'),
    },
    workflow: {
      listTemplates: () => notImplemented('workflow.listTemplates'),
      getTemplate: () => notImplemented('workflow.getTemplate'),
      listApplications: async () => notImplemented('workflow.listApplications'),
    },
    dashboard: { getSummary: async () => notImplemented('dashboard.getSummary') },
    audit: {
      listForApplication: async () => notImplemented('audit.listForApplication'),
      listGlobal: async () => notImplemented('audit.listGlobal'),
    },
    evc: {
      listQueue: async () => notImplemented('evc.listQueue'),
      listVisits: async () => notImplemented('evc.listVisits'),
      getPolicy: async () => notImplemented('evc.getPolicy'),
      schedule: async () => notImplemented('evc.schedule'),
      completeVisit: async () => notImplemented('evc.completeVisit'),
    },
    compliance: {
      list: async () => notImplemented('compliance.list'),
      get: async () => notImplemented('compliance.get'),
      submitEvidence: async () => notImplemented('compliance.submitEvidence'),
      reviewEvidence: async () => notImplemented('compliance.reviewEvidence'),
    },
    documents: {
      list: async () => notImplemented('documents.list'),
      submitRenewal: async () => notImplemented('documents.submitRenewal'),
      reviewRenewal: async () => notImplemented('documents.reviewRenewal'),
    },
    notifications: {
      list: async () => notImplemented('notifications.list'),
      evaluate: async () => notImplemented('notifications.evaluate'),
      updateStatus: async () => notImplemented('notifications.updateStatus'),
    },
    reports: { list: async () => notImplemented('reports.list') },
    admin: {
      getConfiguration: async () => notImplemented('admin.getConfiguration'),
      updateConfiguration: async () => notImplemented('admin.updateConfiguration'),
    },
    ai: { respond: async () => notImplemented('ai.respond') },
  };
}
