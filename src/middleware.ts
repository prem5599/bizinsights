// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Rate limiting configuration
 */
const RATE_LIMITS = {
  api: { max: 100, window: 15 * 60 * 1000 }, // 100 requests per 15 minutes
  auth: { max: 5, window: 15 * 60 * 1000 },  // 5 auth attempts per 15 minutes
  webhooks: { max: 1000, window: 60 * 1000 }, // 1000 webhook calls per minute
  insights: { max: 10, window: 60 * 1000 }   // 10 insight generations per minute
}

/**
 * Security headers for all responses
 */
const SECURITY_HEADERS = {
  'X-DNS-Prefetch-Control': 'off',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://maps.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.stripe.com https://maps.googleapis.com https://analytics.google.com wss:",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
}

/**
 * Apply rate limiting
 */
function rateLimit(
  request: NextRequest, 
  identifier: string, 
  config: { max: number; window: number }
): { limited: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = `${identifier}-${Math.floor(now / config.window)}`
  
  const current = rateLimitStore.get(key) || { count: 0, resetTime: now + config.window }
  
  if (current.count >= config.max) {
    return {
      limited: true,
      remaining: 0,
      resetTime: current.resetTime
    }
  }
  
  current.count++
  rateLimitStore.set(key, current)
  
  // Cleanup old entries (basic cleanup)
  if (Math.random() < 0.01) { // 1% chance to cleanup
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key)
      }
    }
  }
  
  return {
    limited: false,
    remaining: config.max - current.count,
    resetTime: current.resetTime
  }
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP behind proxies
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  const ip = cfConnectingIp || realIp || forwarded?.split(',')[0] || 'unknown'
  
  return ip.trim()
}

/**
 * Validate webhook signatures
 */
function validateWebhookSignature(request: NextRequest, body: string): boolean {
  const pathname = request.nextUrl.pathname
  
  if (pathname.includes('/webhooks/stripe')) {
    const signature = request.headers.get('stripe-signature')
    const secret = process.env.STRIPE_WEBHOOK_SECRET
    
    if (!signature || !secret) return false
    
    // In production, use proper Stripe signature validation
    // This is a simplified check
    return signature.length > 10
  }
  
  if (pathname.includes('/webhooks/shopify')) {
    const signature = request.headers.get('x-shopify-hmac-sha256')
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
    pathname.endsWith('.svg')
  ) {
    return response
  }
  
  try {
    // 1. Rate Limiting
    let rateLimitConfig = RATE_LIMITS.api
    let rateLimitId = clientId
    
    if (pathname.startsWith('/api/auth')) {
      rateLimitConfig = RATE_LIMITS.auth
      rateLimitId = `auth-${clientId}`
    } else if (pathname.includes('/webhooks/')) {
      rateLimitConfig = RATE_LIMITS.webhooks
      rateLimitId = `webhook-${clientId}`
    } else if (pathname.includes('/api/insights/generate')) {
      rateLimitConfig = RATE_LIMITS.insights
      rateLimitId = `insights-${clientId}`
    }
    
    const rateResult = rateLimit(request, rateLimitId, rateLimitConfig)
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', rateLimitConfig.max.toString())
    response.headers.set('X-RateLimit-Remaining', rateResult.remaining.toString())
    response.headers.set('X-RateLimit-Reset', rateResult.resetTime.toString())
    
    if (rateResult.limited) {
      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateResult.resetTime - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateResult.resetTime - Date.now()) / 1000).toString(),
            ...Object.fromEntries(response.headers.entries())
          }
        }
      )
    }
    
    // 2. Webhook signature validation
    if (pathname.includes('/webhooks/')) {
      const body = await request.text()
      const isValidSignature = validateWebhookSignature(request, body)
      
      if (!isValidSignature) {
        return new NextResponse(
          JSON.stringify({ error: 'Invalid webhook signature' }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              ...Object.fromEntries(response.headers.entries())
            }
          }
        )
      }
      
      // Recreate request with body for webhook handlers
      const newRequest = new NextRequest(request.url, {
        method: request.method,
        headers: request.headers,
        body
      })
      
      return NextResponse.next({
        request: newRequest
      })
    }
    
    // 3. Authentication check for protected routes
    if (requiresAuth(pathname)) {
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      })
      
      if (!token) {
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
          return NextResponse.redirect(loginUrl)
        }
      }
      
      // 4. Permission check
      const hasRequiredPermission = await hasPermission(request, pathname)
      
      if (!hasRequiredPermission) {
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
    console.error('Middleware error:', error)
    
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




