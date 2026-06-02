import { NextResponse, type NextRequest } from 'next/server';
import type { AuthResponse } from '@zenfocus/types';

const API_URL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';
const isProduction = process.env['NODE_ENV'] === 'production';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  let authData: AuthResponse;

  try {
    const res = await fetch(`${API_URL}/auth/magic-link/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    authData = (await res.json()) as AuthResponse;
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const redirect = NextResponse.redirect(new URL('/', req.url));

  const cookieBase = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
  };

  redirect.cookies.set('access_token', authData.accessToken, cookieBase);
  redirect.cookies.set('refresh_token', authData.refreshToken, {
    ...cookieBase,
    maxAge: 7 * 24 * 60 * 60,
  });

  return redirect;
}
