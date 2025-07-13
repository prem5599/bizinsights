// src/lib/security/rate-limiter.ts
import { NextRequest } from 'next/server'

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

export interface RateLimitConfig {
  max: number
  window: number
  keyGenerator?: (req: NextRequest) => string
}

// In-memory store (use Redis in production)
const store = new Map<string, { count: number; resetTime: number }>()

/**
 * Advanced rate limiter with configurable rules
 */
export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  async check(request: NextRequest): Promise<RateLimitResult> {
    const key = this.config.keyGenerator 
      ? this.config.keyGenerator(request)
      : this.getDefaultKey(request)

    const now = Date.now()
    const windowStart = Math.floor(now / this.config.window) * this.config.window
    const windowKey = `${key}:${windowStart}`

    const current = store.get(windowKey) || { 
      count: 0, 
      resetTime: windowStart + this.config.window 
    }

    const remaining = Math.max(0, this.config.max - current.count)
    
    if (current.count >= this.config.max) {
      return {
        success: false,
        limit: this.config.max,
        remaining: 0,
        reset: current.resetTime,
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      }
    }

    // Increment counter
    current.count++
    store.set(windowKey, current)

    // Cleanup old entries periodically
    this.cleanup()

    return {
      success: true,
      limit: this.config.max,
      remaining: remaining - 1,
      reset: current.resetTime
    }
  }

  private getDefaultKey(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const cfIp = request.headers.get('cf-connecting-ip')
    
    return cfIp || realIp || forwarded?.split(',')[0] || 'anonymous'
  }

  private cleanup(): void {
    if (Math.random() < 0.01) { // 1% chance
      const now = Date.now()
      for (const [key, value] of store.entries()) {
        if (value.resetTime < now) {
          store.delete(key)
        }
      }
    }
  }
}

// Pre-configured rate limiters
export const apiLimiter = new RateLimiter({
  max: 100,
  window: 15 * 60 * 1000, // 15 minutes
})

export const authLimiter = new RateLimiter({
  max: 5,
  window: 15 * 60 * 1000, // 15 minutes
  keyGenerator: (req) => `auth:${req.headers.get('x-forwarded-for') || 'anonymous'}`
})

export const webhookLimiter = new RateLimiter({
  max: 1000,
  window: 60 * 1000, // 1 minute
})

export const insightsLimiter = new RateLimiter({
  max: 10,
  window: 60 * 1000, // 1 minute
  keyGenerator: (req) => {
    // Rate limit by user session if available
    return `insights:${req.headers.get('authorization') || req.headers.get('x-forwarded-for') || 'anonymous'}`
  }
})