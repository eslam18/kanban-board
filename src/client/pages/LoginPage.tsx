import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.tsx';

type LoginLocationState = {
  from?: string;
  notice?: string;
};

export default function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isInitializing, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const state = (location.state ?? {}) as LoginLocationState;
  const destination = useMemo(() => (typeof state.from === 'string' ? state.from : '/'), [state.from]);
  const notice = useMemo(() => (typeof state.notice === 'string' ? state.notice : ''), [state.notice]);

  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isInitializing, navigate]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError('');
      await login(email.trim(), password);
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to sign in';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-700/80 bg-gray-900/95 p-6 shadow-2xl shadow-black/50">
        <h1 className="mb-1 text-2xl font-semibold text-gray-100">Sign in</h1>
        <p className="mb-5 text-sm text-gray-400">Use your workspace account to continue.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-gray-200">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="h-11 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/40"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-gray-200">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              className="h-11 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/40"
              placeholder="Enter your password"
            />
          </div>

          {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-lg border border-gray-200 bg-gray-100 px-4 text-sm font-semibold text-gray-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-400">
          Have an invite link?{' '}
          <Link className="font-medium text-gray-200 underline-offset-2 hover:underline" to="/register">
            Register here
          </Link>
        </div>
      </div>
    </main>
  );
}
