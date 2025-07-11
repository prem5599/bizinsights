// src/lib/integrations/stripe.ts
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

interface StripeConfig {
  secretKey: string
  apiVersion?: string
}

interface StripeCharge {
  id: string
  amount: number
  amount_captured: number
  amount_refunded: number
  currency: string
  created: number
  description: string | null
  status: string
  paid: boolean
  refunded: boolean
  customer: string | null
  invoice: string | null
  metadata: Record<string, string>
  outcome?: {
    network_status: string
    reason: string | null
    risk_level: string
    type: string
  }
}

interface StripePaymentIntent {
  id: string
  amount: number
  amount_received: number
  currency: string
  created: number
  status: string
  customer: string | null
  description: string | null
  metadata: Record<string, string>
  charges: {
    data: StripeCharge[]
  }
}

interface StripeSubscription {
  id: string
  customer: string
  status: string
  current_period_start: number
  current_period_end: number
  created: number
  plan?: {
    id: string
    amount: number
    currency: string
    interval: string
    product: string
  }
  items: {
    data: Array<{
      id: string
      price: {
        id: string
        unit_amount: number
        currency: string
        recurring: {
          interval: string
        }
      }
    }>
  }
  metadata: Record<string, string>
}

interface StripeCustomer {
  id: string
  email: string | null
  name: string | null
  created: number
  metadata: Record<string, string>
  subscriptions?: {
    data: StripeSubscription[]
  }
}

interface StripeRefund {
  id: string
  amount: number
  charge: string
  created: number
  currency: string
  reason: string | null
  status: string
  metadata: Record<string, string>
}

export class StripeConnector {
  private config: StripeConfig
  private baseUrl: string

  constructor(config: StripeConfig) {
    this.config = {
      ...config,
      apiVersion: config.apiVersion || '2023-10-16'
    }
    this.baseUrl = 'https://api.stripe.com/v1'
  }

  // Main sync function
  async syncData(integrationId: string, lastSyncAt?: Date): Promise<{ success: boolean; error?: string; stats?: any }> {
    try {
      console.log(`Starting Stripe sync for integration ${integrationId}`)
      
      // Validate connection first
      const account = await this.getAccount()
      if (!account) {
        throw new Error('Failed to connect to Stripe account')
      }

      const stats = {
        charges: 0,
        paymentIntents: 0,
        subscriptions: 0,
        customers: 0,
        revenue: 0,
        refunds: 0
      }

      // Sync charges (most important for revenue tracking)
      const chargeStats = await this.syncCharges(integrationId, lastSyncAt)
      stats.charges = chargeStats.count
      stats.revenue += chargeStats.revenue

      // Sync payment intents
      const paymentIntentStats = await this.syncPaymentIntents(integrationId, lastSyncAt)
      stats.paymentIntents = paymentIntentStats.count
      stats.revenue += paymentIntentStats.revenue

      // Sync subscriptions
      const subscriptionStats = await this.syncSubscriptions(integrationId, lastSyncAt)
      stats.subscriptions = subscriptionStats.count

      // Sync customers (less frequent)
      if (!lastSyncAt || this.shouldSyncCustomers(lastSyncAt)) {
        const customerStats = await this.syncCustomers(integrationId)
        stats.customers = customerStats.count
      }

      // Sync refunds
      const refundStats = await this.syncRefunds(integrationId, lastSyncAt)
      stats.refunds = refundStats.count

      // Update integration sync timestamp
      await prisma.integration.update({
        where: { id: integrationId },
        data: { 
          lastSyncAt: new Date(),
          status: 'active'
        }
      })

      console.log(`Stripe sync completed for integration ${integrationId}:`, stats)
      return { success: true, stats }

    } catch (error) {
      console.error(`Stripe sync failed for integration ${integrationId}:`, error)
      
      // Update integration status to error
      await prisma.integration.update({
        where: { id: integrationId },
        data: { status: 'error' }
      })

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  // Sync charges
  private async syncCharges(integrationId: string, lastSyncAt?: Date): Promise<{ count: number; revenue: number }> {
    let allCharges: StripeCharge[] = []
    let hasMore = true
    let startingAfter: string | undefined
    let totalRevenue = 0

    // Determine sync date range
    const sinceTimestamp = lastSyncAt ? Math.floor(lastSyncAt.getTime() / 1000) : Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)

    try {
      while (hasMore && allCharges.length < 10000) {
        const response = await this.fetchCharges({
          limit: 100,
          created: { gte: sinceTimestamp },
          starting_after: startingAfter
        })

        allCharges = allCharges.concat(response.data)
        hasMore = response.has_more
        
        if (response.data.length > 0) {
          startingAfter = response.data[response.data.length - 1].id
        }

        // Rate limiting
        await this.delay(100)
      }

      console.log(`Fetched ${allCharges.length} charges from Stripe`)

      // Process charges and create data points
      const dataPoints = []
      
      for (const charge of allCharges) {
        // Only count successful charges
        if (charge.status === 'succeeded' && charge.paid) {
          const chargeAmount = charge.amount / 100 // Convert from cents
          totalRevenue += chargeAmount

          // Create revenue data point
          dataPoints.push({
            integrationId,
            metricType: 'stripe_revenue',
            value: new Decimal(chargeAmount),
            metadata: {
              chargeId: charge.id,
              currency: charge.currency,
              status: charge.status,
              customerId: charge.customer,
              description: charge.description,
              refunded: charge.refunded,
              amountRefunded: charge.amount_refunded / 100,
              riskLevel: charge.outcome?.risk_level,
              networkStatus: charge.outcome?.network_status
            },
            dateRecorded: new Date(charge.created * 1000)
          })

          // Create transaction count data point
          dataPoints.push({
            integrationId,
            metricType: 'stripe_transactions',
            value: new Decimal(1),
            metadata: {
              chargeId: charge.id,
              amount: chargeAmount,
              currency: charge.currency,
              customerId: charge.customer
            },
            dateRecorded: new Date(charge.created * 1000)
          })
        }
      }

      // Batch create data points
      if (dataPoints.length > 0) {
        await this.batchCreateDataPoints(dataPoints)
      }

      return { count: allCharges.length, revenue: totalRevenue }

    } catch (error) {
      console.error('Error syncing Stripe charges:', error)
      throw error
    }
  }

  // Sync payment intents
  private async syncPaymentIntents(integrationId: string, lastSyncAt?: Date): Promise<{ count: number; revenue: number }> {
    let allPaymentIntents: StripePaymentIntent[] = []
    let hasMore = true
    let startingAfter: string | undefined
    let totalRevenue = 0

    const sinceTimestamp = lastSyncAt ? Math.floor(lastSyncAt.getTime() / 1000) : Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)

    try {
      while (hasMore && allPaymentIntents.length < 5000) {
        const response = await this.fetchPaymentIntents({
          limit: 100,
          created: { gte: sinceTimestamp },
          starting_after: startingAfter
        })

        allPaymentIntents = allPaymentIntents.concat(response.data)
        hasMore = response.has_more

        if (response.data.length > 0) {
          startingAfter = response.data[response.data.length - 1].id
        }

        await this.delay(100)
      }

      // Process successful payment intents
      const dataPoints = []
      
      for (const pi of allPaymentIntents) {
        if (pi.status === 'succeeded' && pi.amount_received > 0) {
          const amount = pi.amount_received / 100
          totalRevenue += amount

          dataPoints.push({
            integrationId,
            metricType: 'stripe_payment_intents',
            value: new Decimal(amount),
            metadata: {
              paymentIntentId: pi.id,
              currency: pi.currency,
              status: pi.status,
              customerId: pi.customer,
              description: pi.description,
              chargeCount: pi.charges.data.length
            },
            dateRecorded: new Date(pi.created * 1000)
          })
        }
      }

      if (dataPoints.length > 0) {
        await this.batchCreateDataPoints(dataPoints)
      }

      return { count: allPaymentIntents.length, revenue: totalRevenue }

    } catch (error) {
      console.error('Error syncing Stripe payment intents:', error)
      throw error
    }
  }

  // Sync subscriptions
  private async syncSubscriptions(integrationId: string, lastSyncAt?: Date): Promise<{ count: number }> {
    let allSubscriptions: StripeSubscription[] = []
    let hasMore = true
    let startingAfter: string | undefined

    const sinceTimestamp = lastSyncAt ? Math.floor(lastSyncAt.getTime() / 1000) : undefined

    try {
      while (hasMore && allSubscriptions.length < 5000) {
        const params: any = {
          limit: 100,
          starting_after: startingAfter
        }
        
        if (sinceTimestamp) {
          params.created = { gte: sinceTimestamp }
        }

        const response = await this.fetchSubscriptions(params)
        allSubscriptions = allSubscriptions.concat(response.data)
        hasMore = response.has_more

        if (response.data.length > 0) {
          startingAfter = response.data[response.data.length - 1].id
        }

        await this.delay(100)
      }

      // Process subscriptions
      const dataPoints = []
      
      for (const subscription of allSubscriptions) {
        // Calculate MRR (Monthly Recurring Revenue)
        let mrr = 0
        
        for (const item of subscription.items.data) {
          const amount = item.price.unit_amount / 100
          const interval = item.price.recurring.interval
          
          // Convert to monthly amount
          switch (interval) {
            case 'month':
              mrr += amount
              break
            case 'year':
              mrr += amount / 12
              break
            case 'week':
              mrr += amount * 4.33 // Average weeks per month
              break
            case 'day':
              mrr += amount * 30 // Average days per month
              break
          }
        }

        dataPoints.push({
          integrationId,
          metricType: 'stripe_mrr',
          value: new Decimal(mrr),
          metadata: {
            subscriptionId: subscription.id,
            customerId: subscription.customer,
            status: subscription.status,
            planCount: subscription.items.data.length,
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end
          },
          dateRecorded: new Date(subscription.created * 1000)
        })

        // Active subscription count
        if (['active', 'trialing'].includes(subscription.status)) {
          dataPoints.push({
            integrationId,
            metricType: 'stripe_active_subscriptions',
            value: new Decimal(1),
            metadata: {
              subscriptionId: subscription.id,
              customerId: subscription.customer,
              status: subscription.status,
              mrr: mrr
            },
            dateRecorded: new Date(subscription.created * 1000)
          })
        }
      }

      if (dataPoints.length > 0) {
        await this.batchCreateDataPoints(dataPoints)
      }

      return { count: allSubscriptions.length }

    } catch (error) {
      console.error('Error syncing Stripe subscriptions:', error)
      throw error
    }
  }

  // Sync customers
  private async syncCustomers(integrationId: string): Promise<{ count: number }> {
    let allCustomers: StripeCustomer[] = []
    let hasMore = true
    let startingAfter: string | undefined

    try {
      while (hasMore && allCustomers.length < 10000) {
        const response = await this.fetchCustomers({
          limit: 100,
          starting_after: startingAfter
        })

        allCustomers = allCustomers.concat(response.data)
        hasMore = response.has_more

        if (response.data.length > 0) {
          startingAfter = response.data[response.data.length - 1].id
        }

        await this.delay(100)
      }

      // Create customer data points
      const dataPoints = allCustomers.map(customer => ({
        integrationId,
        metricType: 'stripe_customers',
        value: new Decimal(1),
        metadata: {
          customerId: customer.id,
          email: customer.email,
          name: customer.name,
          subscriptionCount: customer.subscriptions?.data.length || 0
        },
        dateRecorded: new Date(customer.created * 1000)
      }))

      if (dataPoints.length > 0) {
        await this.batchCreateDataPoints(dataPoints)
      }

      return { count: allCustomers.length }

    } catch (error) {
      console.error('Error syncing Stripe customers:', error)
      throw error
    }
  }

  // Sync refunds
  private async syncRefunds(integrationId: string, lastSyncAt?: Date): Promise<{ count: number }> {
    let allRefunds: StripeRefund[] = []
    let hasMore = true
    let startingAfter: string | undefined

    const sinceTimestamp = lastSyncAt ? Math.floor(lastSyncAt.getTime() / 1000) : Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)

    try {
      while (hasMore && allRefunds.length < 5000) {
        const response = await this.fetchRefunds({
          limit: 100,
          created: { gte: sinceTimestamp },
          starting_after: startingAfter
        })

        allRefunds = allRefunds.concat(response.data)
        hasMore = response.has_more

        if (response.data.length > 0) {
          startingAfter = response.data[response.data.length - 1].id
        }

        await this.delay(100)
      }

      // Process refunds (negative revenue)
      const dataPoints = allRefunds
        .filter(refund => refund.status === 'succeeded')
        .map(refund => ({
          integrationId,
          metricType: 'stripe_refunds',
          value: new Decimal(-(refund.amount / 100)),
          metadata: {
            refundId: refund.id,
            chargeId: refund.charge,
            currency: refund.currency,
            reason: refund.reason,
            status: refund.status
          },
          dateRecorded: new Date(refund.created * 1000)
        }))

      if (dataPoints.length > 0) {
        await this.batchCreateDataPoints(dataPoints)
      }

      return { count: allRefunds.length }

    } catch (error) {
      console.error('Error syncing Stripe refunds:', error)
      throw error
    }
  }

  // API Methods
  private async fetchCharges(params: Record<string, any>): Promise<{ data: StripeCharge[]; has_more: boolean }> {
    const url = new URL(`${this.baseUrl}/charges`)
    this.addParamsToUrl(url, params)
    return this.makeRequest(url.toString())
  }

  private async fetchPaymentIntents(params: Record<string, any>): Promise<{ data: StripePaymentIntent[]; has_more: boolean }> {
    const url = new URL(`${this.baseUrl}/payment_intents`)
    this.addParamsToUrl(url, params)
    return this.makeRequest(url.toString())
  }

  private async fetchSubscriptions(params: Record<string, any>): Promise<{ data: StripeSubscription[]; has_more: boolean }> {
    const url = new URL(`${this.baseUrl}/subscriptions`)
    this.addParamsToUrl(url, params)
    return this.makeRequest(url.toString())
  }

  private async fetchCustomers(params: Record<string, any>): Promise<{ data: StripeCustomer[]; has_more: boolean }> {
    const url = new URL(`${this.baseUrl}/customers`)
    this.addParamsToUrl(url, params)
    return this.makeRequest(url.toString())
  }

  private async fetchRefunds(params: Record<string, any>): Promise<{ data: StripeRefund[]; has_more: boolean }> {
    const url = new URL(`${this.baseUrl}/refunds`)
    this.addParamsToUrl(url, params)
    return this.makeRequest(url.toString())
  }

  private async getAccount(): Promise<any> {
    try {
      return await this.makeRequest(`${this.baseUrl}/account`)
    } catch (error) {
      console.error('Failed to get Stripe account:', error)
      return null
    }
  }

  // Utility Methods
  private async makeRequest(url: string): Promise<any> {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.config.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': this.config.apiVersion!,
        'User-Agent': 'BizInsights/1.0'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Stripe API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response.json()
  }

  private addParamsToUrl(url: URL, params: Record<string, any>): void {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          // Handle nested objects like { gte: timestamp }
          Object.entries(value).forEach(([subKey, subValue]) => {
            url.searchParams.append(`${key}[${subKey}]`, subValue.toString())
          })
        } else {
          url.searchParams.append(key, value.toString())
        }
      }
    })
  }

  private async batchCreateDataPoints(dataPoints: any[]): Promise<void> {
    const batchSize = 1000
    
    for (let i = 0; i < dataPoints.length; i += batchSize) {
      const batch = dataPoints.slice(i, i + batchSize)
      
      try {
        await prisma.dataPoint.createMany({
          data: batch,
          skipDuplicates: true
        })
      } catch (error) {
        console.error(`Failed to create batch ${i / batchSize + 1}:`, error)
      }
    }
  }

  private shouldSyncCustomers(lastSyncAt: Date): boolean {
    const hoursAgo = (Date.now() - lastSyncAt.getTime()) / (1000 * 60 * 60)
    return hoursAgo > 24 // Sync customers only once per day
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Helper function to create Stripe connector instance
export function createStripeConnector(config: StripeConfig): StripeConnector {
  return new StripeConnector(config)
}

// Webhook handler for real-time updates
export async function handleStripeWebhook(
  integrationId: string,
  eventType: string,
  data: any
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Handling Stripe webhook: ${eventType} for integration ${integrationId}`)

    switch (eventType) {
      case 'charge.succeeded':
        await handleChargeSucceeded(integrationId, data.object)
        break
      
      case 'charge.failed':
        await handleChargeFailed(integrationId, data.object)
        break
      
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(integrationId, data.object)
        break
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(integrationId, data.object)
        break
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(integrationId, data.object)
        break
      
      case 'charge.dispute.created':
        await handleChargeDispute(integrationId, data.object)
        break
      
      default:
        console.log(`Unhandled webhook event: ${eventType}`)
    }

    return { success: true }
    
  } catch (error) {
    console.error(`Webhook handling failed for ${eventType}:`, error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

async function handleChargeSucceeded(integrationId: string, charge: StripeCharge): Promise<void> {
  const amount = charge.amount / 100

  const dataPoints = [
    {
      integrationId,
      metricType: 'stripe_revenue',
      value: new Decimal(amount),
      metadata: {
        chargeId: charge.id,
        currency: charge.currency,
        customerId: charge.customer,
        webhook: true
      },
      dateRecorded: new Date(charge.created * 1000)
    },
    {
      integrationId,
      metricType: 'stripe_transactions',
      value: new Decimal(1),
      metadata: {
        chargeId: charge.id,
        amount: amount,
        currency: charge.currency,
        webhook: true
      },
      dateRecorded: new Date(charge.created * 1000)
    }
  ]

  await prisma.dataPoint.createMany({
    data: dataPoints,
    skipDuplicates: true
  })
}

async function handleChargeFailed(integrationId: string, charge: StripeCharge): Promise<void> {
  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'stripe_failed_charges',
      value: new Decimal(1),
      metadata: {
        chargeId: charge.id,
        failureCode: charge.outcome?.reason,
        amount: charge.amount / 100,
        currency: charge.currency,
        webhook: true
      },
      dateRecorded: new Date(charge.created * 1000)
    }
  })
}

async function handlePaymentIntentSucceeded(integrationId: string, paymentIntent: StripePaymentIntent): Promise<void> {
  const amount = paymentIntent.amount_received / 100

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'stripe_payment_intents',
      value: new Decimal(amount),
      metadata: {
        paymentIntentId: paymentIntent.id,
        currency: paymentIntent.currency,
        customerId: paymentIntent.customer,
        webhook: true
      },
      dateRecorded: new Date(paymentIntent.created * 1000)
    }
  })
}

async function handleInvoicePaymentSucceeded(integrationId: string, invoice: any): Promise<void> {
  const amount = invoice.amount_paid / 100

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'stripe_subscription_revenue',
      value: new Decimal(amount),
      metadata: {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
        customerId: invoice.customer,
        currency: invoice.currency,
        webhook: true
      },
      dateRecorded: new Date(invoice.created * 1000)
    }
  })
}

async function handleSubscriptionUpdated(integrationId: string, subscription: StripeSubscription): Promise<void> {
  // Calculate MRR
  let mrr = 0
  
  for (const item of subscription.items.data) {
    const amount = item.price.unit_amount / 100
    const interval = item.price.recurring.interval
    
    switch (interval) {
      case 'month':
        mrr += amount
        break
      case 'year':
        mrr += amount / 12
        break
      case 'week':
        mrr += amount * 4.33
        break
      case 'day':
        mrr += amount * 30
        break
    }
  }

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'stripe_mrr',
      value: new Decimal(mrr),
      metadata: {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
        webhook: true
      },
      dateRecorded: new Date(subscription.created * 1000)
    }
  })
}

async function handleChargeDispute(integrationId: string, dispute: any): Promise<void> {
  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'stripe_disputes',
      value: new Decimal(1),
      metadata: {
        disputeId: dispute.id,
        chargeId: dispute.charge,
        amount: dispute.amount / 100,
        reason: dispute.reason,
        status: dispute.status,
        webhook: true
      },
      dateRecorded: new Date(dispute.created * 1000)
    }
  })
}