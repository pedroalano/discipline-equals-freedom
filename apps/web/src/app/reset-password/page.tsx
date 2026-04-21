'use client';

import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { resetPasswordSchema } from '@zenfocus/types';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-8 text-3xl font-light tracking-widest text-neutral-100">ZenFocus</h1>
          <p className="mb-4 rounded bg-red-900/40 px-4 py-2 text-sm text-red-300">
            Invalid or missing reset token.
          </p>
          <Link href="/forgot-password" className="text-sm text-neutral-300 hover:text-white">
            Request a new reset link
          </Link>
        </div>
      </main>
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const parsed = resetPasswordSchema.safeParse({
      token,
      newPassword: formData.get('newPassword'),
      confirmPassword: formData.get('confirmPassword'),
    });

    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Invalid input');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: parsed.data.token, newPassword: parsed.data.newPassword }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? 'Reset failed');
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
              Password reset successfully. You can now sign in with your new password.
            </p>
            <Link
              href="/login"
              className="inline-block w-full rounded bg-neutral-100 py-2 text-center font-medium text-neutral-900 transition hover:bg-white"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {error && (
              <p className="rounded bg-red-900/40 px-4 py-2 text-sm text-red-300">{error}</p>
            )}

            <div>
              <label htmlFor="newPassword" className="mb-1 block text-sm text-neutral-400">
                New password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
              />
              <p className="mt-1 text-xs text-neutral-500">
                8+ characters, uppercase, lowercase, and digit required
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-sm text-neutral-400">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-neutral-100 py-2 font-medium text-neutral-900 transition hover:bg-white disabled:opacity-50"
            >
              {loading ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
