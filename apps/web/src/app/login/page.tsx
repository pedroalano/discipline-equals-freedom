'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { requestMagicLinkSchema } from '@zenfocus/types';
import { AuthShell } from '@/components/AuthShell';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
    <AuthShell>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>We&apos;ll email you a one-time sign-in link.</CardDescription>
        </CardHeader>

        {sent ? (
          <>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                <p>
                  Check your inbox. We sent a sign-in link to{' '}
                  <span className="font-medium text-foreground">{sentEmail}</span>. The link expires
                  in 15 minutes.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSent(false);
                  setSentEmail('');
                }}
              >
                Use a different email
              </Button>
            </CardFooter>
          </>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)}>
            <CardContent className="space-y-4">
              {error && (
                <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Sending link…' : 'Send sign-in link'}
              </Button>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-muted-foreground">
                No password needed. We&apos;ll email you a one-time sign-in link.
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </AuthShell>
  );
}
