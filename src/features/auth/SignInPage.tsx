import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button, FormField, inputClass } from '../../components/ui';
import { GovernmentUtilityBar, PortalFooter, PortalMasthead } from '../../layout/PortalChrome';
import { useAuth } from './AuthContext';

const signInSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export function SignInPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [signInError, setSignInError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/overview" replace />;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignInError('');
    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      setErrors({
        email: result.error.flatten().fieldErrors.email?.[0],
        password: result.error.flatten().fieldErrors.password?.[0],
      });
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await signIn(result.data.email, result.data.password);
      navigate('/overview', { replace: true });
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <GovernmentUtilityBar />
      <PortalMasthead />
      <nav aria-label="Primary" className="bg-navy-700 text-white">
        <div className="portal-width px-4 py-2">
          <ul><li><Link to="/sign-in" aria-current="page" className="focus-ring rounded bg-white px-2 py-1 text-sm font-medium text-navy-800">Sign in</Link></li></ul>
        </div>
      </nav>
      <main id="main-content" tabIndex={-1} className="portal-width flex-1 px-4 py-8">
        <div className="mx-auto max-w-xl">
          <h1 className="mb-5 text-2xl font-semibold text-navy-800">Sign in to SmartFlow</h1>
          <section className="rounded border border-neutral-300 bg-white p-5 sm:p-6" aria-labelledby="signin-heading">
            <h2 id="signin-heading" className="mb-4 text-lg font-semibold text-navy-800">Authorised user sign-in</h2>
            <form className="space-y-4" onSubmit={(event) => void submit(event)} noValidate>
              <FormField id="signin-email" label="Email address" error={errors.email}>
                <input
                  id="signin-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  className={inputClass}
                  value={email}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'signin-email-error' : undefined}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setErrors((previous) => ({ ...previous, email: undefined }));
                    setSignInError('');
                  }}
                />
              </FormField>
              <FormField id="signin-password" label="Password" error={errors.password}>
                <input
                  id="signin-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className={inputClass}
                  value={password}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'signin-password-error' : undefined}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrors((previous) => ({ ...previous, password: undefined }));
                    setSignInError('');
                  }}
                />
              </FormField>
              {signInError && <p role="alert" className="rounded border border-red-600 bg-red-50 p-3 text-sm text-red-800">{signInError}</p>}
              <Button type="submit" loading={submitting}>Sign in</Button>
            </form>
          </section>
        </div>
      </main>
      <PortalFooter />
    </div>
  );
}
