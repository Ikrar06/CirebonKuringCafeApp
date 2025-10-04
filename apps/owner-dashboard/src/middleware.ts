import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isOwner = token?.role === 'owner'
    const pathname = req.nextUrl.pathname

    // Public auth routes - always allow
    const publicAuthRoutes = ['/login', '/signup', '/forgot-password']
    if (publicAuthRoutes.includes(pathname)) {
      return NextResponse.next()
    }

    // Root path and all dashboard routes require authentication
    if (!isAuth) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check owner role for dashboard routes
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

        // Public routes that don't require auth
        const publicRoutes = ['/login', '/signup', '/forgot-password']
        if (publicRoutes.includes(pathname)) {
          return true
        }

        // API auth routes
        if (pathname.startsWith('/api/auth')) {
          return true
        }

        // All other routes require authentication and owner role
        return !!token && token.role === 'owner'
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes except /api/auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}