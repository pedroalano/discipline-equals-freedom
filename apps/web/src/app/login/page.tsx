'use client';

import { useState, type FormEvent } from 'react';
import { requestMagicLinkSchema } from '@zenfocus/types';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const parsed = requestMagicLinkSchema.safeParse({
      email: formData.get('email'),
    });

    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Invalid email');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/magic-link/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? 'Could not send sign-in link');
        return;
      }

      setSentEmail(parsed.data.email);
      setSent(true);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-3xl font-light tracking-widest text-neutral-100">
          ZenFocus
        </h1>

        {sent ? (
          <div className="space-y-4 text-center">
            <p className="rounded bg-emerald-900/40 px-4 py-3 text-sm text-emerald-200">
              Check your inbox. We sent a sign-in link to{' '}
              <span className="font-medium">{sentEmail}</span>. The link expires in 15 minutes.
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setSentEmail('');
              }}
              className="text-sm text-neutral-400 hover:text-neutral-200"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {error && (
              <p className="rounded bg-red-900/40 px-4 py-2 text-sm text-red-300">{error}</p>
            )}

            <div>
              <label htmlFor="email" className="mb-1 block text-sm text-neutral-400">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-neutral-100 py-2 font-medium text-neutral-900 transition hover:bg-white disabled:opacity-50"
            >
              {loading ? 'Sending link…' : 'Send sign-in link'}
            </button>

            <p className="text-center text-xs text-neutral-500">
              No password needed. We&apos;ll email you a one-time sign-in link.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
