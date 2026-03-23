import { NextResponse, type NextRequest } from 'next/server';
import type { AuthResponse } from '@zenfocus/types';

const API_URL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';

const isProduction = process.env['NODE_ENV'] === 'production';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Refresh failed' }, { status: 401 });
  }

  const data = (await res.json()) as AuthResponse;
  const response = NextResponse.json({ user: data.user });

  const cookieBase = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
  };

  response.cookies.set('access_token', data.accessToken, cookieBase);
  response.cookies.set('refresh_token', data.refreshToken, {
    ...cookieBase,
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
