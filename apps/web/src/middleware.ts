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

    if (!isExpired) {
      return NextResponse.next();
    }

    // Token expired — attempt refresh
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

    // Forward Set-Cookie headers so the browser gets the new tokens
    const response = NextResponse.next();
    for (const [key, value] of refreshRes.headers.entries()) {
      if (key.toLowerCase() === 'set-cookie') {
        response.headers.append('Set-Cookie', value);
      }
    }
    return response;
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!login|register|_next/static|_next/image|favicon.ico|api).*)'],
};
