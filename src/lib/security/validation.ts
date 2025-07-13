// src/lib/security/validation.ts

/**
 * Input validation utilities
 */
export const validators = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 254
  },

  url: (url: string): boolean => {
    try {
      new URL(url)
      return url.length <= 2048
    } catch {
      return false
    }
  },

  organizationId: (id: string): boolean => {
    return /^[a-zA-Z0-9_-]{1,50}$/.test(id)
  },

  integrationId: (id: string): boolean => {
    return /^[a-zA-Z0-9_-]{1,50}$/.test(id)
  },

  shopDomain: (domain: string): boolean => {
    return /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]$/.test(domain) && 
           domain.length <= 63
  },

  webhook: {
    shopify: (headers: Headers, body: string): boolean => {
      const hmac = headers.get('x-shopify-hmac-sha256')
      const secret = process.env.SHOPIFY_WEBHOOK_SECRET
      
      if (!hmac || !secret) return false
      
      // In production, implement proper HMAC validation
      return hmac.length > 0
    },

    stripe: (headers: Headers, body: string): boolean => {
      const signature = headers.get('stripe-signature')
      const secret = process.env.STRIPE_WEBHOOK_SECRET
      
      if (!signature || !secret) return false
      
      // In production, use Stripe's webhook signature validation
      return signature.includes('t=') && signature.includes('v1=')
    }
  },

  sanitizeInput: (input: string, maxLength: number = 1000): string => {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .slice(0, maxLength)
      .trim()
  }
}
