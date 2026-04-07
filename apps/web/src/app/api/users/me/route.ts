import { NextResponse, type NextRequest } from 'next/server';

const API_URL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';

function bearerHeaders(req: NextRequest): HeadersInit {
  const token = req.cookies.get('access_token')?.value ?? '';
  return { Authorization: `Bearer ${token}` };
}

export async function GET(req: NextRequest) {
  const res = await fetch(`${API_URL}/users/me`, {
    headers: bearerHeaders(req),
  });
  const data = (await res.json()) as unknown;
  return NextResponse.json(data, { status: res.status });
}
