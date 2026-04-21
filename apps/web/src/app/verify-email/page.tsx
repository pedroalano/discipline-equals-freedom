'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>(
    token ? 'verifying' : 'idle',
  );
  const [message, setMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!token || verifiedRef.current) return;
    verifiedRef.current = true;

    const controller = new AbortController();

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = (await res.json()) as { message?: string };
        if (res.ok) {
          setStatus('success');
          setMessage(data.message ?? 'Email verified successfully');
          setTimeout(() => {
            router.push('/');
            router.refresh();
          }, 2000);
        } else {
          setStatus('error');
          setMessage(data.message ?? 'Verification failed');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setStatus('error');
          setMessage('Network error — please try again');
        }
      });

    return () => controller.abort();
  }, [token, router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  async function handleResend() {
    setResendCooldown(60);
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      const data = (await res.json()) as { message?: string };
      setMessage(data.message ?? 'Verification email sent');
    } catch {
      setMessage('Failed to resend — please try again');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-8 text-3xl font-light tracking-widest text-neutral-100">ZenFocus</h1>

        {status === 'verifying' && <p className="text-neutral-400">Verifying your email...</p>}

        {status === 'success' && (
          <div>
            <p className="mb-4 rounded bg-green-900/40 px-4 py-2 text-sm text-green-300">
              {message}
            </p>
            <p className="text-sm text-neutral-400">Redirecting to dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <p className="mb-4 rounded bg-red-900/40 px-4 py-2 text-sm text-red-300">{message}</p>
            <button
              onClick={() => void handleResend()}
              disabled={resendCooldown > 0}
              className="w-full rounded bg-neutral-100 py-2 font-medium text-neutral-900 transition hover:bg-white disabled:opacity-50"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification email'}
            </button>
          </div>
        )}

        {status === 'idle' && !token && (
          <div>
            <p className="mb-6 text-neutral-400">
              We sent a verification link to your email. Check your inbox and click the link to
              verify your account.
            </p>
            {message && (
              <p className="mb-4 rounded bg-green-900/40 px-4 py-2 text-sm text-green-300">
                {message}
              </p>
            )}
            <button
              onClick={() => void handleResend()}
              disabled={resendCooldown > 0}
              className="w-full rounded bg-neutral-100 py-2 font-medium text-neutral-900 transition hover:bg-white disabled:opacity-50"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification email'}
            </button>
            <p className="mt-4 text-sm text-neutral-500">
              <Link href="/login" className="text-neutral-300 hover:text-white">
                Back to login
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
