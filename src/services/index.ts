import { mockApplicationService } from './mock/applicationService';
import { mockAuditService, mockAuthService, mockDashboardService, mockWorkflowService } from './mock/otherServices';
import {
  mockAdminService,
  mockAiService,
  mockComplianceService,
  mockDocumentService,
  mockEvcService,
  mockNotificationService,
  mockReportService,
} from './mock/moduleServices';
import { createRestServices } from './rest/restServices';
import type { ServiceSet } from './types';

/**
 * Service composition root. The UI imports `services` only.
 * VITE_DATA_SOURCE=mock (default) uses the in-browser demonstration store.
 * VITE_DATA_SOURCE=rest selects the REST adapter stub, which is NOT implemented yet.
 */
function createServices(source: string | undefined): ServiceSet {
  if (source === 'rest') return createRestServices();
  return {
    auth: mockAuthService,
    applications: mockApplicationService,
    workflow: mockWorkflowService,
    dashboard: mockDashboardService,
    audit: mockAuditService,
    evc: mockEvcService,
    compliance: mockComplianceService,
    documents: mockDocumentService,
    notifications: mockNotificationService,
    reports: mockReportService,
    admin: mockAdminService,
    ai: mockAiService,
  };
}

export const services: ServiceSet = createServices(import.meta.env.VITE_DATA_SOURCE);
export type { ServiceSet };
