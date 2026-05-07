import { NextResponse, type NextRequest } from 'next/server';
import { assertSameOrigin } from '@/lib/assertSameOrigin';

const API_URL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';

function bearerHeaders(req: NextRequest): HeadersInit {
  const token = req.cookies.get('access_token')?.value ?? '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;
  const { id } = await params;
  const body = await req.text();
  const res = await fetch(`${API_URL}/cards/${id}/move-to-today`, {
    method: 'POST',
    headers: bearerHeaders(req),
    body: body || undefined,
  });
  const data = (await res.json()) as unknown;
  return NextResponse.json(data, { status: res.status });
}
