import { beforeEach, describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getState, resetDemoData } from '../../../mock/store';
import { writeDemoSession } from '../../../services/auth/session';
import { AuthProvider } from '../../auth/AuthContext';
import { ApplicationDetailPage } from '../../applications/ApplicationDetailPage';
import { AdminPage, csvEscape, EvcPage } from '../ModulePages';

function renderAs(userId: string, element: React.ReactNode, initialPath = '/') {
  const found = getState().users.find((user) => user.id === userId);
  if (!found) throw new Error(`Missing test user ${userId}.`);
  writeDemoSession(found);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <AuthProvider>
          <Routes>
            <Route path="/applications/:applicationId" element={element} />
            <Route path="*" element={element} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  resetDemoData();
  sessionStorage.clear();
});

describe('Module form and permission interactions', () => {
  it('escapes commas, quotes and line breaks in CSV fields', () => {
    expect(csvEscape('plain field')).toBe('plain field');
    expect(csvEscape('Programme, "Advanced"\nCycle 2')).toBe('"Programme, ""Advanced""\nCycle 2"');
  });

  it('shows EVC validation errors and records a valid visit through the service', async () => {
    const user = userEvent.setup();
    renderAs('u-rev-02', <EvcPage />);

    await user.click(await screen.findByRole('button', { name: 'Schedule visit' }));
    expect(await screen.findByText('Select an application.')).toBeInTheDocument();

    await screen.findByRole('option', { name: /APP-2026-0003/ });
    await user.selectOptions(screen.getByLabelText('Application'), 'APP-2026-0003');
    fireEvent.change(screen.getByLabelText('Visit date'), { target: { value: '2026-10-30' } });
    await user.selectOptions(screen.getByLabelText('Committee members'), 'u-rev-01');
    await user.type(screen.getByLabelText('Venue'), 'Aravali conference centre');
    await user.click(screen.getByRole('button', { name: 'Schedule visit' }));

    expect(await screen.findByText('EVC visit scheduled.')).toBeInTheDocument();
    await waitFor(() => expect(getState().evcVisits).toHaveLength(1));
    expect(getState().applications.find((app) => app.id === 'APP-2026-0003')?.status).toBe('evc_scheduled');
  });

  it('shows the permission-denied state for a role without administration capability', () => {
    renderAs('u-inst-01', <AdminPage />);
    expect(screen.getByText(/restricted to System Administrators/)).toBeInTheDocument();
  });
});

describe('Application tablist keyboard behavior', () => {
  it('supports ArrowRight, Home and End with roving tab focus', async () => {
    const user = userEvent.setup();
    renderAs('u-rev-01', <ApplicationDetailPage />, '/applications/APP-2026-0001');
    const overview = await screen.findByRole('tab', { name: 'Overview' });
    overview.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Documents' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Actions' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });
});
