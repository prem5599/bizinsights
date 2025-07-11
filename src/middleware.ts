// src/middleware.ts
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
    const { pathname } = req.nextUrl
    
    // Allow public routes
    if (pathname.startsWith('/auth/') || pathname === '/' || pathname.startsWith('/api/auth/')) {
      return NextResponse.next()
    }
    
    // Check if this is an organization route
    const orgRouteMatch = pathname.match(/^\/([^\/]+)\/(dashboard|integrations|analytics|insights|settings|team)/)
    if (orgRouteMatch) {
      // This is an organization route, authentication is required
      if (!req.nextauth.token) {
        return NextResponse.redirect(new URL('/auth/signin', req.url))
      }
    }
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Always allow public routes
        if (pathname.startsWith('/auth/') || pathname === '/' || pathname.startsWith('/api/auth/')) {
          return true
        }
        
        // For API routes and protected pages, require authentication
        if (pathname.startsWith('/api/organizations') || 
            pathname.startsWith('/api/integrations') || 
            pathname.startsWith('/api/insights') || 
            pathname.startsWith('/api/reports') ||
            pathname.match(/^\/[^\/]+\/(dashboard|integrations|analytics|insights|settings|team)/)) {
          return !!token
        }
        
        return true
      },
    },
  }
)

// Protect these routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ]
}