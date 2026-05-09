import { NextResponse, type NextRequest } from 'next/server';

const API_URL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';

function bearerHeaders(req: NextRequest): HeadersInit {
  const token = req.cookies.get('access_token')?.value ?? '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function GET(req: NextRequest) {
  const days = req.nextUrl.searchParams.get('days') ?? '365';
  const res = await fetch(`${API_URL}/habits/completion?days=${encodeURIComponent(days)}`, {
    headers: bearerHeaders(req),
  });
  const data = (await res.json()) as unknown;
  return NextResponse.json(data, { status: res.status });
}
