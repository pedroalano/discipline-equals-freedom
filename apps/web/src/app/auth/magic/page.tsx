'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/AuthShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function MagicLinkVerifier() {
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

        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', '/auth/magic');
        }

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { message?: string };
          setError(data.message ?? 'Sign-in link is invalid or expired');
          return;
        }

        window.location.assign('/');
      } catch {
        if (!cancelled) setError('Network error — please try again');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthShell>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{error ? 'Sign-in failed' : 'Signing you in'}</CardTitle>
          <CardDescription>
            {error ? 'Your link could not be verified.' : 'Verifying your sign-in link…'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <>
              <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Request a new link</Link>
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing you in…</span>
            </div>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense fallback={null}>
      <MagicLinkVerifier />
    </Suspense>
  );
}
