import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname, searchParams, origin } = request.nextUrl

  // Supabase ignores redirectTo and sends PKCE codes to the Site URL.
  // Intercept /?code= at the root and forward to the auth callback handler.
  if (pathname === '/' && searchParams.has('code')) {
    const code = searchParams.get('code')!
    return NextResponse.redirect(new URL(`/auth/callback?code=${code}`, origin))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
