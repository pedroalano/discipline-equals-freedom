import { NextResponse, type NextRequest } from 'next/server';

const API_URL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';

function bearerHeaders(req: NextRequest): HeadersInit {
  const token = req.cookies.get('access_token')?.value ?? '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function POST(req: NextRequest) {
  const res = await fetch(`${API_URL}/auth/resend-verification`, {
    method: 'POST',
    headers: bearerHeaders(req),
  });

  const data = (await res.json()) as unknown;
  return NextResponse.json(data, { status: res.status });
}
