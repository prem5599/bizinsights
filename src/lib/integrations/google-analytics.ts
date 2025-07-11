// src/lib/integrations/google-analytics.ts
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

interface GoogleAnalyticsConfig {
  accessToken: string
  refreshToken?: string
  propertyId: string
  apiVersion?: string
}

interface GAMetric {
  name: string
  values: string[]
}

interface GADimension {
  name: string
  values: string[]
}

interface GAReportResponse {
  data: Array<{
    rows?: Array<{
      dimensionValues: GADimension[]
      metricValues: GAMetric[]
    }>
    totals?: Array<{
      metricValues: GAMetric[]
    }>
    maximums?: Array<{
      metricValues: GAMetric[]
    }>
    minimums?: Array<{
      metricValues: GAMetric[]
    }>
  }>
}

interface GAPropertyInfo {
  name: string
  propertyId: string
  displayName: string
  industryCategory: string
  timeZone: string
  currencyCode: string
}

export class GoogleAnalyticsConnector {
  private config: GoogleAnalyticsConfig
  private baseUrl: string

  constructor(config: GoogleAnalyticsConfig) {
    this.config = {
      ...config,
      apiVersion: config.apiVersion || 'v1beta'
    }
    this.baseUrl = `https://analyticsdata.googleapis.com/${this.config.apiVersion}`
  }

  // Main sync function
  async syncData(integrationId: string, lastSyncAt?: Date): Promise<{ success: boolean; error?: string; stats?: any }> {
    try {
      console.log(`Starting Google Analytics sync for integration ${integrationId}`)
      
      // Validate connection first
      const propertyInfo = await this.getPropertyInfo()
      if (!propertyInfo) {
        throw new Error('Failed to connect to Google Analytics property')
      }

      const stats = {
        sessions: 0,
        users: 0,
        pageviews: 0,
        bounceRate: 0,
        avgSessionDuration: 0,
        conversions: 0
      }

      // Determine date range for sync
      const endDate = new Date()
      const startDate = lastSyncAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Default: last 30 days

      // Sync core metrics
      const coreMetrics = await this.syncCoreMetrics(integrationId, startDate, endDate)
      stats.sessions = coreMetrics.sessions
      stats.users = coreMetrics.users
      stats.pageviews = coreMetrics.pageviews

      // Sync engagement metrics
      const engagementMetrics = await this.syncEngagementMetrics(integrationId, startDate, endDate)
      stats.bounceRate = engagementMetrics.bounceRate
      stats.avgSessionDuration = engagementMetrics.avgSessionDuration

      // Sync conversion metrics
      const conversionMetrics = await this.syncConversionMetrics(integrationId, startDate, endDate)
      stats.conversions = conversionMetrics.conversions

      // Sync traffic sources
      await this.syncTrafficSources(integrationId, startDate, endDate)

      // Sync page performance
      await this.syncPagePerformance(integrationId, startDate, endDate)

      // Update integration sync timestamp
      await prisma.integration.update({
        where: { id: integrationId },
        data: { 
          lastSyncAt: new Date(),
          status: 'active'
        }
      })

      console.log(`Google Analytics sync completed for integration ${integrationId}:`, stats)
      return { success: true, stats }

    } catch (error) {
      console.error(`Google Analytics sync failed for integration ${integrationId}:`, error)
      
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

  // Sync core metrics (sessions, users, pageviews)
  private async syncCoreMetrics(integrationId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      const report = await this.runReport({
        dateRanges: [{
          startDate: this.formatDate(startDate),
          endDate: this.formatDate(endDate)
        }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'newUsers' }
        ],
        orderBys: [{ dimension: { dimensionName: 'date' } }]
      })

      let totalSessions = 0
      let totalUsers = 0
      let totalPageviews = 0
      const dataPoints = []

      if (report.data[0]?.rows) {
        for (const row of report.data[0].rows) {
          const date = row.dimensionValues[0].values[0]
          const sessions = parseInt(row.metricValues[0].values[0]) || 0
          const users = parseInt(row.metricValues[1].values[0]) || 0
          const pageviews = parseInt(row.metricValues[2].values[0]) || 0
          const newUsers = parseInt(row.metricValues[3].values[0]) || 0

          totalSessions += sessions
          totalUsers += users
          totalPageviews += pageviews

          const recordDate = new Date(date)

          // Create data points for each metric
          dataPoints.push(
            {
              integrationId,
              metricType: 'ga_sessions',
              value: new Decimal(sessions),
              metadata: {
                date: date,
                source: 'google_analytics',
                users: users,
                pageviews: pageviews
              },
              dateRecorded: recordDate
            },
            {
              integrationId,
              metricType: 'ga_users',
              value: new Decimal(users),
              metadata: {
                date: date,
                source: 'google_analytics',
                newUsers: newUsers,
                returningUsers: users - newUsers
              },
              dateRecorded: recordDate
            },
            {
              integrationId,
              metricType: 'ga_pageviews',
              value: new Decimal(pageviews),
              metadata: {
                date: date,
                source: 'google_analytics',
                sessions: sessions
              },
              dateRecorded: recordDate
            }
          )
        }
      }

      // Batch create data points
      if (dataPoints.length > 0) {
        await this.batchCreateDataPoints(dataPoints)
      }

      return {
        sessions: totalSessions,
        users: totalUsers,
        pageviews: totalPageviews
      }

    } catch (error) {
      console.error('Error syncing GA core metrics:', error)
      throw error
    }
  }

  // Sync engagement metrics (bounce rate, session duration)
  private async syncEngagementMetrics(integrationId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      const report = await this.runReport({
        dateRanges: [{
          startDate: this.formatDate(startDate),
          endDate: this.formatDate(endDate)
        }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'engagementRate' },
          { name: 'engagedSessions' }
        ],
        orderBys: [{ dimension: { dimensionName: 'date' } }]
      })

      let totalBounceRate = 0
      let totalAvgDuration = 0
      const dataPoints = []

      if (report.data[0]?.rows) {
        for (const row of report.data[0].rows) {
          const date = row.dimensionValues[0].values[0]
          const bounceRate = parseFloat(row.metricValues[0].values[0]) || 0
          const avgDuration = parseFloat(row.metricValues[1].values[0]) || 0
          const engagementRate = parseFloat(row.metricValues[2].values[0]) || 0
          const engagedSessions = parseInt(row.metricValues[3].values[0]) || 0

          totalBounceRate += bounceRate
          totalAvgDuration += avgDuration

          const recordDate = new Date(date)

          dataPoints.push(
            {
              integrationId,
              metricType: 'ga_bounce_rate',
              value: new Decimal(bounceRate),
              metadata: {
                date: date,
                source: 'google_analytics',
                engagementRate: engagementRate
              },
              dateRecorded: recordDate
            },
            {
              integrationId,
              metricType: 'ga_avg_session_duration',
              value: new Decimal(avgDuration),
              metadata: {
                date: date,
                source: 'google_analytics',
                engagedSessions: engagedSessions
              },
              dateRecorded: recordDate
            }
          )
        }
      }

      if (dataPoints.length > 0) {
        await this.batchCreateDataPoints(dataPoints)
      }

      const rowCount = report.data[0]?.rows?.length || 1
      return {
        bounceRate: totalBounceRate / rowCount,
        avgSessionDuration: totalAvgDuration / rowCount
      }

    } catch (error) {
      console.error('Error syncing GA engagement metrics:', error)
      throw error
    }
  }

  // Sync conversion metrics
  private async syncConversionMetrics(integrationId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      const report = await this.runReport({
        dateRanges: [{
          startDate: this.formatDate(startDate),
          endDate: this.formatDate(endDate)
        }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'conversions' },
          { name: 'totalRevenue' },
          { name: 'purchaseRevenue' },
          { name: 'ecommercePurchases' }
        ],
        orderBys: [{ dimension: { dimensionName: 'date' } }]
      })

      let totalConversions = 0
      let totalRevenue = 0
      const dataPoints = []

      if (report.data[0]?.rows) {
        for (const row of report.data[0].rows) {
          const date = row.dimensionValues[0].values[0]
          const conversions = parseInt(row.metricValues[0].values[0]) || 0
          const revenue = parseFloat(row.metricValues[1].values[0]) || 0
          const purchaseRevenue = parseFloat(row.metricValues[2].values[0]) || 0
          const purchases = parseInt(row.metricValues[3].values[0]) || 0

          totalConversions += conversions
          totalRevenue += revenue

          const recordDate = new Date(date)

          if (conversions > 0) {
            dataPoints.push({
              integrationId,
              metricType: 'ga_conversions',
              value: new Decimal(conversions),
              metadata: {
                date: date,
                source: 'google_analytics',
                revenue: revenue,
                purchaseRevenue: purchaseRevenue,
                purchases: purchases
              },
              dateRecorded: recordDate
            })
          }

          if (revenue > 0) {
            dataPoints.push({
              integrationId,
              metricType: 'ga_revenue',
              value: new Decimal(revenue),
              metadata: {
                date: date,
                source: 'google_analytics',
                conversions: conversions,
                purchases: purchases
              },
              dateRecorded: recordDate
            })
          }
        }
      }

      if (dataPoints.length > 0) {
        await this.batchCreateDataPoints(dataPoints)
      }

      return {
        conversions: totalConversions,
        revenue: totalRevenue
      }

    } catch (error) {
      console.error('Error syncing GA conversion metrics:', error)
      // Don't throw error for conversions - not all sites have e-commerce
      return { conversions: 0, revenue: 0 }
    }
  }

  // Sync traffic sources
  private async syncTrafficSources(integrationId: string, startDate: Date, endDate: Date): Promise<void> {
    try {
      const report = await this.runReport({
        dateRanges: [{
          startDate: this.formatDate(startDate),
          endDate: this.formatDate(endDate)
        }],
        dimensions: [
          { name: 'sessionDefaultChannelGrouping' },
          { name: 'sessionSource' },
          { name: 'sessionMedium' }
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'newUsers' }
        ],
        orderBys: [{ 
          metric: { 
            metricName: 'sessions' 
          }, 
          desc: true 
        }]
      })

      const dataPoints = []

      if (report.data[0]?.rows) {
        for (const row of report.data[0].rows) {
          const channelGroup = row.dimensionValues[0].values[0]
          const source = row.dimensionValues[1].values[0]
          const medium = row.dimensionValues[2].values[0]
          const sessions = parseInt(row.metricValues[0].values[0]) || 0
          const users = parseInt(row.metricValues[1].values[0]) || 0
          const newUsers = parseInt(row.metricValues[2].values[0]) || 0

          dataPoints.push({
            integrationId,
            metricType: 'ga_traffic_source',
            value: new Decimal(sessions),
            metadata: {
              channelGroup: channelGroup,
              source: source,
              medium: medium,
              users: users,
              newUsers: newUsers,
              source_type: 'google_analytics'
            },
            dateRecorded: new Date()
          })
        }
      }

      if (dataPoints.length > 0) {
        await this.batchCreateDataPoints(dataPoints)
      }

    } catch (error) {
      console.error('Error syncing GA traffic sources:', error)
      throw error
    }
  }

  // Sync page performance
  private async syncPagePerformance(integrationId: string, startDate: Date, endDate: Date): Promise<void> {
    try {
      const report = await this.runReport({
        dateRanges: [{
          startDate: this.formatDate(startDate),
          endDate: this.formatDate(endDate)
        }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' }
        ],
        orderBys: [{ 
          metric: { 
            metricName: 'screenPageViews' 
          }, 
          desc: true 
        }],
        limit: 50 // Top 50 pages
      })

      const dataPoints = []

      if (report.data[0]?.rows) {
        for (const row of report.data[0].rows) {
          const pagePath = row.dimensionValues[0].values[0]
          const pageviews = parseInt(row.metricValues[0].values[0]) || 0
          const avgDuration = parseFloat(row.metricValues[1].values[0]) || 0
          const bounceRate = parseFloat(row.metricValues[2].values[0]) || 0

          dataPoints.push({
            integrationId,
            metricType: 'ga_page_performance',
            value: new Decimal(pageviews),
            metadata: {
              pagePath: pagePath,
              pageviews: pageviews,
              avgDuration: avgDuration,
              bounceRate: bounceRate,
              source: 'google_analytics'
            },
            dateRecorded: new Date()
          })
        }
      }

      if (dataPoints.length > 0) {
        await this.batchCreateDataPoints(dataPoints)
      }

    } catch (error) {
      console.error('Error syncing GA page performance:', error)
      throw error
    }
  }

  // API Methods
  private async runReport(requestBody: any): Promise<GAReportResponse> {
    const url = `${this.baseUrl}/properties/${this.config.propertyId}:runReport`
    
    const response = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(requestBody)
    })

    return response
  }

  private async getPropertyInfo(): Promise<GAPropertyInfo | null> {
    try {
      const url = `https://analyticsadmin.googleapis.com/v1beta/properties/${this.config.propertyId}`
      return await this.makeRequest(url)
    } catch (error) {
      console.error('Failed to get GA property info:', error)
      return null
    }
  }

  // Utility Methods
  private async makeRequest(url: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'BizInsights/1.0',
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      
      // Handle token expiry
      if (response.status === 401 && this.config.refreshToken) {
        const newToken = await this.refreshAccessToken()
        if (newToken) {
          this.config.accessToken = newToken
          // Retry the request with new token
          return this.makeRequest(url, options)
        }
      }
      
      throw new Error(`Google Analytics API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response.json()
  }

  private async refreshAccessToken(): Promise<string | null> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_ANALYTICS_CLIENT_ID!,
          client_secret: process.env.GOOGLE_ANALYTICS_CLIENT_SECRET!,
          refresh_token: this.config.refreshToken!,
          grant_type: 'refresh_token'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to refresh Google Analytics token')
      }

      const data = await response.json()
      return data.access_token
    } catch (error) {
      console.error('Error refreshing Google Analytics token:', error)
      return null
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0] // YYYY-MM-DD format
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

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Helper function to create Google Analytics connector instance
export function createGoogleAnalyticsConnector(config: GoogleAnalyticsConfig): GoogleAnalyticsConnector {
  return new GoogleAnalyticsConnector(config)
}

// Webhook handler for Google Analytics (if needed for real-time reporting)
export async function handleGoogleAnalyticsWebhook(
  integrationId: string,
  eventType: string,
  payload: any
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Handling Google Analytics webhook: ${eventType} for integration ${integrationId}`)

    // Google Analytics doesn't have traditional webhooks like Shopify/Stripe
    // But we can handle custom events here if needed
    
    switch (eventType) {
      case 'realtime_report':
        await handleRealtimeReport(integrationId, payload)
        break
      
      case 'property_update':
        await handlePropertyUpdate(integrationId, payload)
        break
      
      default:
        console.log(`Unhandled Google Analytics webhook event: ${eventType}`)
    }

    return { success: true }
    
  } catch (error) {
    console.error(`Google Analytics webhook handling failed for ${eventType}:`, error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

async function handleRealtimeReport(integrationId: string, data: any): Promise<void> {
  // Handle real-time analytics data
  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'ga_realtime_users',
      value: new Decimal(data.activeUsers || 0),
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'google_analytics_realtime',
        ...data
      },
      dateRecorded: new Date()
    }
  })
}

async function handlePropertyUpdate(integrationId: string, data: any): Promise<void> {
  // Handle property configuration updates
  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      lastSyncAt: new Date()
    }
  })
}