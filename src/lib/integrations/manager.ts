// lib/integrations/manager.ts
import { prisma } from '@/lib/prisma'
import { ShopifyIntegration } from './shopify'
import { StripeIntegration } from './stripe'
import { SyncResult } from './types'

export class IntegrationManager {
  /**
   * Sync data from all active integrations for an organization
   */
  static async syncOrganizationData(organizationId: string): Promise<Record<string, SyncResult>> {
    const integrations = await prisma.integration.findMany({
      where: {
        organizationId,
        status: 'active'
      }
    })

    const results: Record<string, SyncResult> = {}

    for (const integration of integrations) {
      try {
        let result: SyncResult

        switch (integration.platform) {
          case 'shopify':
            result = await this.syncShopify(integration)
            break
          case 'stripe':
            result = await this.syncStripe(integration)
            break
          default:
            result = {
              success: false,
              recordsProcessed: 0,
              errors: [`Unsupported platform: ${integration.platform}`],
              lastSyncAt: new Date()
            }
        }

        results[integration.platform] = result

        // Update last sync time if successful
        if (result.success) {
          await prisma.integration.update({
            where: { id: integration.id },
            data: { lastSyncAt: result.lastSyncAt }
          })
        }

      } catch (error) {
        results[integration.platform] = {
          success: false,
          recordsProcessed: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          lastSyncAt: new Date()
        }
      }
    }

    return results
  }

  /**
   * Sync data from a specific integration
   */
  static async syncIntegration(integrationId: string): Promise<SyncResult> {
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId }
    })

    if (!integration) {
      throw new Error('Integration not found')
    }

    let result: SyncResult

    switch (integration.platform) {
      case 'shopify':
        result = await this.syncShopify(integration)
        break
      case 'stripe':
        result = await this.syncStripe(integration)
        break
      default:
        throw new Error(`Unsupported platform: ${integration.platform}`)
    }

    // Update last sync time if successful
    if (result.success) {
      await prisma.integration.update({
        where: { id: integration.id },
        data: { lastSyncAt: result.lastSyncAt }
      })
    }

    return result
  }

  /**
   * Test connection for an integration
   */
  static async testIntegration(integrationId: string): Promise<boolean> {
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId }
    })

    if (!integration || !integration.accessToken) {
      return false
    }

    try {
      switch (integration.platform) {
        case 'shopify':
          const shopify = new ShopifyIntegration(
            integration.accessToken,
            integration.platformAccountId!
          )
          return await shopify.testConnection()

        case 'stripe':
          const stripe = new StripeIntegration(integration.accessToken)
          return await stripe.testConnection()

        default:
          return false
      }
    } catch (error) {
      console.error(`Integration test failed for ${integration.platform}:`, error)
      return false
    }
  }

  /**
   * Get integration statistics
   */
  static async getIntegrationStats(integrationId: string) {
    const dataPoints = await prisma.dataPoint.groupBy({
      by: ['metricType'],
      where: { integrationId },
      _count: { id: true },
      _sum: { value: true }
    })

    const lastDataPoint = await prisma.dataPoint.findFirst({
      where: { integrationId },
      orderBy: { createdAt: 'desc' }
    })

    return {
      totalDataPoints: dataPoints.reduce((sum, dp) => sum + dp._count.id, 0),
      metricBreakdown: dataPoints.reduce((acc, dp) => {
        acc[dp.metricType] = {
          count: dp._count.id,
          total: Number(dp._sum.value || 0)
        }
        return acc
      }, {} as Record<string, { count: number; total: number }>),
      lastDataAt: lastDataPoint?.createdAt
    }
  }

  /**
   * Sync Shopify integration
   */
  private static async syncShopify(integration: any): Promise<SyncResult> {
    if (!integration.accessToken || !integration.platformAccountId) {
      throw new Error('Missing Shopify credentials')
    }

    const shopify = new ShopifyIntegration(
      integration.accessToken,
      integration.platformAccountId
    )

    const since = integration.lastSyncAt || new Date('2024-01-01')
    return await shopify.syncOrders(since)
  }

  /**
   * Sync Stripe integration
   */
  private static async syncStripe(integration: any): Promise<SyncResult> {
    if (!integration.accessToken) {
      throw new Error('Missing Stripe credentials')
    }

    const stripe = new StripeIntegration(integration.accessToken)
    const since = integration.lastSyncAt || new Date('2024-01-01')
    return await stripe.syncPayments(since)
  }
}

/**
 * Background job to sync all integrations
 */
export async function syncAllIntegrations() {
  const organizations = await prisma.organization.findMany({
    include: {
      integrations: {
        where: { status: 'active' }
      }
    }
  })

  const results = []

  for (const org of organizations) {
    if (org.integrations.length > 0) {
      try {
        const result = await IntegrationManager.syncOrganizationData(org.id)
        results.push({
          organizationId: org.id,
          organizationName: org.name,
          results: result
        })
      } catch (error) {
        console.error(`Failed to sync organization ${org.id}:`, error)
        results.push({
          organizationId: org.id,
          organizationName: org.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
  }

  return results
}