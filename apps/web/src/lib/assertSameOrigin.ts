import { NextResponse, type NextRequest } from 'next/server';

function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

export function assertSameOrigin(req: NextRequest): NextResponse | null {
  const fetchSite = req.headers.get('sec-fetch-site');
  if (fetchSite === 'same-origin' || fetchSite === 'none') return null;

  const origin = req.headers.get('origin');
  if (origin === null) return null;

  const originHost = hostOf(origin);
  const requestHost = req.headers.get('host') ?? hostOf(req.nextUrl.toString());
  if (originHost && requestHost && originHost === requestHost) return null;

  return NextResponse.json({ message: 'Cross-origin request rejected' }, { status: 403 });
}
