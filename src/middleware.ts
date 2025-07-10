// src/middleware.ts
import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

// Protect these routes
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/organizations/:path*',
    '/api/integrations/:path*',
    '/api/insights/:path*',
    '/api/reports/:path*'
  ]
}