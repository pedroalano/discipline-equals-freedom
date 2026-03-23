'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerSchema } from '@zenfocus/types';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const parsed = registerSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Invalid input');
      return;
    }

    setLoading(true);
    try {
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!registerRes.ok) {
        const data = (await registerRes.json()) as { message?: string };
        setError(data.message ?? 'Registration failed');
        return;
      }

      // Auto-login after registration
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!loginRes.ok) {
        router.push('/login');
        return;
      }

      router.push('/');
      router.refresh();
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

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {error && <p className="rounded bg-red-900/40 px-4 py-2 text-sm text-red-300">{error}</p>}

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

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-neutral-400">
              Password (8+ characters)
            </label>
            <input
              id="password"
              name="password"
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
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Already have an account?{' '}
          <Link href="/login" className="text-neutral-300 hover:text-white">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
