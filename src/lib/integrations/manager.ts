// src/lib/integrations/manager.ts
import { prisma } from '@/lib/prisma'

/**
 * Central manager for all platform integrations
 */
export class IntegrationManager {
  
  /**
   * Test an integration connection
   */
  static async testIntegration(integrationId: string): Promise<boolean> {
    try {
      const integration = await prisma.integration.findUnique({
        where: { id: integrationId }
      })

      if (!integration || integration.status !== 'active') {
        return false
      }

      switch (integration.platform) {
        case 'shopify':
          return await this.testShopifyIntegration(integration)
        case 'stripe':
          return await this.testStripeIntegration(integration)
        case 'google_analytics':
          return await this.testGoogleAnalyticsIntegration(integration)
        default:
          console.warn(`Unknown platform for integration test: ${integration.platform}`)
          return false
      }
    } catch (error) {
      console.error('Integration test error:', error)
      return false
    }
  }

  /**
   * Sync data from an integration
   */
  static async syncIntegration(integrationId: string): Promise<{ success: boolean; error?: string; synced?: number }> {
    try {
      const integration = await prisma.integration.findUnique({
        where: { id: integrationId }
      })

      if (!integration || integration.status !== 'active') {
        return {
          success: false,
          error: 'Integration not found or inactive'
        }
      }

      console.log(`Starting sync for ${integration.platform} integration ${integrationId}`)

      let result
      switch (integration.platform) {
        case 'shopify':
          result = await this.syncShopifyData(integration)
          break
        case 'stripe':
          result = await this.syncStripeData(integration)
          break
        case 'google_analytics':
          result = await this.syncGoogleAnalyticsData(integration)
          break
        default:
          return {
            success: false,
            error: `Unsupported platform: ${integration.platform}`
          }
      }

      // Update last sync time
      await prisma.integration.update({
        where: { id: integrationId },
        data: { lastSyncAt: new Date() }
      })

      console.log(`Sync completed for ${integration.platform} integration ${integrationId}:`, result)
      return result

    } catch (error) {
      console.error('Integration sync error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get all active integrations for an organization
   */
  static async getOrganizationIntegrations(organizationId: string) {
    return prisma.integration.findMany({
      where: {
        organizationId,
        status: 'active'
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Disconnect an integration
   */
  static async disconnectIntegration(integrationId: string, reason?: string): Promise<boolean> {
    try {
      const integration = await prisma.integration.findUnique({
        where: { id: integrationId }
      })

      if (!integration) {
        return false
      }

      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          status: 'inactive',
          accessToken: null,
          refreshToken: null,
          metadata: {
            ...(integration.metadata as any || {}),
            disconnectedAt: new Date().toISOString(),
            disconnectReason: reason || 'manual_disconnect'
          }
        }
      })

      return true
    } catch (error) {
      console.error('Error disconnecting integration:', error)
      return false
    }
  }

  /**
   * Test Shopify integration
   */
  private static async testShopifyIntegration(integration: any): Promise<boolean> {
    try {
      if (!integration.accessToken || !integration.platformAccountId) {
        return false
      }

      // Make a simple API call to test the connection
      const response = await fetch(`https://${integration.platformAccountId}.myshopify.com/admin/api/2023-10/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': integration.accessToken,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        return !!data.shop
      }

      console.error('Shopify connection test failed:', response.status, response.statusText)
      return false
    } catch (error) {
      console.error('Shopify connection test error:', error)
      return false
    }
  }

  /**
   * Test Stripe integration
   */
  private static async testStripeIntegration(integration: any): Promise<boolean> {
    try {
      if (!integration.accessToken) {
        return false
      }

      // Make a simple API call to test the connection
      const response = await fetch('https://api.stripe.com/v1/account', {
        headers: {
          'Authorization': `Bearer ${integration.accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      if (response.ok) {
        const data = await response.json()
        return !!data.id
      }

      console.error('Stripe connection test failed:', response.status, response.statusText)
      return false
    } catch (error) {
      console.error('Stripe connection test error:', error)
      return false
    }
  }

  /**
   * Test Google Analytics integration
   */
  private static async testGoogleAnalyticsIntegration(integration: any): Promise<boolean> {
    try {
      if (!integration.accessToken) {
        return false
      }

      // Make a simple API call to test the connection
      const response = await fetch('https://analyticsreporting.googleapis.com/v4/reports:batchGet', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${integration.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reportRequests: [{
            viewId: integration.platformAccountId,
            dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
            metrics: [{ expression: 'ga:sessions' }],
            dimensions: [{ name: 'ga:date' }],
            pageSize: 1
          }]
        })
      })

      return response.ok
    } catch (error) {
      console.error('Google Analytics connection test error:', error)
      return false
    }
  }

  /**
   * Sync Shopify data
   */
  private static async syncShopifyData(integration: any): Promise<{ success: boolean; error?: string; synced?: number }> {
    try {
      let syncedCount = 0

      // Sync recent orders
      const ordersResponse = await fetch(
        `https://${integration.platformAccountId}.myshopify.com/admin/api/2023-10/orders.json?status=any&limit=250&created_at_min=${this.getLastSyncDate(integration)}`,
        {
          headers: {
            'X-Shopify-Access-Token': integration.accessToken,
            'Content-Type': 'application/json'
          }
        }
      )

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json()
        
        for (const order of ordersData.orders || []) {
          // Create revenue data point
          await prisma.dataPoint.create({
            data: {
              integrationId: integration.id,
              metricType: 'revenue',
              value: parseFloat(order.total_price || '0'),
              metadata: {
                orderId: order.id,
                orderNumber: order.order_number,
                currency: order.currency,
                customerEmail: order.email,
                source: 'shopify_sync'
              },
              dateRecorded: new Date(order.created_at)
            }
          })

          // Create orders data point
          await prisma.dataPoint.create({
            data: {
              integrationId: integration.id,
              metricType: 'orders',
              value: 1,
              metadata: {
                orderId: order.id,
                orderNumber: order.order_number,
                status: order.financial_status,
                source: 'shopify_sync'
              },
              dateRecorded: new Date(order.created_at)
            }
          })

          syncedCount += 2
        }
      }

      // Sync customers
      const customersResponse = await fetch(
        `https://${integration.platformAccountId}.myshopify.com/admin/api/2023-10/customers.json?limit=250&created_at_min=${this.getLastSyncDate(integration)}`,
        {
          headers: {
            'X-Shopify-Access-Token': integration.accessToken,
            'Content-Type': 'application/json'
          }
        }
      )

      if (customersResponse.ok) {
        const customersData = await customersResponse.json()
        
        for (const customer of customersData.customers || []) {
          await prisma.dataPoint.create({
            data: {
              integrationId: integration.id,
              metricType: 'customers',
              value: 1,
              metadata: {
                customerId: customer.id,
                email: customer.email,
                firstName: customer.first_name,
                lastName: customer.last_name,
                source: 'shopify_sync'
              },
              dateRecorded: new Date(customer.created_at)
            }
          })

          syncedCount++
        }
      }

      return {
        success: true,
        synced: syncedCount
      }
    } catch (error) {
      console.error('Shopify sync error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Sync Stripe data
   */
  private static async syncStripeData(integration: any): Promise<{ success: boolean; error?: string; synced?: number }> {
    try {
      let syncedCount = 0
      const lastSync = this.getLastSyncTimestamp(integration)

      // Sync recent charges
      const chargesResponse = await fetch(
        `https://api.stripe.com/v1/charges?limit=100&created[gte]=${lastSync}`,
        {
          headers: {
            'Authorization': `Bearer ${integration.accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )

      if (chargesResponse.ok) {
        const chargesData = await chargesResponse.json()
        
        for (const charge of chargesData.data || []) {
          if (charge.status === 'succeeded') {
            await prisma.dataPoint.create({
              data: {
                integrationId: integration.id,
                metricType: 'revenue',
                value: charge.amount / 100, // Convert cents to dollars
                metadata: {
                  chargeId: charge.id,
                  currency: charge.currency,
                  customerId: charge.customer,
                  source: 'stripe_sync'
                },
                dateRecorded: new Date(charge.created * 1000)
              }
            })

            syncedCount++
          }
        }
      }

      // Sync customers
      const customersResponse = await fetch(
        `https://api.stripe.com/v1/customers?limit=100&created[gte]=${lastSync}`,
        {
          headers: {
            'Authorization': `Bearer ${integration.accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )

      if (customersResponse.ok) {
        const customersData = await customersResponse.json()
        
        for (const customer of customersData.data || []) {
          await prisma.dataPoint.create({
            data: {
              integrationId: integration.id,
              metricType: 'customers',
              value: 1,
              metadata: {
                customerId: customer.id,
                email: customer.email,
                name: customer.name,
                source: 'stripe_sync'
              },
              dateRecorded: new Date(customer.created * 1000)
            }
          })

          syncedCount++
        }
      }

      return {
        success: true,
        synced: syncedCount
      }
    } catch (error) {
      console.error('Stripe sync error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Sync Google Analytics data
   */
  private static async syncGoogleAnalyticsData(integration: any): Promise<{ success: boolean; error?: string; synced?: number }> {
    try {
      let syncedCount = 0

      // Sync sessions data
      const response = await fetch('https://analyticsreporting.googleapis.com/v4/reports:batchGet', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${integration.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reportRequests: [{
            viewId: integration.platformAccountId,
            dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
            metrics: [
              { expression: 'ga:sessions' },
              { expression: 'ga:users' },
              { expression: 'ga:pageviews' }
            ],
            dimensions: [{ name: 'ga:date' }]
          }]
        })
      })

      if (response.ok) {
        const data = await response.json()
        const report = data.reports?.[0]
        
        if (report?.data?.rows) {
          for (const row of report.data.rows) {
            const date = row.dimensions[0]
            const sessions = parseInt(row.metrics[0].values[0])
            const users = parseInt(row.metrics[0].values[1])
            const pageviews = parseInt(row.metrics[0].values[2])

            // Create data points for each metric
            await prisma.dataPoint.create({
              data: {
                integrationId: integration.id,
                metricType: 'sessions',
                value: sessions,
                metadata: {
                  source: 'google_analytics_sync',
                  date: date
                },
                dateRecorded: new Date(date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'))
              }
            })

            await prisma.dataPoint.create({
              data: {
                integrationId: integration.id,
                metricType: 'users',
                value: users,
                metadata: {
                  source: 'google_analytics_sync',
                  date: date
                },
                dateRecorded: new Date(date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'))
              }
            })

            await prisma.dataPoint.create({
              data: {
                integrationId: integration.id,
                metricType: 'pageviews',
                value: pageviews,
                metadata: {
                  source: 'google_analytics_sync',
                  date: date
                },
                dateRecorded: new Date(date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'))
              }
            })

            syncedCount += 3
          }
        }
      }

      return {
        success: true,
        synced: syncedCount
      }
    } catch (error) {
      console.error('Google Analytics sync error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get last sync date in ISO string format
   */
  private static getLastSyncDate(integration: any): string {
    if (integration.lastSyncAt) {
      return new Date(integration.lastSyncAt).toISOString()
    }
    // Default to 30 days ago
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return thirtyDaysAgo.toISOString()
  }

  /**
   * Get last sync timestamp (Unix timestamp)
   */
  private static getLastSyncTimestamp(integration: any): number {
    if (integration.lastSyncAt) {
      return Math.floor(new Date(integration.lastSyncAt).getTime() / 1000)
    }
    // Default to 30 days ago
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return Math.floor(thirtyDaysAgo.getTime() / 1000)
  }

  /**
   * Schedule regular sync for all active integrations
   */
  static async scheduleAllSyncs(): Promise<void> {
    try {
      const activeIntegrations = await prisma.integration.findMany({
        where: { status: 'active' }
      })

      console.log(`Scheduling sync for ${activeIntegrations.length} active integrations`)

      for (const integration of activeIntegrations) {
        try {
          await this.syncIntegration(integration.id)
        } catch (error) {
          console.error(`Failed to sync integration ${integration.id}:`, error)
        }
      }
    } catch (error) {
      console.error('Error scheduling syncs:', error)
    }
  }
}