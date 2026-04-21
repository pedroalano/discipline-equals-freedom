'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { forgotPasswordSchema } from '@zenfocus/types';

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const parsed = forgotPasswordSchema.safeParse({
      email: formData.get('email'),
    });

    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Invalid input');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? 'Request failed');
        return;
      }

      setSuccess(true);
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

        {success ? (
          <div className="text-center">
            <p className="mb-4 rounded bg-green-900/40 px-4 py-2 text-sm text-green-300">
              If an account with that email exists, a reset link has been sent. Check your inbox.
            </p>
            <Link href="/login" className="text-sm text-neutral-300 hover:text-white">
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-center text-sm text-neutral-400">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

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
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-neutral-500">
              <Link href="/login" className="text-neutral-300 hover:text-white">
                Back to login
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
