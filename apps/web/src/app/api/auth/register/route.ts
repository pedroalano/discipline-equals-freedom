import { NextResponse, type NextRequest } from 'next/server';
import type { AuthResponse } from '@zenfocus/types';

const API_URL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';

const isProduction = process.env['NODE_ENV'] === 'production';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as unknown;

  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = (await res.json()) as unknown;
    return NextResponse.json(data, { status: res.status });
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
