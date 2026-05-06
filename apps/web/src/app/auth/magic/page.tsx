'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function MagicLinkVerifier() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const [error, setError] = useState<string | null>(token ? null : 'Missing sign-in token');

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/auth/magic-link/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (cancelled) return;

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { message?: string };
          setError(data.message ?? 'Sign-in link is invalid or expired');
          return;
        }

        router.replace('/');
        router.refresh();
      } catch {
        if (!cancelled) setError('Network error — please try again');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-8 text-3xl font-light tracking-widest text-neutral-100">ZenFocus</h1>
        {error ? (
          <div className="space-y-4">
            <p className="rounded bg-red-900/40 px-4 py-3 text-sm text-red-300">{error}</p>
            <Link
              href="/login"
              className="inline-block text-sm text-neutral-300 underline hover:text-white"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Signing you in…</p>
        )}
      </div>
    </main>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense fallback={null}>
      <MagicLinkVerifier />
    </Suspense>
  );
}
