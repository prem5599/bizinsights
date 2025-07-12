// src/lib/integrations/stripe.ts
import { prisma } from '@/lib/prisma'

/**
 * Stripe Integration Class
 */
export class StripeIntegration {
  private accessToken: string
  private apiVersion: string = '2023-10-16'

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  /**
   * Make authenticated API request to Stripe
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `https://api.stripe.com/v1/${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Stripe-Version': this.apiVersion,
        'Content-Type': 'application/x-www-form-urlencoded',
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Stripe API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`)
    }

    return response.json()
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<any> {
    return this.makeRequest('account')
  }

  /**
   * Get recent charges
   */
  async getCharges(limit: number = 100, startingAfter?: string): Promise<any[]> {
    let endpoint = `charges?limit=${limit}`
    if (startingAfter) {
      endpoint += `&starting_after=${startingAfter}`
    }
    
    const data = await this.makeRequest(endpoint)
    return data.data || []
  }

  /**
   * Get customers
   */
  async getCustomers(limit: number = 100, startingAfter?: string): Promise<any[]> {
    let endpoint = `customers?limit=${limit}`
    if (startingAfter) {
      endpoint += `&starting_after=${startingAfter}`
    }
    
    const data = await this.makeRequest(endpoint)
    return data.data || []
  }

  /**
   * Get payment intents
   */
  async getPaymentIntents(limit: number = 100, startingAfter?: string): Promise<any[]> {
    let endpoint = `payment_intents?limit=${limit}`
    if (startingAfter) {
      endpoint += `&starting_after=${startingAfter}`
    }
    
    const data = await this.makeRequest(endpoint)
    return data.data || []
  }

  /**
   * Get subscriptions
   */
  async getSubscriptions(limit: number = 100, startingAfter?: string): Promise<any[]> {
    let endpoint = `subscriptions?limit=${limit}`
    if (startingAfter) {
      endpoint += `&starting_after=${startingAfter}`
    }
    
    const data = await this.makeRequest(endpoint)
    return data.data || []
  }

  /**
   * Get invoices
   */
  async getInvoices(limit: number = 100, startingAfter?: string): Promise<any[]> {
    let endpoint = `invoices?limit=${limit}`
    if (startingAfter) {
      endpoint += `&starting_after=${startingAfter}`
    }
    
    const data = await this.makeRequest(endpoint)
    return data.data || []
  }

  /**
   * Create webhook endpoint
   */
  async createWebhook(url: string, events: string[]): Promise<any> {
    const body = new URLSearchParams({
      url,
      'enabled_events[]': events.join(',')
    })

    return this.makeRequest('webhook_endpoints', {
      method: 'POST',
      body: body.toString()
    })
  }

  /**
   * Get existing webhooks
   */
  async getWebhooks(): Promise<any[]> {
    const data = await this.makeRequest('webhook_endpoints')
    return data.data || []
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.makeRequest(`webhook_endpoints/${webhookId}`, {
      method: 'DELETE'
    })
  }

  /**
   * Test the connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const account = await this.getAccountInfo()
      return !!account.id
    } catch (error) {
      console.error('Stripe connection test failed:', error)
      return false
    }
  }

  /**
   * Setup required webhooks for the integration
   */
  async setupWebhooks(organizationId: string): Promise<string[]> {
    const webhookEvents = [
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'charge.succeeded',
      'charge.failed',
      'charge.dispute.created',
      'customer.created',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.paid',
      'invoice.payment_failed',
      'checkout.session.completed'
    ]

    const baseUrl = process.env.APP_URL || 'https://your-app.com'
    const webhookUrl = `${baseUrl}/api/webhooks/stripe?org=${organizationId}`

    try {
      const webhook = await this.createWebhook(webhookUrl, webhookEvents)
      console.log(`Created Stripe webhook: ${webhook.id}`)
      return [webhook.url]
    } catch (error) {
      console.error('Failed to create Stripe webhook:', error)
      return []
    }
  }

  /**
   * Get historical data for initial sync
   */
  async getHistoricalData(days: number = 30): Promise<{
    charges: any[];
    customers: any[];
    subscriptions: any[];
    invoices: any[];
  }> {
    const sinceTimestamp = Math.floor((Date.now() - (days * 24 * 60 * 60 * 1000)) / 1000)

    try {
      const [charges, customers, subscriptions, invoices] = await Promise.all([
        this.makeRequest(`charges?created[gte]=${sinceTimestamp}&limit=100`),
        this.makeRequest(`customers?created[gte]=${sinceTimestamp}&limit=100`),
        this.makeRequest(`subscriptions?created[gte]=${sinceTimestamp}&limit=100`),
        this.makeRequest(`invoices?created[gte]=${sinceTimestamp}&limit=100`)
      ])

      return {
        charges: charges.data || [],
        customers: customers.data || [],
        subscriptions: subscriptions.data || [],
        invoices: invoices.data || []
      }
    } catch (error) {
      console.error('Error fetching Stripe historical data:', error)
      throw error
    }
  }

  /**
   * Get balance and transactions
   */
  async getBalance(): Promise<any> {
    return this.makeRequest('balance')
  }

  /**
   * Get balance transactions
   */
  async getBalanceTransactions(limit: number = 100): Promise<any[]> {
    const data = await this.makeRequest(`balance_transactions?limit=${limit}`)
    return data.data || []
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(
  integrationId: string,
  event: any
): Promise<{ success: boolean; error?: string; processed?: number }> {
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
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Process successful payment intent
 */
async function processPaymentIntentSucceeded(
  integrationId: string,
  event: any
): Promise<{ success: boolean; processed: number }> {
  try {
    const paymentIntent = event.data.object
    const amount = paymentIntent.amount / 100 // Convert cents to dollars

    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'revenue',
        value: amount,
        metadata: {
          paymentIntentId: paymentIntent.id,
          currency: paymentIntent.currency,
          customerId: paymentIntent.customer,
          paymentMethod: paymentIntent.payment_method_types?.[0],
          receiptEmail: paymentIntent.receipt_email,
          source: 'stripe_webhook'
        },
        dateRecorded: new Date(event.created * 1000)
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Error processing payment intent succeeded:', error)
    throw error
  }
}

/**
 * Process failed payment intent
 */
async function processPaymentIntentFailed(
  integrationId: string,
  event: any
): Promise<{ success: boolean; processed: number }> {
  try {
    const paymentIntent = event.data.object

    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'payment_failed',
        value: paymentIntent.amount / 100,
        metadata: {
          paymentIntentId: paymentIntent.id,
          currency: paymentIntent.currency,
          customerId: paymentIntent.customer,
          failureCode: paymentIntent.last_payment_error?.code,
          failureMessage: paymentIntent.last_payment_error?.message,
          source: 'stripe_webhook'
        },
        dateRecorded: new Date(event.created * 1000)
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Error processing payment intent failed:', error)
    throw error
  }
}

/**
 * Process successful charge
 */
async function processChargeSucceeded(
  integrationId: string,
  event: any
): Promise<{ success: boolean; processed: number }> {
  try {
    const charge = event.data.object

    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'charge_succeeded',
        value: charge.amount / 100,
        metadata: {
          chargeId: charge.id,
          currency: charge.currency,
          customerId: charge.customer,
          paymentMethodType: charge.payment_method_details?.type,
          receiptUrl: charge.receipt_url,
          source: 'stripe_webhook'
        },
        dateRecorded: new Date(event.created * 1000)
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Error processing charge succeeded:', error)
    throw error
  }
}

/**
 * Process failed charge
 */
async function processChargeFailed(
  integrationId: string,
  event: any
): Promise<{ success: boolean; processed: number }> {
  try {
    const charge = event.data.object

    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'charge_failed',
        value: charge.amount / 100,
        metadata: {
          chargeId: charge.id,
          currency: charge.currency,
          customerId: charge.customer,
          failureCode: charge.failure_code,
          failureMessage: charge.failure_message,
          source: 'stripe_webhook'
        },
        dateRecorded: new Date(event.created * 1000)
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Error processing charge failed:', error)
    throw error
  }
}

/**
 * Process charge dispute
 */
async function processChargeDispute(
  integrationId: string,
  event: any
): Promise<{ success: boolean; processed: number }> {
  try {
    const dispute = event.data.object

    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'dispute_created',
        value: dispute.amount / 100,
        metadata: {
          disputeId: dispute.id,
          chargeId: dispute.charge,
          reason: dispute.reason,
          status: dispute.status,
          currency: dispute.currency,
          source: 'stripe_webhook'
        },
        dateRecorded: new Date(event.created * 1000)
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Error processing charge dispute:', error)
    throw error
  }
}

/**
 * Process customer creation
 */
async function processCustomerCreated(
  integrationId: string,
  event: any
): Promise<{ success: boolean; processed: number }> {
  try {
    const customer = event.data.object

    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'customers',
        value: 1,
        metadata: {
          customerId: customer.id,
          email: customer.email,
          name: customer.name,
          description: customer.description,
          source: 'stripe_webhook'
        },
        dateRecorded: new Date(event.created * 1000)
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Error processing customer created:', error)
    throw error
  }
}

/**
 * Process subscription creation
 */
async function processSubscriptionCreated(
  integrationId: string,
  event: any
): Promise<{ success: boolean; processed: number }> {
  try {
    const subscription = event.data.object
    const amount = subscription.items.data[0]?.price?.unit_amount / 100 || 0

    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'subscription_created',
        value: amount,
        metadata: {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
          priceId: subscription.items.data[0]?.price?.id,
          interval: subscription.items.data[0]?.price?.recurring?.interval,
          source: 'stripe_webhook'
        },
        dateRecorded: new Date(event.created * 1000)
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Error processing subscription created:', error)
    throw error
  }
}

/**
 * Process subscription update
 */
async function processSubscriptionUpdated(
  integrationId: string,
  event: any
): Promise<{ success: boolean; processed: number }> {
  try {
    const subscription = event.data.object
    const amount = subscription.items.data[0]?.price?.unit_amount / 100 || 0

    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'subscription_updated',
        value: amount,
        metadata: {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
          priceId: subscription.items.data[0]?.price?.id,
          previousAttributes: event.data.previous_attributes,
          source: 'stripe_webhook'
        },
        dateRecorded: new Date(event.created * 1000)
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Error processing subscription updated:', error)
    throw error
  }
}

/**
 * Process subscription deletion
 */
async function processSubscriptionDeleted(
  integrationId: string,
  event: any
): Promise<{ success: boolean; processed: number }> {
  try {
    const subscription = event.data.object

    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'subscription_cancelled',
        value: 1,
        metadata: {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          canceledAt: subscription.canceled_at,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          source: 'stripe_webhook'
        },
        dateRecorded: new Date(event.created * 1000)
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Error processing subscription deleted:', error)
    throw error
  }
}

/**
 * Process invoice payment
 */
async function processInvoicePaid(
  integrationId: string,
  event: any
): Promise<{ success: boolean; processed: number }> {
  try {
    const invoice = event.data.object

    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'invoice_paid',
        value: invoice.amount_paid / 100,
        metadata: {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          subscriptionId: invoice.subscription,
          currency: invoice.currency,
          paidAt: invoice.status_transitions?.paid_at,
          source: 'stripe_webhook'
        },
        dateRecorded: new Date(event.created * 1000)
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Error processing invoice paid:', error)
    throw error
  }
}

/**
 * Process invoice payment failure
 */
async function processInvoicePaymentFailed(
  integrationId: string,
  event: any
): Promise<{ success: boolean; processed: number }> {
  try {
    const invoice = event.data.object

    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'invoice_payment_failed',
        value: invoice.amount_due / 100,
        metadata: {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          subscriptionId: invoice.subscription,
          currency: invoice.currency,
          attemptCount: invoice.attempt_count,
          source: 'stripe_webhook'
        },
        dateRecorded: new Date(event.created * 1000)
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Error processing invoice payment failed:', error)
    throw error
  }
}

/**
 * Process checkout session completion
 */
async function processCheckoutCompleted(
  integrationId: string,
  event: any
): Promise<{ success: boolean; processed: number }> {
  try {
    const session = event.data.object

    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'checkout_completed',
        value: session.amount_total / 100,
        metadata: {
          sessionId: session.id,
          customerId: session.customer,
          paymentIntentId: session.payment_intent,
          currency: session.currency,
          mode: session.mode,
          source: 'stripe_webhook'
        },
        dateRecorded: new Date(event.created * 1000)
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Error processing checkout completed:', error)
    throw error
  }
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  state: string
): Promise<{ access_token: string; stripe_user_id: string; scope: string }> {
  const response = await fetch('https://connect.stripe.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_secret: process.env.STRIPE_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code'
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Failed to exchange code for token: ${response.status} ${response.statusText} - ${errorData.error_description || 'Unknown error'}`)
  }

  return response.json()
}

/**
 * Generate OAuth authorization URL
 */
export function generateAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.STRIPE_CLIENT_ID!,
    scope: 'read_write',
    redirect_uri: `${process.env.APP_URL}/api/integrations/stripe/callback`,
    state
  })

  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`
}