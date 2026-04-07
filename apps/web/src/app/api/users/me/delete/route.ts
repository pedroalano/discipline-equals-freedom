import { NextResponse, type NextRequest } from 'next/server';

const API_URL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';

function bearerHeaders(req: NextRequest): HeadersInit {
  const token = req.cookies.get('access_token')?.value ?? '';
  return { Authorization: `Bearer ${token}` };
}

export async function DELETE(req: NextRequest) {
  const res = await fetch(`${API_URL}/users/me`, {
    method: 'DELETE',
    headers: bearerHeaders(req),
  });

  if (res.status === 204) {
    const response = new NextResponse(null, { status: 204 });
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    return response;
  }

  const data = (await res.json()) as unknown;
  return NextResponse.json(data, { status: res.status });
}
