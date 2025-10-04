import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isOwner = token?.role === 'owner'
    const pathname = req.nextUrl.pathname

    // Allow access to login and home pages
    if (pathname === '/login' || pathname === '/') {
      return NextResponse.next()
    }

    // Protect all other routes (dashboard pages)
    // Redirect to login if not authenticated
    if (!isAuth) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Redirect to login if not owner role
    if (!isOwner) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname

        // Allow access to login, home, auth routes, and static files
        if (
          pathname === '/login' ||
          pathname === '/' ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/_next')
        ) {
          return true
        }

        // Require authentication for all other routes (dashboard pages)
        return !!token && token.role === 'owner'
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
}