import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('bolao_token')?.value;
  const { pathname } = request.nextUrl;

  const publicPaths = ['/', '/login', '/registro'];
  const isPublic =
    publicPaths.includes(pathname) || pathname.startsWith('/api');

  if (!isPublic && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/).*)'],
};
