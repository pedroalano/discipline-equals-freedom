import { NextResponse, type NextRequest } from 'next/server';
import { decodeJwt } from 'jose';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const claims = decodeJwt(token);
    const isExpired = !claims.exp || claims.exp * 1000 < Date.now();

    if (isExpired) {
      let refreshRes: Response;
      try {
        refreshRes = await fetch(`${request.nextUrl.origin}/api/auth/refresh`, {
          method: 'POST',
          headers: { cookie: request.headers.get('cookie') ?? '' },
          cache: 'no-store',
          signal: AbortSignal.timeout(3000),
        });
      } catch {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('access_token');
        response.cookies.delete('refresh_token');
        return response;
      }

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

      return response;
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!login|auth/magic|_next/static|_next/image|favicon.ico|api).*)'],
};
