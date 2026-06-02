import Link from 'next/link';
import { AuthShell } from '@/components/AuthShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function MagicLinkPage() {
  return (
    <AuthShell>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign-in link expired</CardTitle>
          <CardDescription>This link is no longer valid.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Request a new link</Link>
          </Button>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
