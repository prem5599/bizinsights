// src/lib/webhooks.ts
import crypto from 'crypto'
import { prisma } from './prisma'

/**
 * Verify Shopify webhook signature
 */
export function verifyShopifyWebhook(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  try {
    const computedHash = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('base64')

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedHash)
    )
  } catch (error) {
    console.error('Shopify webhook verification error:', error)
    return false
  }
}

/**
 * Verify Stripe webhook signature
 */
export function verifyStripeWebhook(
  rawBody: string,
  signature: string,
  secret: string
): any {
  try {
    const elements = signature.split(',')
    const signatureElements: { [key: string]: string } = {}
    
    for (const element of elements) {
      const [key, value] = element.split('=')
      signatureElements[key] = value
    }

    const timestamp = signatureElements.t
    const v1Signature = signatureElements.v1

    if (!timestamp || !v1Signature) {
      throw new Error('Invalid signature format')
    }

    // Check if timestamp is within tolerance (5 minutes)
    const timestampMs = parseInt(timestamp) * 1000
    const now = Date.now()
    const tolerance = 5 * 60 * 1000 // 5 minutes

    if (Math.abs(now - timestampMs) > tolerance) {
      throw new Error('Timestamp outside tolerance')
    }

    // Compute expected signature
    const payload = `${timestamp}.${rawBody}`
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex')

    if (!crypto.timingSafeEqual(
      Buffer.from(v1Signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )) {
      throw new Error('Signature verification failed')
    }

    // Return parsed event
    return JSON.parse(rawBody)
  } catch (error) {
    console.error('Stripe webhook verification error:', error)
    throw error
  }
}

/**
 * Log webhook event to database
 */
export async function logWebhookEvent(
  integrationId: string,
  topic: string,
  status: 'received' | 'processed' | 'failed' | 'signature_verification_failed' | 'invalid_json',
  externalId?: string | null,
  error?: string
) {
  try {
    await prisma.webhookEvent.create({
      data: {
        integrationId,
        topic,
        status,
        externalId,
        error,
        receivedAt: new Date()
      }
    })
  } catch (dbError) {
    console.error('Failed to log webhook event:', dbError)
    // Don't throw - webhook processing should continue even if logging fails
  }
}

/**
 * Update webhook event status
 */
export async function updateWebhookEventStatus(
  integrationId: string,
  topic: string,
  externalId: string,
  status: 'processed' | 'failed',
  error?: string
) {
  try {
    await prisma.webhookEvent.updateMany({
      where: {
        integrationId,
        topic,
        externalId,
        status: 'received'
      },
      data: {
        status,
        error,
        processedAt: new Date()
      }
    })
  } catch (dbError) {
    console.error('Failed to update webhook event status:', dbError)
  }
}

/**
 * Trigger real-time dashboard updates
 */
export async function triggerDashboardUpdate(
  organizationId: string,
  topic: string,
  data: any
) {
  try {
    // TODO: Implement real-time updates using WebSockets or Server-Sent Events
    // For now, just log the event
    console.log(`Dashboard update triggered for org ${organizationId}:`, {
      topic,
      timestamp: new Date().toISOString(),
      dataType: typeof data,
      hasData: !!data
    })

    // In a real implementation, you might:
    // 1. Send to WebSocket connections
    // 2. Publish to Redis pub/sub
    // 3. Trigger Server-Sent Events
    // 4. Update cached metrics
    
  } catch (error) {
    console.error('Failed to trigger dashboard update:', error)
  }
}

/**
 * Validate webhook payload structure
 */
export function validateWebhookPayload(
  platform: 'shopify' | 'stripe',
  topic: string,
  payload: any
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!payload || typeof payload !== 'object') {
    errors.push('Payload must be a valid object')
    return { isValid: false, errors }
  }

  switch (platform) {
    case 'shopify':
      if (!payload.id) errors.push('Missing required field: id')
      if (topic.startsWith('orders/') && !payload.total_price) {
        errors.push('Missing required field: total_price for order events')
      }
      break

    case 'stripe':
      if (!payload.type) errors.push('Missing required field: type')
      if (!payload.data) errors.push('Missing required field: data')
      if (!payload.data?.object) errors.push('Missing required field: data.object')
      break

    default:
      errors.push(`Unsupported platform: ${platform}`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Extract metric data from webhook payload
 */
export function extractMetricFromWebhook(
  platform: 'shopify' | 'stripe',
  topic: string,
  payload: any
): Array<{
  metricType: string;
  value: number;
  metadata: any;
  dateRecorded: Date;
}> {
  const metrics: Array<{
    metricType: string;
    value: number;
    metadata: any;
    dateRecorded: Date;
  }> = []

  try {
    switch (platform) {
      case 'shopify':
        if (topic === 'orders/create' || topic === 'orders/paid') {
          metrics.push({
            metricType: 'revenue',
            value: parseFloat(payload.total_price || '0'),
            metadata: JSON.stringify({
              orderId: payload.id,
              currency: payload.currency,
              orderNumber: payload.order_number,
              customerEmail: payload.email
            }),
            dateRecorded: new Date(payload.created_at || Date.now())
          })

          metrics.push({
            metricType: 'orders',
            value: 1,
            metadata: JSON.stringify({
              orderId: payload.id,
              orderNumber: payload.order_number,
              status: payload.financial_status
            }),
            dateRecorded: new Date(payload.created_at || Date.now())
          })
        }
        break

      case 'stripe':
        if (topic === 'payment_intent.succeeded') {
          const amount = payload.data?.object?.amount || 0
          metrics.push({
            metricType: 'revenue',
            value: amount / 100, // Convert cents to dollars
            metadata: JSON.stringify({
              paymentIntentId: payload.data.object.id,
              currency: payload.data.object.currency,
              customerId: payload.data.object.customer
            }),
            dateRecorded: new Date()
          })
        }
        break
    }
  } catch (error) {
    console.error('Error extracting metrics from webhook:', error)
  }

  return metrics
}

/**
 * Rate limit webhook processing
 */
const webhookRateLimits = new Map<string, { count: number; resetTime: number }>()

export function checkWebhookRateLimit(
  integrationId: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now()
  const key = integrationId
  
  const current = webhookRateLimits.get(key)
  
  if (!current || now > current.resetTime) {
    webhookRateLimits.set(key, {
      count: 1,
      resetTime: now + windowMs
    })
    return true
  }
  
  if (current.count >= maxRequests) {
    return false
  }
  
  current.count++
  return true
}