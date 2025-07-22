// src/lib/integrations/google-analytics.ts
import { prisma } from '@/lib/prisma'

/**
 * Google Analytics API Types
 */
interface GoogleAnalyticsProperty {
  name: string // properties/123456789
  displayName: string
  measurementId: string // G-XXXXXXXXXX
  createTime: string
  updateTime: string
  timeZone: string
  currencyCode: string
  parent?: string
}

interface GoogleAnalyticsAccount {
  name: string // accounts/123456
  displayName: string
  createTime: string
  updateTime: string
}

interface GoogleAnalyticsMetric {
  name: string
  expression?: string
}

interface GoogleAnalyticsDimension {
  name: string
}

interface GoogleAnalyticsReportRow {
  dimensionValues: Array<{ value: string }>
  metricValues: Array<{ value: string }>
}

interface GoogleAnalyticsReport {
  dimensionHeaders: Array<{ name: string }>
  metricHeaders: Array<{ name: string; type: string }>
  rows: GoogleAnalyticsReportRow[]
  totals?: Array<{ metricValues: Array<{ value: string }> }>
}

interface GoogleAnalyticsTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  scope: string
}

/**
 * Google Analytics 4 Integration Class
 */
export class GoogleAnalyticsIntegration {
  private accessToken: string
  private refreshToken?: string
  private apiVersion: string = 'v1beta'
  private baseUrl: string = 'https://analyticsdata.googleapis.com'
  private adminUrl: string = 'https://analyticsadmin.googleapis.com'

  constructor(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
  }

  /**
   * Generate Google Analytics OAuth authorization URL
   */
  static generateAuthUrl(state: string): string {
    const clientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/google-analytics/oauth`
    
    if (!clientId) {
      throw new Error('Google Analytics OAuth client ID not configured')
    }

    const scope = [
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/analytics.edit',
      'https://www.googleapis.com/auth/analyticsreporting'
    ].join(' ')

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      state,
      access_type: 'offline',
      prompt: 'consent'
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(code: string): Promise<GoogleAnalyticsTokenResponse> {
    const clientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID
    const clientSecret = process.env.GOOGLE_ANALYTICS_CLIENT_SECRET
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/google-analytics/oauth`

    if (!clientId || !clientSecret) {
      throw new Error('Google Analytics OAuth credentials not configured')
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Google OAuth token exchange failed: ${errorData}`)
    }

    return await response.json()
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available')
    }

    const clientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID
    const clientSecret = process.env.GOOGLE_ANALYTICS_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('Google Analytics OAuth credentials not configured')
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token'
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Google OAuth token refresh failed: ${errorData}`)
    }

    const data = await response.json()
    this.accessToken = data.access_token
    return this.accessToken
  }

  /**
   * Make authenticated API request with retry and token refresh logic
   */
  private async makeRequest(
    url: string,
    options: RequestInit = {},
    retries: number = 3
  ): Promise<any> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers
          }
        })

        // Handle token expiration
        if (response.status === 401 && this.refreshToken && attempt === 1) {
          console.log('Access token expired, refreshing...')
          await this.refreshAccessToken()
          continue // Retry with new token
        }

        if (!response.ok) {
          const errorData = await response.text()
          throw new Error(`Google Analytics API error (${response.status}): ${errorData}`)
        }

        return await response.json()

      } catch (error) {
        console.error(`Google Analytics API request attempt ${attempt} failed:`, error)
        
        if (attempt === retries) {
          throw error
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<{ account: string; properties: GoogleAnalyticsProperty[] }> {
    const accountsUrl = `${this.adminUrl}/v1beta/accounts`
    const accountsData = await this.makeRequest(accountsUrl)
    
    if (!accountsData.accounts || accountsData.accounts.length === 0) {
      throw new Error('No Google Analytics accounts found')
    }

    const account = accountsData.accounts[0]
    const properties = await this.getProperties()

    return {
      account: account.name,
      properties
    }
  }

  /**
   * Get all GA4 properties for the account
   */
  async getProperties(): Promise<GoogleAnalyticsProperty[]> {
    const accountsUrl = `${this.adminUrl}/v1beta/accounts`
    const accountsData = await this.makeRequest(accountsUrl)
    
    if (!accountsData.accounts || accountsData.accounts.length === 0) {
      throw new Error('No Google Analytics accounts found')
    }

    const allProperties: GoogleAnalyticsProperty[] = []
    
    for (const account of accountsData.accounts) {
      const propertiesUrl = `${this.adminUrl}/v1beta/${account.name}/properties`
      const propertiesData = await this.makeRequest(propertiesUrl)
      
      if (propertiesData.properties) {
        // Filter for GA4 properties only
        const ga4Properties = propertiesData.properties.filter((prop: any) => 
          prop.propertyType === 'PROPERTY_TYPE_GA4' || !prop.propertyType
        )
        allProperties.push(...ga4Properties)
      }
    }

    return allProperties
  }

  /**
   * Get analytics report data
   */
  async getReport(
    propertyId: string,
    metrics: GoogleAnalyticsMetric[],
    dimensions: GoogleAnalyticsDimension[] = [],
    startDate: string = '30daysAgo',
    endDate: string = 'today'
  ): Promise<GoogleAnalyticsReport> {
    const reportUrl = `${this.baseUrl}/${this.apiVersion}/${propertyId}:runReport`
    
    const requestBody = {
      dimensions,
      metrics,
      dateRanges: [{ startDate, endDate }],
      limit: 10000,
      orderBys: [
        {
          dimension: dimensions.length > 0 ? { dimensionName: dimensions[0].name } : undefined,
          metric: dimensions.length === 0 ? { metricName: metrics[0].name } : undefined,
          desc: true
        }
      ].filter(order => order.dimension || order.metric)
    }

    const reportData = await this.makeRequest(reportUrl, {
      method: 'POST',
      body: JSON.stringify(requestBody)
    })

    return reportData
  }

  /**
   * Sync historical data from Google Analytics
   */
  async syncHistoricalData(integrationId: string, days: number = 30): Promise<{
    totalMetrics: number
    dateRange: string
    syncedData: Record<string, number>
  }> {
    console.log(`Starting Google Analytics sync for integration ${integrationId}`)

    // Get integration details to find the property ID
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId }
    })

    if (!integration || !integration.platformAccountId) {
      throw new Error('Integration not found or property ID missing')
    }

    const propertyId = integration.platformAccountId
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
    
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    let totalMetrics = 0
    const syncedData: Record<string, number> = {}

    try {
      // Sync basic metrics (sessions, users, page views, etc.)
      await this.syncBasicMetrics(integrationId, propertyId, startDateStr, endDateStr)
      totalMetrics += 4
      syncedData.basicMetrics = 4

      // Sync ecommerce metrics if available
      const ecommerceMetrics = await this.syncEcommerceMetrics(integrationId, propertyId, startDateStr, endDateStr)
      totalMetrics += ecommerceMetrics
      syncedData.ecommerceMetrics = ecommerceMetrics

      // Sync traffic sources
      const trafficSourceMetrics = await this.syncTrafficSources(integrationId, propertyId, startDateStr, endDateStr)
      totalMetrics += trafficSourceMetrics
      syncedData.trafficSources = trafficSourceMetrics

      // Sync device and location data
      const deviceMetrics = await this.syncDeviceData(integrationId, propertyId, startDateStr, endDateStr)
      totalMetrics += deviceMetrics
      syncedData.deviceMetrics = deviceMetrics

      console.log(`Google Analytics sync completed: ${totalMetrics} metrics synced`)

      return {
        totalMetrics,
        dateRange: `${startDateStr} to ${endDateStr}`,
        syncedData
      }

    } catch (error) {
      console.error('Google Analytics sync failed:', error)
      throw error
    }
  }

  /**
   * Sync basic metrics (sessions, users, page views)
   */
  private async syncBasicMetrics(
    integrationId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<void> {
    const report = await this.getReport(
      propertyId,
      [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' }
      ],
      [{ name: 'date' }],
      startDate,
      endDate
    )

    if (report.rows) {
      for (const row of report.rows) {
        const dateValue = row.dimensionValues[0].value
        const date = new Date(`${dateValue.slice(0, 4)}-${dateValue.slice(4, 6)}-${dateValue.slice(6, 8)}`)
        
        const sessions = parseInt(row.metricValues[0].value) || 0
        const users = parseInt(row.metricValues[1].value) || 0
        const pageViews = parseInt(row.metricValues[2].value) || 0
        const bounceRate = parseFloat(row.metricValues[3].value) || 0

        // Save sessions
        await prisma.dataPoint.upsert({
          where: {
            integrationId_metricType_dateRecorded: {
              integrationId,
              metricType: 'sessions',
              dateRecorded: date
            }
          },
          update: { value: sessions.toString() },
          create: {
            integrationId,
            metricType: 'sessions',
            value: sessions.toString(),
            dateRecorded: date,
            metadata: JSON.stringify({ source: 'google_analytics' })
          }
        })

        // Save users
        await prisma.dataPoint.upsert({
          where: {
            integrationId_metricType_dateRecorded: {
              integrationId,
              metricType: 'users',
              dateRecorded: date
            }
          },
          update: { value: users.toString() },
          create: {
            integrationId,
            metricType: 'users',
            value: users.toString(),
            dateRecorded: date,
            metadata: JSON.stringify({ source: 'google_analytics' })
          }
        })

        // Save page views
        await prisma.dataPoint.upsert({
          where: {
            integrationId_metricType_dateRecorded: {
              integrationId,
              metricType: 'page_views',
              dateRecorded: date
            }
          },
          update: { value: pageViews.toString() },
          create: {
            integrationId,
            metricType: 'page_views',
            value: pageViews.toString(),
            dateRecorded: date,
            metadata: JSON.stringify({ source: 'google_analytics' })
          }
        })

        // Save bounce rate
        await prisma.dataPoint.upsert({
          where: {
            integrationId_metricType_dateRecorded: {
              integrationId,
              metricType: 'bounce_rate',
              dateRecorded: date
            }
          },
          update: { value: bounceRate.toString() },
          create: {
            integrationId,
            metricType: 'bounce_rate',
            value: bounceRate.toString(),
            dateRecorded: date,
            metadata: JSON.stringify({ source: 'google_analytics', unit: 'percentage' })
          }
        })
      }
    }
  }

  /**
   * Sync ecommerce metrics if available
   */
  private async syncEcommerceMetrics(
    integrationId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    let syncedMetrics = 0

    try {
      const ecommerceReport = await this.getReport(
        propertyId,
        [
          { name: 'purchaseRevenue' },
          { name: 'transactions' },
          { name: 'averageOrderValue' },
          { name: 'ecommercePurchases' }
        ],
        [{ name: 'date' }],
        startDate,
        endDate
      )

      if (ecommerceReport.rows) {
        for (const row of ecommerceReport.rows) {
          const dateValue = row.dimensionValues[0].value
          const date = new Date(`${dateValue.slice(0, 4)}-${dateValue.slice(4, 6)}-${dateValue.slice(6, 8)}`)
          
          const revenue = parseFloat(row.metricValues[0].value) || 0
          const transactions = parseInt(row.metricValues[1].value) || 0
          const avgOrderValue = parseFloat(row.metricValues[2].value) || 0
          const purchases = parseInt(row.metricValues[3].value) || 0

          // Save revenue
          if (revenue > 0) {
            await prisma.dataPoint.upsert({
              where: {
                integrationId_metricType_dateRecorded: {
                  integrationId,
                  metricType: 'revenue',
                  dateRecorded: date
                }
              },
              update: { value: revenue.toString() },
              create: {
                integrationId,
                metricType: 'revenue',
                value: revenue.toString(),
                dateRecorded: date,
                metadata: JSON.stringify({ source: 'google_analytics' })
              }
            })
            syncedMetrics++
          }

          // Save orders/transactions
          if (transactions > 0) {
            await prisma.dataPoint.upsert({
              where: {
                integrationId_metricType_dateRecorded: {
                  integrationId,
                  metricType: 'orders',
                  dateRecorded: date
                }
              },
              update: { value: transactions.toString() },
              create: {
                integrationId,
                metricType: 'orders',
                value: transactions.toString(),
                dateRecorded: date,
                metadata: JSON.stringify({ source: 'google_analytics' })
              }
            })
            syncedMetrics++
          }

          // Save average order value
          if (avgOrderValue > 0) {
            await prisma.dataPoint.upsert({
              where: {
                integrationId_metricType_dateRecorded: {
                  integrationId,
                  metricType: 'average_order_value',
                  dateRecorded: date
                }
              },
              update: { value: avgOrderValue.toString() },
              create: {
                integrationId,
                metricType: 'average_order_value',
                value: avgOrderValue.toString(),
                dateRecorded: date,
                metadata: JSON.stringify({ source: 'google_analytics' })
              }
            })
            syncedMetrics++
          }
        }
      }
    } catch (error) {
      console.warn('Ecommerce data not available or error occurred:', error)
      // Don't fail the entire sync if ecommerce data isn't available
    }

    return syncedMetrics
  }

  /**
   * Sync traffic source data
   */
  private async syncTrafficSources(
    integrationId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    let syncedMetrics = 0

    try {
      const trafficReport = await this.getReport(
        propertyId,
        [
          { name: 'sessions' },
          { name: 'activeUsers' }
        ],
        [
          { name: 'date' },
          { name: 'sessionSource' },
          { name: 'sessionMedium' }
        ],
        startDate,
        endDate
      )

      const dailyTrafficSources = new Map<string, Map<string, { sessions: number; users: number }>>()

      if (trafficReport.rows) {
        for (const row of trafficReport.rows) {
          const dateValue = row.dimensionValues[0].value
          const source = row.dimensionValues[1].value
          const medium = row.dimensionValues[2].value
          const sessions = parseInt(row.metricValues[0].value) || 0
          const users = parseInt(row.metricValues[1].value) || 0

          if (!dailyTrafficSources.has(dateValue)) {
            dailyTrafficSources.set(dateValue, new Map())
          }

          const dayData = dailyTrafficSources.get(dateValue)!
          const sourceKey = `${source}/${medium}`
          
          if (!dayData.has(sourceKey)) {
            dayData.set(sourceKey, { sessions: 0, users: 0 })
          }

          const sourceData = dayData.get(sourceKey)!
          sourceData.sessions += sessions
          sourceData.users += users
        }

        // Save aggregated traffic source data
        for (const [dateValue, sourcesMap] of dailyTrafficSources) {
          const date = new Date(`${dateValue.slice(0, 4)}-${dateValue.slice(4, 6)}-${dateValue.slice(6, 8)}`)
          
          // Get top traffic sources for this day
          const topSources = Array.from(sourcesMap.entries())
            .sort((a, b) => b[1].sessions - a[1].sessions)
            .slice(0, 5)

          if (topSources.length > 0) {
            await prisma.dataPoint.upsert({
              where: {
                integrationId_metricType_dateRecorded: {
                  integrationId,
                  metricType: 'traffic_sources',
                  dateRecorded: date
                }
              },
              update: { 
                value: topSources[0][1].sessions.toString(),
                metadata: JSON.stringify({ 
                  source: 'google_analytics',
                  topSources: topSources.map(([source, data]) => ({
                    source,
                    sessions: data.sessions,
                    users: data.users
                  }))
                })
              },
              create: {
                integrationId,
                metricType: 'traffic_sources',
                value: topSources[0][1].sessions.toString(),
                dateRecorded: date,
                metadata: JSON.stringify({ 
                  source: 'google_analytics',
                  topSources: topSources.map(([source, data]) => ({
                    source,
                    sessions: data.sessions,
                    users: data.users
                  }))
                })
              }
            })
            syncedMetrics++
          }
        }
      }
    } catch (error) {
      console.warn('Traffic source data sync failed:', error)
    }

    return syncedMetrics
  }

  /**
   * Sync device and location data
   */
  private async syncDeviceData(
    integrationId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    let syncedMetrics = 0

    try {
      // Device category data
      const deviceReport = await this.getReport(
        propertyId,
        [{ name: 'sessions' }],
        [
          { name: 'date' },
          { name: 'deviceCategory' }
        ],
        startDate,
        endDate
      )

      const dailyDeviceData = new Map<string, Map<string, number>>()

      if (deviceReport.rows) {
        for (const row of deviceReport.rows) {
          const dateValue = row.dimensionValues[0].value
          const deviceCategory = row.dimensionValues[1].value
          const sessions = parseInt(row.metricValues[0].value) || 0

          if (!dailyDeviceData.has(dateValue)) {
            dailyDeviceData.set(dateValue, new Map())
          }

          dailyDeviceData.get(dateValue)!.set(deviceCategory, sessions)
        }

        for (const [dateValue, deviceMap] of dailyDeviceData) {
          const date = new Date(`${dateValue.slice(0, 4)}-${dateValue.slice(4, 6)}-${dateValue.slice(6, 8)}`)
          
          const deviceBreakdown = Object.fromEntries(deviceMap)
          const totalSessions = Array.from(deviceMap.values()).reduce((sum, sessions) => sum + sessions, 0)

          await prisma.dataPoint.upsert({
            where: {
              integrationId_metricType_dateRecorded: {
                integrationId,
                metricType: 'device_breakdown',
                dateRecorded: date
              }
            },
            update: { 
              value: totalSessions.toString(),
              metadata: JSON.stringify({ 
                source: 'google_analytics',
                breakdown: deviceBreakdown
              })
            },
            create: {
              integrationId,
              metricType: 'device_breakdown',
              value: totalSessions.toString(),
              dateRecorded: date,
              metadata: JSON.stringify({ 
                source: 'google_analytics',
                breakdown: deviceBreakdown
              })
            }
          })
          syncedMetrics++
        }
      }
    } catch (error) {
      console.warn('Device data sync failed:', error)
    }

    return syncedMetrics
  }

  /**
   * Test connection to Google Analytics
   */
  async testConnection(propertyId?: string): Promise<{
    success: boolean
    accountInfo?: any
    properties?: GoogleAnalyticsProperty[]
    error?: string
  }> {
    try {
      const accountInfo = await this.getAccountInfo()
      
      if (propertyId) {
        // Test specific property access
        const report = await this.getReport(
          propertyId,
          [{ name: 'sessions' }],
          [],
          '7daysAgo',
          'today'
        )
        
        return {
          success: true,
          accountInfo,
          properties: accountInfo.properties
        }
      }

      return {
        success: true,
        accountInfo,
        properties: accountInfo.properties
      }

    } catch (error) {
      console.error('Google Analytics connection test failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      }
    }
  }

  /**
   * Get real-time visitor count (if available)
   */
  async getRealtimeData(propertyId: string): Promise<{ activeUsers: number } | null> {
    try {
      const realtimeUrl = `${this.baseUrl}/${this.apiVersion}/${propertyId}:runRealtimeReport`
      
      const requestBody = {
        metrics: [{ name: 'activeUsers' }],
        limit: 1
      }

      const data = await this.makeRequest(realtimeUrl, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      if (data.totals && data.totals.length > 0) {
        const activeUsers = parseInt(data.totals[0].metricValues[0].value) || 0
        return { activeUsers }
      }

      return null
    } catch (error) {
      console.warn('Failed to fetch realtime data:', error)
      return null
    }
  }
}