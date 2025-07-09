// lib/integrations/stripe.ts
import { StripePayment, DataPoint, SyncResult } from './types'
import { prisma } from '@/lib/prisma'

export class StripeIntegration {
  private accessToken: string
  private accountId?: string

  constructor(accessToken: string, accountId?: string) {
    this.accessToken = accessToken
    this.accountId = accountId
  }

  /**
   * Generate Stripe OAuth URL for authorization
   */
  static generateAuthUrl(state?: string): string {
    const redirectUri = `${process.env.APP_URL}/api/integrations/stripe/callback`
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.STRIPE_CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: 'read_write',
      state: state || '',
    })

    return `https://connect.stripe.com/oauth/authorize?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(code: string): Promise<{ accessToken: string; accountId: string }> {
    const response = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
      body: new URLSearchParams({
        client_secret: process.env.STRIPE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Stripe OAuth error: ${error}`)
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      accountId: data.stripe_user_id
    }
  }

  /**
   * Sync payments from Stripe
   */
  async syncPayments(since?: Date): Promise<SyncResult> {
    try {
      const params: any = {
        limit: 100,
        expand: ['data.customer']
      }

      if (since) {
        params.created = { gte: Math.floor(since.getTime() / 1000) }
      }

      const charges = await this.fetchCharges(params)
      let recordsProcessed = 0
      const errors: string[] = []

      for (const charge of charges) {
        try {
          const payment = this.transformCharge(charge)
          await this.storePaymentData(payment)
          recordsProcessed++
        } catch (error) {
          errors.push(`Failed to store charge ${charge.id}: ${error}`)
        }
      }

      return {
        success: errors.length === 0,
        recordsProcessed,
        errors: errors.length > 0 ? errors : undefined,
        lastSyncAt: new Date()
      }

    } catch (error) {
      return {
        success: false,
        recordsProcessed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        lastSyncAt: new Date()
      }
    }
  }

  /**
   * Get customers from Stripe
   */
  async getCustomers(limit: number = 100) {
    const url = 'https://api.stripe.com/v1/customers'
    const params = new URLSearchParams({
      limit: limit.toString()
    })

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    })

    if (!response.ok) {
      throw new Error(`Stripe API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Test the Stripe connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('https://api.stripe.com/v1/account', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      })

      return response.ok
    } catch (error) {
      console.error('Stripe connection test failed:', error)
      return false
    }
  }

  /**
   * Fetch charges from Stripe API
   */
  private async fetchCharges(params: any) {
    const url = 'https://api.stripe.com/v1/charges'
    const searchParams = new URLSearchParams()

    Object.keys(params).forEach(key => {
      if (key === 'created' && typeof params[key] === 'object') {
        Object.keys(params[key]).forEach(subKey => {
          searchParams.append(`created[${subKey}]`, params[key][subKey].toString())
        })
      } else if (Array.isArray(params[key])) {
        params[key].forEach((value: string) => {
          searchParams.append(`${key}[]`, value)
        })
      } else {
        searchParams.append(key, params[key].toString())
      }
    })

    const response = await fetch(`${url}?${searchParams}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    })

    if (!response.ok) {
      throw new Error(`Stripe API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.data
  }

  /**
   * Transform Stripe charge to our payment format
   */
  private transformCharge(charge: any): StripePayment {
    return {
      id: charge.id,
      amount: charge.amount / 100, // Convert from cents
      currency: charge.currency.toUpperCase(),
      status: charge.status,
      createdAt: new Date(charge.created * 1000),
      customerId: charge.customer?.id,
      description: charge.description,
      metadata: charge.metadata
    }
  }

  /**
   * Store payment data as data points
   */
  private async storePaymentData(payment: StripePayment) {
    const integrationId = await this.getIntegrationId()
    
    // Only store successful payments
    if (payment.status !== 'succeeded') {
      return
    }

    const dataPoints: DataPoint[] = [
      {
        integrationId,
        metricType: 'revenue',
        value: payment.amount,
        metadata: {
          paymentId: payment.id,
          currency: payment.currency,
          customerId: payment.customerId,
          description: payment.description,
          source: 'stripe'
        },
        dateRecorded: payment.createdAt
      }
    ]

    // Add customer data point if new customer
    if (payment.customerId) {
      dataPoints.push({
        integrationId,
        metricType: 'customers',
        value: 1,
        metadata: {
          customerId: payment.customerId,
          paymentId: payment.id,
          source: 'stripe'
        },
        dateRecorded: payment.createdAt
      })
    }

    // Store in database
    await prisma.dataPoint.createMany({
      data: dataPoints.map(dp => ({
        integrationId: dp.integrationId,
        metricType: dp.metricType,
        value: dp.value,
        metadata: dp.metadata,
        dateRecorded: dp.dateRecorded
      })),
      skipDuplicates: true
    })
  }

  /**
   * Get integration ID from database
   */
  private async getIntegrationId(): Promise<string> {
    const integration = await prisma.integration.findFirst({
      where: {
        platform: 'stripe',
        accessToken: this.accessToken
      }
    })

    if (!integration) {
      throw new Error('Stripe integration not found in database')
    }

    return integration.id
  }
}