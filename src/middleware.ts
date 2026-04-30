import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAuthSecret } from '@/lib/authSecret';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: getAuthSecret() });
  const protectedPaths = ['/dashboard', '/api/games', '/api/analyze'];
  if (protectedPaths.some(path => req.nextUrl.pathname.startsWith(path))) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/api/games', '/api/analyze'],
};
