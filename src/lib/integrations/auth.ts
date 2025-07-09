// lib/integrations/auth.ts
import { ShopifyIntegration } from './shopify'
import { StripeIntegration } from './stripe'

/**
 * Generate OAuth URL for platform integrations
 */
export function generateIntegrationAuthUrl(
  platform: string,
  organizationId: string,
  shopDomain?: string
): string {
  // Create state parameter with organization info
  const state = Buffer.from(JSON.stringify({
    organizationId,
    timestamp: Date.now()
  })).toString('base64')

  switch (platform) {
    case 'shopify':
      if (!shopDomain) {
        throw new Error('Shop domain is required for Shopify integration')
      }
      return ShopifyIntegration.generateAuthUrl(shopDomain, state)

    case 'stripe':
      return StripeIntegration.generateAuthUrl(state)

    case 'google_analytics':
      return generateGoogleAnalyticsAuthUrl(state)

    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

/**
 * Generate Google Analytics OAuth URL
 */
function generateGoogleAnalyticsAuthUrl(state: string): string {
  const redirectUri = `${process.env.APP_URL}/api/integrations/google/callback`
  
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_ANALYTICS_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    state
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/**
 * Get platform display information
 */
export function getPlatformInfo(platform: string) {
  const platforms = {
    shopify: {
      name: 'Shopify',
      description: 'Connect your Shopify store to sync orders, products, and customer data',
      icon: '🛍️',
      color: 'bg-green-500',
      features: ['Orders', 'Products', 'Customers', 'Revenue'],
      setupSteps: [
        'Enter your shop domain (e.g., mystore.myshopify.com)',
        'Authorize BizInsights in your Shopify admin',
        'We\'ll automatically sync your store data'
      ]
    },
    stripe: {
      name: 'Stripe',
      description: 'Connect your Stripe account to sync payments and customer data',
      icon: '💳',
      color: 'bg-blue-500',
      features: ['Payments', 'Customers', 'Revenue', 'Subscriptions'],
      setupSteps: [
        'Click connect to authorize with Stripe',
        'Grant BizInsights read access to your account',
        'We\'ll sync your payment data automatically'
      ]
    },
    google_analytics: {
      name: 'Google Analytics',
      description: 'Connect Google Analytics to track website traffic and user behavior',
      icon: '📊',
      color: 'bg-orange-500',
      features: ['Sessions', 'Users', 'Page Views', 'Traffic Sources'],
      setupSteps: [
        'Authorize with your Google account',
        'Select the Analytics property to connect',
        'We\'ll sync your website analytics data'
      ]
    }
  }

  return platforms[platform as keyof typeof platforms] || null
}

/**
 * Validate platform requirements
 */
export function validatePlatformRequirements(platform: string, data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  switch (platform) {
    case 'shopify':
      if (!data.shopDomain) {
        errors.push('Shop domain is required')
      } else if (!data.shopDomain.match(/^[a-zA-Z0-9-]+(.myshopify.com)?$/)) {
        errors.push('Invalid shop domain format')
      }
      break

    case 'stripe':
      // No additional requirements for Stripe
      break

    case 'google_analytics':
      // No additional requirements for Google Analytics
      break

    default:
      errors.push(`Unsupported platform: ${platform}`)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get integration status display info
 */
export function getIntegrationStatusInfo(status: string) {
  const statusInfo = {
    active: {
      label: 'Connected',
      color: 'text-green-600 bg-green-50',
      icon: '✓'
    },
    error: {
      label: 'Error',
      color: 'text-red-600 bg-red-50',
      icon: '⚠️'
    },
    pending: {
      label: 'Connecting',
      color: 'text-yellow-600 bg-yellow-50',
      icon: '⏳'
    }
  }

  return statusInfo[status as keyof typeof statusInfo] || statusInfo.error
}