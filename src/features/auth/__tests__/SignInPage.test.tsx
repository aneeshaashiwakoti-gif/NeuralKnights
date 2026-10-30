import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../AuthContext';
import { SignInPage } from '../SignInPage';
import { writeDemoSession } from '../../../services/auth/session';

function renderSignIn() {
  return render(
    <MemoryRouter initialEntries={['/sign-in']}>
      <AuthProvider>
        <Routes>
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/overview" element={<h1>Overview access granted</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  sessionStorage.clear();
  writeDemoSession(null);
});

describe('sign-in form', () => {
  it('shows validation errors for malformed email and an empty password', async () => {
    const user = userEvent.setup();
    renderSignIn();

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
  });

  it('rejects an email that has no account', async () => {
    const user = userEvent.setup();
    renderSignIn();

    await user.type(screen.getByLabelText('Email address'), 'unknown@example.edu.in');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
  });

  it('signs in an account with valid form fields', async () => {
    const user = userEvent.setup();
    renderSignIn();

    await user.type(screen.getByLabelText('Email address'), 'ananya.sharma@aravali.edu.in');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Overview access granted' })).toBeInTheDocument();
  });
});
