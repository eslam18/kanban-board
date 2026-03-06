import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

async function readResponseError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    if (typeof payload?.error === 'string' && payload.error.trim() !== '') {
      return payload.error;
    }
  } catch {
    // ignore parse errors and use fallback message
  }

  return `Registration failed (${response.status})`;
}

export default function RegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const inviteToken = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get('token') || '').trim();
  }, [location.search]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!inviteToken) {
      setError('This invite link is missing a token.');
      return;
    }

    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: inviteToken,
          password,
          display_name: displayName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response));
      }

      navigate('/login', {
        replace: true,
        state: {
          notice: 'Account created successfully. Please sign in.',
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-700/80 bg-gray-900/95 p-6 shadow-2xl shadow-black/50">
        <h1 className="mb-1 text-2xl font-semibold text-gray-100">Create account</h1>
        <p className="mb-5 text-sm text-gray-400">Set your display name and password to accept the invite.</p>

        {!inviteToken ? (
          <div className="space-y-4">
            <p className="text-sm text-red-300">This invite link is invalid or missing a token.</p>
            <Link
              to="/login"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-700 px-4 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="register-display-name" className="mb-1.5 block text-sm font-medium text-gray-200">
                Display name
              </label>
              <input
                id="register-display-name"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/40"
                placeholder="Your name"
                required
              />
            </div>

            <div>
              <label htmlFor="register-password" className="mb-1.5 block text-sm font-medium text-gray-200">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/40"
                autoComplete="new-password"
                required
              />
            </div>

            <div>
              <label htmlFor="register-confirm-password" className="mb-1.5 block text-sm font-medium text-gray-200">
                Confirm password
              </label>
              <input
                id="register-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/40"
                autoComplete="new-password"
                required
              />
            </div>

            {error ? <p className="text-sm text-red-300">{error}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className="h-11 w-full rounded-lg border border-gray-200 bg-gray-100 px-4 text-sm font-semibold text-gray-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
