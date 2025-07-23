// src/lib/integrations/stripe.ts
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

/**
 * Stripe API Types
 */
interface StripeCharge {
  id: string
  amount: number
  currency: string
  created: number
  customer?: string
  status: string
  payment_method_types: string[]
  receipt_email?: string
  description?: string
}

interface StripeCustomer {
  id: string
  email?: string
  name?: string
  created: number
  subscriptions?: { data: StripeSubscription[] }
}

interface StripeSubscription {
  id: string
  customer: string
  status: string
  created: number
  current_period_start: number
  current_period_end: number
  items: {
    data: Array<{
      price: {
        id: string
        unit_amount: number
        currency: string
        recurring?: {
          interval: string
          interval_count: number
        }
      }
    }>
  }
}

interface StripeInvoice {
  id: string
  customer: string
  subscription?: string
  amount_paid: number
  amount_due: number
  currency: string
  status: string
  created: number
  paid: boolean
}

interface StripeWebhookEvent {
  id: string
  type: string
  created: number
  data: {
    object: any
    previous_attributes?: any
  }
}

/**
 * Stripe Integration Class
 */
export class StripeIntegration {
  private accessToken: string
  private apiVersion: string = '2023-10-16'
  private baseUrl: string = 'https://api.stripe.com/v1'

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  /**
   * Enhanced constructor for Stripe Connect accounts
   */
  static forConnectAccount(accessToken: string, stripeAccount?: string): StripeIntegration {
    const instance = new StripeIntegration(accessToken)
    if (stripeAccount) {
      instance.stripeAccount = stripeAccount
    }
    return instance
  }

  private stripeAccount?: string

  /**
   * Make authenticated API request to Stripe with retry logic
   */
  private async makeRequest(
    endpoint: string, 
    options: RequestInit = {},
    retries: number = 3
  ): Promise<any> {
    const url = `${this.baseUrl}/${endpoint}`
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Stripe-Version': this.apiVersion,
            'Content-Type': 'application/x-www-form-urlencoded',
            ...(this.stripeAccount && { 'Stripe-Account': this.stripeAccount }),
            ...options.headers
          }
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          
          // Rate limiting - wait and retry
          if (response.status === 429 && attempt < retries) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '1')
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
            continue
          }

          throw new Error(`Stripe API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`)
        }

        return response.json()
      } catch (error) {
        if (attempt === retries) throw error
        
        // Exponential backoff for network errors
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }
  }

  /**
   * Test connection to Stripe
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccountInfo()
      return true
    } catch (error) {
      console.error('Stripe connection test failed:', error)
      return false
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<any> {
    return this.makeRequest('account')
  }

  /**
   * Get charges with pagination
   */
  async getCharges(params: {
    limit?: number
    startingAfter?: string
    endingBefore?: string
    created?: { gte?: number; lte?: number }
  } = {}): Promise<{ data: StripeCharge[]; hasMore: boolean }> {
    const searchParams = new URLSearchParams()
    
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.startingAfter) searchParams.append('starting_after', params.startingAfter)
    if (params.endingBefore) searchParams.append('ending_before', params.endingBefore)
    if (params.created?.gte) searchParams.append('created[gte]', params.created.gte.toString())
    if (params.created?.lte) searchParams.append('created[lte]', params.created.lte.toString())
    
    const response = await this.makeRequest(`charges?${searchParams.toString()}`)
    return {
      data: response.data || [],
      hasMore: response.has_more || false
    }
  }

  /**
   * Get customers with pagination
   */
  async getCustomers(params: {
    limit?: number
    startingAfter?: string
    endingBefore?: string
    created?: { gte?: number; lte?: number }
  } = {}): Promise<{ data: StripeCustomer[]; hasMore: boolean }> {
    const searchParams = new URLSearchParams()
    
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.startingAfter) searchParams.append('starting_after', params.startingAfter)
    if (params.endingBefore) searchParams.append('ending_before', params.endingBefore)
    if (params.created?.gte) searchParams.append('created[gte]', params.created.gte.toString())
    if (params.created?.lte) searchParams.append('created[lte]', params.created.lte.toString())
    
    // Expand subscriptions to get subscription data
    searchParams.append('expand[]', 'data.subscriptions')
    
    const response = await this.makeRequest(`customers?${searchParams.toString()}`)
    return {
      data: response.data || [],
      hasMore: response.has_more || false
    }
  }

  /**
   * Get subscriptions with pagination
   */
  async getSubscriptions(params: {
    limit?: number
    startingAfter?: string
    endingBefore?: string
    created?: { gte?: number; lte?: number }
    status?: string
  } = {}): Promise<{ data: StripeSubscription[]; hasMore: boolean }> {
    const searchParams = new URLSearchParams()
    
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.startingAfter) searchParams.append('starting_after', params.startingAfter)
    if (params.endingBefore) searchParams.append('ending_before', params.endingBefore)
    if (params.created?.gte) searchParams.append('created[gte]', params.created.gte.toString())
    if (params.created?.lte) searchParams.append('created[lte]', params.created.lte.toString())
    if (params.status) searchParams.append('status', params.status)
    
    const response = await this.makeRequest(`subscriptions?${searchParams.toString()}`)
    return {
      data: response.data || [],
      hasMore: response.has_more || false
    }
  }

  /**
   * Get invoices with pagination
   */
  async getInvoices(params: {
    limit?: number
    startingAfter?: string
    endingBefore?: string
    created?: { gte?: number; lte?: number }
    status?: string
  } = {}): Promise<{ data: StripeInvoice[]; hasMore: boolean }> {
    const searchParams = new URLSearchParams()
    
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.startingAfter) searchParams.append('starting_after', params.startingAfter)
    if (params.endingBefore) searchParams.append('ending_before', params.endingBefore)
    if (params.created?.gte) searchParams.append('created[gte]', params.created.gte.toString())
    if (params.created?.lte) searchParams.append('created[lte]', params.created.lte.toString())
    if (params.status) searchParams.append('status', params.status)
    
    const response = await this.makeRequest(`invoices?${searchParams.toString()}`)
    return {
      data: response.data || [],
      hasMore: response.has_more || false
    }
  }

  /**
   * Get balance and available funds
   */
  async getBalance(): Promise<any> {
    return this.makeRequest('balance')
  }

  /**
   * Get balance transactions
   */
  async getBalanceTransactions(params: {
    limit?: number
    startingAfter?: string
    created?: { gte?: number; lte?: number }
  } = {}): Promise<{ data: any[]; hasMore: boolean }> {
    const searchParams = new URLSearchParams()
    
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.startingAfter) searchParams.append('starting_after', params.startingAfter)
    if (params.created?.gte) searchParams.append('created[gte]', params.created.gte.toString())
    if (params.created?.lte) searchParams.append('created[lte]', params.created.lte.toString())
    
    const response = await this.makeRequest(`balance_transactions?${searchParams.toString()}`)
    return {
      data: response.data || [],
      hasMore: response.has_more || false
    }
  }

  /**
   * Generate OAuth authorization URL for Stripe Connect
   */
  static generateConnectUrl(state: string): string {
    const redirectUri = `${process.env.NEXTAUTH_URL || process.env.APP_URL}/api/integrations/stripe/callback`
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.STRIPE_CONNECT_CLIENT_ID!,
      scope: 'read_write',
      redirect_uri: redirectUri,
      state,
      'stripe_user[business_type]': 'company',
      'stripe_user[country]': 'US'
    })

    return `https://connect.stripe.com/oauth/authorize?${params.toString()}`
  }

  /**
   * Get Connect account information
   */
  async getConnectAccount(accountId?: string): Promise<any> {
    const endpoint = accountId ? `accounts/${accountId}` : 'account'
    return this.makeRequest(endpoint)
  }

  /**
   * Verify webhook signature for Connect accounts
   */
  static verifyConnectWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex')

      const providedSignature = signature.split(',').find(sig => 
        sig.trim().startsWith('v1=')
      )?.replace('v1=', '')

      if (!providedSignature) {
        return false
      }

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      )
    } catch (error) {
      console.error('Webhook signature verification error:', error)
      return false
    }
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(code: string): Promise<{
    access_token: string
    refresh_token: string
    stripe_publishable_key: string
    stripe_user_id: string
    scope: string
  }> {
    const response = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_secret: process.env.STRIPE_SECRET_KEY!,
        code,
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(`Failed to exchange code for token: ${errorData.error_description || errorData.error}`)
    }

    return response.json()
  }

  /**
   * Create webhook endpoint
   */
  async createWebhook(url: string, events: string[]): Promise<any> {
    const body = new URLSearchParams()
    body.append('url', url)
    events.forEach(event => body.append('enabled_events[]', event))
    
    return this.makeRequest('webhook_endpoints', {
      method: 'POST',
      body: body.toString()
    })
  }

  /**
   * Setup required webhooks for integration
   */
  async setupWebhooks(organizationId: string, options: {
    recreate?: boolean
  } = {}): Promise<string[]> {
    const webhookEvents = [
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'payment_intent.created',
      'charge.succeeded',
      'charge.failed',
      'charge.dispute.created',
      'charge.refunded',
      'customer.created',
      'customer.updated',
      'customer.deleted',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.paid',
      'invoice.payment_failed',
      'invoice.created',
      'checkout.session.completed',
      'payout.created',
      'payout.paid',
      'payout.failed'
    ]

    const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'
    const webhookUrl = `${baseUrl}/api/integrations/stripe/webhooks?org=${organizationId}`
    const webhookUrls: string[] = []

    try {
      // Clean up existing webhooks if recreate is requested
      if (options.recreate) {
        const existingWebhooks = await this.getExistingWebhooks()
        
        for (const webhook of existingWebhooks) {
          try {
            await this.deleteWebhook(webhook.id)
            console.log(`Deleted existing Stripe webhook: ${webhook.id}`)
          } catch (error) {
            console.warn(`Failed to delete webhook ${webhook.id}:`, error)
          }
        }
      }

      const webhook = await this.createWebhook(webhookUrl, webhookEvents)
      console.log(`Created Stripe webhook: ${webhook.id}`)
      webhookUrls.push(webhook.url)
      
      return webhookUrls
    } catch (error) {
      console.error('Failed to create Stripe webhook:', error)
      return []
    }
  }

  /**
   * Get existing webhooks
   */
  async getExistingWebhooks(): Promise<any[]> {
    try {
      const response = await this.makeRequest('webhook_endpoints')
      return response.data || []
    } catch (error) {
      console.error('Failed to get existing webhooks:', error)
      return []
    }
  }

  /**
   * Delete webhook endpoint
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      await this.makeRequest(`webhook_endpoints/${webhookId}`, {
        method: 'DELETE'
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        console.log(`Webhook ${webhookId} not found, may already be deleted`)
        return
      }
      throw error
    }
  }

  /**
   * Sync historical data for initial setup
   */
  async syncHistoricalData(integrationId: string, days: number = 30): Promise<{
    charges: number
    customers: number
    subscriptions: number
    invoices: number
  }> {
    const sinceTimestamp = Math.floor((Date.now() - (days * 24 * 60 * 60 * 1000)) / 1000)
    let syncCounts = { charges: 0, customers: 0, subscriptions: 0, invoices: 0 }

    try {
      // Sync charges
      await this.syncCharges(integrationId, { created: { gte: sinceTimestamp } })
      
      // Sync customers
      await this.syncCustomers(integrationId, { created: { gte: sinceTimestamp } })
      
      // Sync subscriptions
      await this.syncSubscriptions(integrationId, { created: { gte: sinceTimestamp } })
      
      // Sync invoices
      await this.syncInvoices(integrationId, { created: { gte: sinceTimestamp } })

      // Count synced records
      const counts = await Promise.all([
        prisma.dataPoint.count({ 
          where: { 
            integrationId, 
            metricType: 'revenue',
            dateRecorded: { gte: new Date(sinceTimestamp * 1000) }
          } 
        }),
        prisma.dataPoint.count({ 
          where: { 
            integrationId, 
            metricType: 'customer_created',
            dateRecorded: { gte: new Date(sinceTimestamp * 1000) }
          } 
        }),
        prisma.dataPoint.count({ 
          where: { 
            integrationId, 
            metricType: 'subscription_created',
            dateRecorded: { gte: new Date(sinceTimestamp * 1000) }
          } 
        }),
        prisma.dataPoint.count({ 
          where: { 
            integrationId, 
            metricType: 'invoice_paid',
            dateRecorded: { gte: new Date(sinceTimestamp * 1000) }
          } 
        })
      ])

      return {
        charges: counts[0],
        customers: counts[1],
        subscriptions: counts[2],
        invoices: counts[3]
      }
    } catch (error) {
      console.error('Error syncing Stripe historical data:', error)
      throw error
    }
  }

  /**
   * Sync charges data
   */
  private async syncCharges(integrationId: string, params: any): Promise<void> {
    let hasMore = true
    let startingAfter: string | undefined

    while (hasMore) {
      const result = await this.getCharges({ 
        ...params, 
        limit: 100, 
        startingAfter 
      })

      for (const charge of result.data) {
        if (charge.status === 'succeeded') {
          await prisma.dataPoint.create({
            data: {
              integrationId,
              metricType: 'revenue',
              value: charge.amount / 100, // Convert cents to dollars
              metadata: JSON.stringify({
                chargeId: charge.id,
                customerId: charge.customer,
                currency: charge.currency,
                paymentMethod: charge.payment_method_types?.join(','),
                description: charge.description,
                receiptEmail: charge.receipt_email,
                source: 'stripe_sync'
              }),
              dateRecorded: new Date(charge.created * 1000)
            }
          })
        }
      }

      hasMore = result.hasMore
      if (hasMore && result.data.length > 0) {
        startingAfter = result.data[result.data.length - 1].id
      }
    }
  }

  /**
   * Sync customers data
   */
  private async syncCustomers(integrationId: string, params: any): Promise<void> {
    let hasMore = true
    let startingAfter: string | undefined

    while (hasMore) {
      const result = await this.getCustomers({ 
        ...params, 
        limit: 100, 
        startingAfter 
      })

      for (const customer of result.data) {
        await prisma.dataPoint.create({
          data: {
            integrationId,
            metricType: 'customer_created',
            value: 1,
            metadata: JSON.stringify({
              customerId: customer.id,
              email: customer.email,
              name: customer.name,
              subscriptionsCount: customer.subscriptions?.data?.length || 0,
              source: 'stripe_sync'
            }),
            dateRecorded: new Date(customer.created * 1000)
          }
        })
      }

      hasMore = result.hasMore
      if (hasMore && result.data.length > 0) {
        startingAfter = result.data[result.data.length - 1].id
      }
    }
  }

  /**
   * Sync subscriptions data
   */
  private async syncSubscriptions(integrationId: string, params: any): Promise<void> {
    let hasMore = true
    let startingAfter: string | undefined

    while (hasMore) {
      const result = await this.getSubscriptions({ 
        ...params, 
        limit: 100, 
        startingAfter 
      })

      for (const subscription of result.data) {
        const amount = subscription.items.data[0]?.price?.unit_amount / 100 || 0

        await prisma.dataPoint.create({
          data: {
            integrationId,
            metricType: 'subscription_created',
            value: amount,
            metadata: JSON.stringify({
              subscriptionId: subscription.id,
              customerId: subscription.customer,
              status: subscription.status,
              priceId: subscription.items.data[0]?.price?.id,
              interval: subscription.items.data[0]?.price?.recurring?.interval,
              currency: subscription.items.data[0]?.price?.currency,
              source: 'stripe_sync'
            }),
            dateRecorded: new Date(subscription.created * 1000)
          }
        })
      }

      hasMore = result.hasMore
      if (hasMore && result.data.length > 0) {
        startingAfter = result.data[result.data.length - 1].id
      }
    }
  }

  /**
   * Sync invoices data
   */
  private async syncInvoices(integrationId: string, params: any): Promise<void> {
    let hasMore = true
    let startingAfter: string | undefined

    while (hasMore) {
      const result = await this.getInvoices({ 
        ...params, 
        limit: 100, 
        startingAfter 
      })

      for (const invoice of result.data) {
        if (invoice.paid && invoice.amount_paid > 0) {
          await prisma.dataPoint.create({
            data: {
              integrationId,
              metricType: 'invoice_paid',
              value: invoice.amount_paid / 100,
              metadata: JSON.stringify({
                invoiceId: invoice.id,
                customerId: invoice.customer,
                subscriptionId: invoice.subscription,
                currency: invoice.currency,
                status: invoice.status,
                source: 'stripe_sync'
              }),
              dateRecorded: new Date(invoice.created * 1000)
            }
          })
        }
      }

      hasMore = result.hasMore
      if (hasMore && result.data.length > 0) {
        startingAfter = result.data[result.data.length - 1].id
      }
    }
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(
  integrationId: string,
  event: StripeWebhookEvent
): Promise<{ success: boolean; processed: number; error?: string }> {
  try {
    console.log(`Processing Stripe webhook: ${event.type} for integration ${integrationId}`)

    switch (event.type) {
      case 'payment_intent.succeeded':
        return await processPaymentIntentSucceeded(integrationId, event)
      
      case 'payment_intent.payment_failed':
        return await processPaymentIntentFailed(integrationId, event)
      
      case 'charge.succeeded':
        return await processChargeSucceeded(integrationId, event)
      
      case 'charge.failed':
        return await processChargeFailed(integrationId, event)
      
      case 'charge.dispute.created':
        return await processChargeDispute(integrationId, event)
      
      case 'customer.created':
        return await processCustomerCreated(integrationId, event)
      
      case 'customer.updated':
        return await processCustomerUpdated(integrationId, event)
      
      case 'customer.subscription.created':
        return await processSubscriptionCreated(integrationId, event)
      
      case 'customer.subscription.updated':
        return await processSubscriptionUpdated(integrationId, event)
      
      case 'customer.subscription.deleted':
        return await processSubscriptionDeleted(integrationId, event)
      
      case 'invoice.paid':
        return await processInvoicePaid(integrationId, event)
      
      case 'invoice.payment_failed':
        return await processInvoicePaymentFailed(integrationId, event)
      
      case 'checkout.session.completed':
        return await processCheckoutCompleted(integrationId, event)
      
      default:
        console.log(`Unhandled Stripe webhook event type: ${event.type}`)
        return { success: true, processed: 0 }
    }

  } catch (error) {
    console.error(`Error handling Stripe webhook ${event.type}:`, error)
    return {
      success: false,
      processed: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Webhook processing functions
async function processPaymentIntentSucceeded(
  integrationId: string,
  event: StripeWebhookEvent
): Promise<{ success: boolean; processed: number }> {
  const paymentIntent = event.data.object
  const amount = paymentIntent.amount / 100

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'revenue',
      value: amount,
      metadata: JSON.stringify({
        paymentIntentId: paymentIntent.id,
        currency: paymentIntent.currency,
        customerId: paymentIntent.customer,
        paymentMethod: paymentIntent.payment_method_types?.join(','),
        source: 'stripe_webhook'
      }),
      dateRecorded: new Date(event.created * 1000)
    }
  })

  return { success: true, processed: 1 }
}

async function processPaymentIntentFailed(
  integrationId: string,
  event: StripeWebhookEvent
): Promise<{ success: boolean; processed: number }> {
  const paymentIntent = event.data.object

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'payment_failed',
      value: paymentIntent.amount / 100,
      metadata: JSON.stringify({
        paymentIntentId: paymentIntent.id,
        currency: paymentIntent.currency,
        customerId: paymentIntent.customer,
        failureCode: paymentIntent.last_payment_error?.code,
        failureMessage: paymentIntent.last_payment_error?.message,
        source: 'stripe_webhook'
      }),
      dateRecorded: new Date(event.created * 1000)
    }
  })

  return { success: true, processed: 1 }
}

async function processChargeSucceeded(
  integrationId: string,
  event: StripeWebhookEvent
): Promise<{ success: boolean; processed: number }> {
  const charge = event.data.object

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'revenue',
      value: charge.amount / 100,
      metadata: JSON.stringify({
        chargeId: charge.id,
        currency: charge.currency,
        customerId: charge.customer,
        paymentMethod: charge.payment_method_details?.type,
        description: charge.description,
        source: 'stripe_webhook'
      }),
      dateRecorded: new Date(event.created * 1000)
    }
  })

  return { success: true, processed: 1 }
}

async function processChargeFailed(
  integrationId: string,
  event: StripeWebhookEvent
): Promise<{ success: boolean; processed: number }> {
  const charge = event.data.object

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'charge_failed',
      value: charge.amount / 100,
      metadata: JSON.stringify({
        chargeId: charge.id,
        currency: charge.currency,
        customerId: charge.customer,
        failureCode: charge.failure_code,
        failureMessage: charge.failure_message,
        source: 'stripe_webhook'
      }),
      dateRecorded: new Date(event.created * 1000)
    }
  })

  return { success: true, processed: 1 }
}

async function processChargeDispute(
  integrationId: string,
  event: StripeWebhookEvent
): Promise<{ success: boolean; processed: number }> {
  const dispute = event.data.object

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'chargeback',
      value: dispute.amount / 100,
      metadata: JSON.stringify({
        disputeId: dispute.id,
        chargeId: dispute.charge,
        currency: dispute.currency,
        reason: dispute.reason,
        status: dispute.status,
        source: 'stripe_webhook'
      }),
      dateRecorded: new Date(event.created * 1000)
    }
  })

  return { success: true, processed: 1 }
}

async function processCustomerCreated(
  integrationId: string,
  event: StripeWebhookEvent
): Promise<{ success: boolean; processed: number }> {
  const customer = event.data.object

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'customer_created',
      value: 1,
      metadata: JSON.stringify({
        customerId: customer.id,
        email: customer.email,
        name: customer.name,
        source: 'stripe_webhook'
      }),
      dateRecorded: new Date(event.created * 1000)
    }
  })

  return { success: true, processed: 1 }
}

async function processCustomerUpdated(
  integrationId: string,
  event: StripeWebhookEvent
): Promise<{ success: boolean; processed: number }> {
  const customer = event.data.object

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'customer_updated',
      value: 1,
      metadata: JSON.stringify({
        customerId: customer.id,
        email: customer.email,
        name: customer.name,
        previousAttributes: event.data.previous_attributes,
        source: 'stripe_webhook'
      }),
      dateRecorded: new Date(event.created * 1000)
    }
  })

  return { success: true, processed: 1 }
}

async function processSubscriptionCreated(
  integrationId: string,
  event: StripeWebhookEvent
): Promise<{ success: boolean; processed: number }> {
  const subscription = event.data.object
  const amount = subscription.items.data[0]?.price?.unit_amount / 100 || 0

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'subscription_created',
      value: amount,
      metadata: JSON.stringify({
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
        priceId: subscription.items.data[0]?.price?.id,
        interval: subscription.items.data[0]?.price?.recurring?.interval,
        source: 'stripe_webhook'
      }),
      dateRecorded: new Date(event.created * 1000)
    }
  })

  return { success: true, processed: 1 }
}

async function processSubscriptionUpdated(
  integrationId: string,
  event: StripeWebhookEvent
): Promise<{ success: boolean; processed: number }> {
  const subscription = event.data.object
  const amount = subscription.items.data[0]?.price?.unit_amount / 100 || 0

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'subscription_updated',
      value: amount,
      metadata: JSON.stringify({
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
        priceId: subscription.items.data[0]?.price?.id,
        previousAttributes: event.data.previous_attributes,
        source: 'stripe_webhook'
      }),
      dateRecorded: new Date(event.created * 1000)
    }
  })

  return { success: true, processed: 1 }
}

async function processSubscriptionDeleted(
  integrationId: string,
  event: StripeWebhookEvent
): Promise<{ success: boolean; processed: number }> {
  const subscription = event.data.object

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'subscription_cancelled',
      value: 1,
      metadata: JSON.stringify({
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        canceledAt: subscription.canceled_at,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        source: 'stripe_webhook'
      }),
      dateRecorded: new Date(event.created * 1000)
    }
  })

  return { success: true, processed: 1 }
}

async function processInvoicePaid(
  integrationId: string,
  event: StripeWebhookEvent
): Promise<{ success: boolean; processed: number }> {
  const invoice = event.data.object

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'invoice_paid',
      value: invoice.amount_paid / 100,
      metadata: JSON.stringify({
        invoiceId: invoice.id,
        customerId: invoice.customer,
        subscriptionId: invoice.subscription,
        currency: invoice.currency,
        paidAt: invoice.status_transitions?.paid_at,
        source: 'stripe_webhook'
      }),
      dateRecorded: new Date(event.created * 1000)
    }
  })

  return { success: true, processed: 1 }
}

async function processInvoicePaymentFailed(
  integrationId: string,
  event: StripeWebhookEvent
): Promise<{ success: boolean; processed: number }> {
  const invoice = event.data.object

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'invoice_payment_failed',
      value: invoice.amount_due / 100,
      metadata: JSON.stringify({
        invoiceId: invoice.id,
        customerId: invoice.customer,
        subscriptionId: invoice.subscription,
        currency: invoice.currency,
        attemptCount: invoice.attempt_count,
        source: 'stripe_webhook'
      }),
      dateRecorded: new Date(event.created * 1000)
    }
  })

  return { success: true, processed: 1 }
}

async function processCheckoutCompleted(
  integrationId: string,
  event: StripeWebhookEvent
): Promise<{ success: boolean; processed: number }> {
  const session = event.data.object

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'checkout_completed',
      value: session.amount_total / 100,
      metadata: JSON.stringify({
        sessionId: session.id,
        customerId: session.customer,
        currency: session.currency,
        mode: session.mode,
        paymentStatus: session.payment_status,
        source: 'stripe_webhook'
      }),
      dateRecorded: new Date(event.created * 1000)
    }
  })

  return { success: true, processed: 1 }
}