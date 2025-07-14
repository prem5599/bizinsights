// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Security headers
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

/**
 * Rate limiting storage (in-memory for development)
 */
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()

/**
 * Simple rate limiting
 */
function isRateLimited(clientId: string, limit: number = 60, windowMs: number = 60000): boolean {
  const now = Date.now()
  const windowStart = now - windowMs
  
  const clientData = rateLimitMap.get(clientId)
  
  if (!clientData || clientData.lastReset < windowStart) {
    rateLimitMap.set(clientId, { count: 1, lastReset: now })
    return false
  }
  
  if (clientData.count >= limit) {
    return true
  }
  
  clientData.count++
  return false
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIP || 'unknown'
  return ip
}

/**
 * Validate webhook signature
 */
function validateWebhookSignature(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname
  
  // Shopify webhook validation
  if (pathname.includes('/webhook/shopify')) {
    const signature = request.headers.get('X-Shopify-Hmac-Sha256')
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET
    
    if (!signature || !secret) return false
    
    // In production, use proper Shopify HMAC validation
    return signature.length > 10
  }
  
  return true
}

/**
 * Check if path requires authentication
 */
function requiresAuth(pathname: string): boolean {
  const protectedPaths = [
    '/dashboard',
    '/api/organizations',
    '/api/integrations',
    '/api/insights'
  ]
  
  return protectedPaths.some(path => pathname.startsWith(path))
}

/**
 * Check if user has required permissions
 */
async function hasPermission(
  request: NextRequest, 
  pathname: string
): Promise<boolean> {
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  })
  
  if (!token) return false
  
  // Admin-only paths
  const adminPaths = [
    '/api/admin',
    '/api/organizations/create',
    '/api/insights/generate'
  ]
  
  if (adminPaths.some(path => pathname.startsWith(path))) {
    // Check if user is admin (would need to query database)
    return true // Simplified - in production, check actual permissions
  }
  
  return true
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const clientId = getClientIdentifier(request)
  
  // Create response with security headers
  const response = NextResponse.next()
  
  // Apply security headers to all responses
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.includes('.')
  ) {
    return response
  }
  
  try {
    // 1. Rate limiting
    if (isRateLimited(clientId)) {
      console.log(`🚫 Rate limit exceeded for client: ${clientId}`)
      return new NextResponse(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            ...Object.fromEntries(response.headers.entries())
          }
        }
      )
    }
    
    // 2. Webhook validation
    if (pathname.includes('/webhook/') && !validateWebhookSignature(request)) {
      console.log(`🚫 Invalid webhook signature for: ${pathname}`)
      return new NextResponse(
        JSON.stringify({ error: 'Invalid signature' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(response.headers.entries())
          }
        }
      )
    }
    
    // 3. Authentication check for protected routes
    if (requiresAuth(pathname)) {
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      })
      
      if (!token) {
        console.log(`🚫 Authentication required for: ${pathname}`)
        
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ error: 'Authentication required' }),
            {
              status: 401,
              headers: {
                'Content-Type': 'application/json',
                ...Object.fromEntries(response.headers.entries())
              }
            }
          )
        } else {
          // Redirect to login for dashboard routes
          const loginUrl = new URL('/auth/signin', request.url)
          loginUrl.searchParams.set('callbackUrl', pathname)
          console.log(`🔀 Redirecting to login: ${loginUrl.toString()}`)
          return NextResponse.redirect(loginUrl)
        }
      }
      
      // 4. Permission check
      const hasRequiredPermission = await hasPermission(request, pathname)
      
      if (!hasRequiredPermission) {
        console.log(`🚫 Insufficient permissions for: ${pathname}`)
        
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ error: 'Insufficient permissions' }),
            {
              status: 403,
              headers: {
                'Content-Type': 'application/json',
                ...Object.fromEntries(response.headers.entries())
              }
            }
          )
        } else {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }
    }
    
    // 5. CORS handling for API routes
    if (pathname.startsWith('/api/')) {
      const origin = request.headers.get('origin')
      const allowedOrigins = [
        process.env.NEXTAUTH_URL,
        process.env.APP_URL,
        'http://localhost:3000', // Development
        'https://localhost:3000'
      ].filter(Boolean)
      
      if (origin && allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin)
        response.headers.set('Access-Control-Allow-Credentials', 'true')
        response.headers.set(
          'Access-Control-Allow-Methods',
          'GET, POST, PUT, DELETE, PATCH, OPTIONS'
        )
        response.headers.set(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization, X-Requested-With'
        )
      }
      
      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return new NextResponse(null, { 
          status: 200, 
          headers: Object.fromEntries(response.headers.entries())
        })
      }
    }
    
    return response
    
  } catch (error) {
    console.error('❌ Middleware error:', error)
    
    // Return a generic error response
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(response.headers.entries())
        }
      }
    )
  }
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}