// lib/integrations/shopify.ts
import { ShopifyOrder, DataPoint, SyncResult } from './types'
import { prisma } from '@/lib/prisma'

export class ShopifyIntegration {
  private accessToken: string
  private shopDomain: string

  constructor(accessToken: string, shopDomain: string) {
    this.accessToken = accessToken
    this.shopDomain = shopDomain
  }

  /**
   * Generate Shopify OAuth URL for authorization
   */
  static generateAuthUrl(shopDomain: string, state?: string): string {
    const scopes = process.env.SHOPIFY_SCOPES || 'read_orders,read_products,read_customers'
    const redirectUri = `${process.env.APP_URL}/api/integrations/shopify/callback`
    
    const params = new URLSearchParams({
      client_id: process.env.SHOPIFY_CLIENT_ID!,
      scope: scopes,
      redirect_uri: redirectUri,
      state: state || '',
    })

    return `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(code: string, shopDomain: string): Promise<string> {
    const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code,
      }),
    })

    if (!response.ok) {
      throw new Error(`Shopify OAuth error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.access_token
  }

  /**
   * Sync orders from Shopify
   */
  async syncOrders(since?: Date): Promise<SyncResult> {
    try {
      const sinceParam = since ? `&created_at_min=${since.toISOString()}` : ''
      const url = `https://${this.shopDomain}/admin/api/2024-01/orders.json?status=any&limit=250${sinceParam}`
      
      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const orders: ShopifyOrder[] = data.orders.map(this.transformOrder)
      
      let recordsProcessed = 0
      const errors: string[] = []

      for (const order of orders) {
        try {
          await this.storeOrderData(order)
          recordsProcessed++
        } catch (error) {
          errors.push(`Failed to store order ${order.id}: ${error}`)
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
   * Get products from Shopify
   */
  async getProducts(limit: number = 250) {
    const url = `https://${this.shopDomain}/admin/api/2024-01/products.json?limit=${limit}`
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json',
      }
    })

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.products
  }

  /**
   * Test the Shopify connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = `https://${this.shopDomain}/admin/api/2024-01/shop.json`
      
      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json',
        }
      })

      return response.ok
    } catch (error) {
      console.error('Shopify connection test failed:', error)
      return false
    }
  }

  /**
   * Transform Shopify order to our format
   */
  private transformOrder(shopifyOrder: any): ShopifyOrder {
    return {
      id: shopifyOrder.id.toString(),
      orderNumber: shopifyOrder.order_number?.toString() || shopifyOrder.name,
      totalPrice: parseFloat(shopifyOrder.total_price),
      currency: shopifyOrder.currency,
      createdAt: new Date(shopifyOrder.created_at),
      customerId: shopifyOrder.customer?.id?.toString(),
      customerEmail: shopifyOrder.customer?.email,
      lineItems: shopifyOrder.line_items.map((item: any) => ({
        productId: item.product_id?.toString(),
        variantId: item.variant_id?.toString(),
        quantity: item.quantity,
        price: parseFloat(item.price),
        title: item.title
      })),
      shippingAddress: shopifyOrder.shipping_address,
      billingAddress: shopifyOrder.billing_address,
      financialStatus: shopifyOrder.financial_status,
      fulfillmentStatus: shopifyOrder.fulfillment_status
    }
  }

  /**
   * Store order data as data points
   */
  private async storeOrderData(order: ShopifyOrder) {
    const integrationId = await this.getIntegrationId()
    
    const dataPoints: DataPoint[] = [
      {
        integrationId,
        metricType: 'revenue',
        value: order.totalPrice,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          currency: order.currency,
          customerId: order.customerId,
          customerEmail: order.customerEmail
        },
        dateRecorded: order.createdAt
      },
      {
        integrationId,
        metricType: 'orders',
        value: 1,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          totalPrice: order.totalPrice,
          currency: order.currency
        },
        dateRecorded: order.createdAt
      }
    ]

    // Add customer data point if new customer
    if (order.customerId) {
      dataPoints.push({
        integrationId,
        metricType: 'customers',
        value: 1,
        metadata: {
          customerId: order.customerId,
          customerEmail: order.customerEmail,
          orderId: order.id
        },
        dateRecorded: order.createdAt
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
        platform: 'shopify',
        platformAccountId: this.shopDomain,
        accessToken: this.accessToken
      }
    })

    if (!integration) {
      throw new Error('Shopify integration not found in database')
    }

    return integration.id
  }
}