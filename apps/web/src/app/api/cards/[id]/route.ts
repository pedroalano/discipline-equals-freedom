import { NextResponse, type NextRequest } from 'next/server';

const API_URL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';

function bearerHeaders(req: NextRequest): HeadersInit {
  const token = req.cookies.get('access_token')?.value ?? '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as unknown;
  const res = await fetch(`${API_URL}/cards/${id}`, {
    method: 'PATCH',
    headers: bearerHeaders(req),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as unknown;
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${API_URL}/cards/${id}`, {
    method: 'DELETE',
    headers: bearerHeaders(req),
  });
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const data = (await res.json()) as unknown;
  return NextResponse.json(data, { status: res.status });
}
