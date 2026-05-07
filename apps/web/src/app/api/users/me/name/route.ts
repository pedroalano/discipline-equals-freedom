import { NextResponse, type NextRequest } from 'next/server';
import { assertSameOrigin } from '@/lib/assertSameOrigin';

const API_URL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';

function bearerHeaders(req: NextRequest): HeadersInit {
  const token = req.cookies.get('access_token')?.value ?? '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function PATCH(req: NextRequest) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;
  const body = (await req.json()) as unknown;
  const res = await fetch(`${API_URL}/users/me/name`, {
    method: 'PATCH',
    headers: bearerHeaders(req),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as unknown;
  return NextResponse.json(data, { status: res.status });
}
