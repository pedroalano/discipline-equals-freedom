import { NextResponse, type NextRequest } from 'next/server';
import { decodeJwt } from 'jose';

const UNVERIFIED_ALLOWED = new Set([
  '/verify-email',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/users/me',
]);

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const claims = decodeJwt(token);
    const isExpired = !claims.exp || claims.exp * 1000 < Date.now();

    if (isExpired) {
      const refreshRes = await fetch(`${request.nextUrl.origin}/api/auth/refresh`, {
        method: 'POST',
        headers: { cookie: request.headers.get('cookie') ?? '' },
      });

      if (!refreshRes.ok) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('access_token');
        response.cookies.delete('refresh_token');
        return response;
      }

      const response = NextResponse.next();
      for (const [key, value] of refreshRes.headers.entries()) {
        if (key.toLowerCase() === 'set-cookie') {
          response.headers.append('Set-Cookie', value);
        }
      }

      // Re-decode the refreshed token to check emailVerified
      const setCookies = refreshRes.headers.getSetCookie();
      const newAccessCookie = setCookies.find((c) => c.startsWith('access_token='));
      if (newAccessCookie) {
        const newToken = newAccessCookie.split('=')[1]?.split(';')[0];
        if (newToken) {
          const newClaims = decodeJwt(newToken);
          if (!newClaims['emailVerified'] && !UNVERIFIED_ALLOWED.has(pathname)) {
            return NextResponse.redirect(new URL('/verify-email', request.url));
          }
        }
      }

      return response;
    }

    // Token valid — check email verification
    if (!claims['emailVerified'] && !UNVERIFIED_ALLOWED.has(pathname)) {
      return NextResponse.redirect(new URL('/verify-email', request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!login|register|verify-email|forgot-password|reset-password|_next/static|_next/image|favicon.ico|api).*)',
  ],
};
