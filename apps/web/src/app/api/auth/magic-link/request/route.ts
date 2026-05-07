import { NextResponse, type NextRequest } from 'next/server';
import { assertSameOrigin } from '@/lib/assertSameOrigin';

const API_URL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';

export async function POST(req: NextRequest) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;
  const body = (await req.json()) as unknown;

  const res = await fetch(`${API_URL}/auth/magic-link/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as unknown;
  return NextResponse.json(data, { status: res.status });
}
