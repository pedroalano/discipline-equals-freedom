import { NextResponse, type NextRequest } from 'next/server';

const API_URL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get('access_token')?.value;

  if (accessToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete('access_token');
  response.cookies.delete('refresh_token');

  return response;
}
