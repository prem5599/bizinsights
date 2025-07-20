// src/lib/integrations/google-analytics.ts
import { prisma } from '@/lib/prisma'

/**
 * Google Analytics API Types
 */
interface GAProperty {
  name: string
  displayName: string
  propertyType: string
  createTime: string
  updateTime: string
  timeZone: string
  currencyCode: string
}

interface GAMetric {
  name: string
  values: string[]
}

interface GADimension {
  name: string
  values: string[]
}

interface GAReportRow {
  dimensionValues: GADimension[]
  metricValues: GAMetric[]
}

interface GAReportResponse {
  rows?: GAReportRow[]
  metadata?: any
  rowCount?: number
}

interface GABatchGetReportsRequest {
  reportRequests: GAReportRequest[]
}

interface GAReportRequest {
  viewId?: string
  property?: string
  dateRanges: Array<{
    startDate: string
    endDate: string
  }>
  metrics: Array<{
    expression: string
    alias?: string
  }>
  dimensions?: Array<{
    name: string
  }>
  dimensionFilterClauses?: any[]
  metricFilterClauses?: any[]
  orderBys?: any[]
  pageSize?: number
  pageToken?: string
}

/**
 * Google Analytics Integration Class
 */
export class GoogleAnalyticsIntegration {
  private accessToken: string
  private refreshToken: string
  private propertyId: string
  private clientId: string
  private clientSecret: string

  constructor(accessToken: string, refreshToken: string, propertyId: string) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
    this.propertyId = propertyId
    this.clientId = process.env.GOOGLE_CLIENT_ID!
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  }

  /**
   * Refresh access token if needed
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token'
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      this.accessToken = data.access_token
      
      // Update token in database
      await prisma.integration.updateMany({
        where: {
          platform: 'google_analytics',
          refreshToken: this.refreshToken
        },
        data: {
          accessToken: this.accessToken,
          tokenExpiresAt: new Date(Date.now() + (data.expires_in * 1000))
        }
      })

      console.log('Google Analytics access token refreshed')
    } catch (error) {
      console.error('Error refreshing Google Analytics token:', error)
      throw error
    }
  }

  /**
   * Make authenticated API request with token refresh
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

        // Token expired - refresh and retry
        if (response.status === 401 && attempt < retries) {
          await this.refreshAccessToken()
          continue
        }

        // Rate limiting - wait and retry
        if (response.status === 429 && attempt < retries) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60')
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
          continue
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          throw new Error(`Google Analytics API error: ${response.status} ${response.statusText} - ${errorText}`)
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
   * Test connection to Google Analytics
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getProperty()
      return true
    } catch (error) {
      console.error('Google Analytics connection test failed:', error)
      return false
    }
  }

  /**
   * Get property information
   */
  async getProperty(): Promise<GAProperty> {
    const data = await this.makeRequest(
      `https://analyticsadmin.googleapis.com/v1beta/properties/${this.propertyId}`
    )
    return data
  }

  /**
   * Get analytics data using GA4 Data API
   */
  async runReport(request: GAReportRequest): Promise<GAReportResponse> {
    const url = `https://analyticsdata.googleapis.com/v1beta/properties/${this.propertyId}:runReport`
    
    const response = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(request)
    })

    return response
  }

  /**
   * Get batch reports
   */
  async batchRunReports(requests: GAReportRequest[]): Promise<GAReportResponse[]> {
    const url = `https://analyticsdata.googleapis.com/v1beta/properties/${this.propertyId}:batchRunReports`
    
    const response = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        requests
      })
    })

    return response.reports || []
  }

  /**
   * Get real-time data
   */
  async runRealtimeReport(request: Omit<GAReportRequest, 'dateRanges'>): Promise<GAReportResponse> {
    const url = `https://analyticsdata.googleapis.com/v1beta/properties/${this.propertyId}:runRealtimeReport`
    
    const response = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(request)
    })

    return response
  }

  /**
   * Get core website metrics
   */
  async getWebsiteMetrics(startDate: string, endDate: string): Promise<{
    sessions: number
    users: number
    pageviews: number
    bounceRate: number
    avgSessionDuration: number
    newUsers: number
  }> {
    const request: GAReportRequest = {
      dateRanges: [{
        startDate,
        endDate
      }],
      metrics: [
        { expression: 'sessions' },
        { expression: 'totalUsers' },
        { expression: 'screenPageViews' },
        { expression: 'bounceRate' },
        { expression: 'averageSessionDuration' },
        { expression: 'newUsers' }
      ]
    }

    const response = await this.runReport(request)
    
    if (!response.rows || response.rows.length === 0) {
      return {
        sessions: 0,
        users: 0,
        pageviews: 0,
        bounceRate: 0,
        avgSessionDuration: 0,
        newUsers: 0
      }
    }

    const row = response.rows[0]
    return {
      sessions: parseInt(row.metricValues[0]?.values[0] || '0'),
      users: parseInt(row.metricValues[1]?.values[0] || '0'),
      pageviews: parseInt(row.metricValues[2]?.values[0] || '0'),
      bounceRate: parseFloat(row.metricValues[3]?.values[0] || '0'),
      avgSessionDuration: parseFloat(row.metricValues[4]?.values[0] || '0'),
      newUsers: parseInt(row.metricValues[5]?.values[0] || '0')
    }
  }

  /**
   * Get traffic sources
   */
  async getTrafficSources(startDate: string, endDate: string): Promise<Array<{
    source: string
    medium: string
    sessions: number
    users: number
    percentage: number
  }>> {
    const request: GAReportRequest = {
      dateRanges: [{
        startDate,
        endDate
      }],
      dimensions: [
        { name: 'sessionSource' },
        { name: 'sessionMedium' }
      ],
      metrics: [
        { expression: 'sessions' },
        { expression: 'totalUsers' }
      ],
      orderBys: [{
        metric: { metricName: 'sessions' },
        desc: true
      }],
      pageSize: 10
    }

    const response = await this.runReport(request)
    
    if (!response.rows || response.rows.length === 0) {
      return []
    }

    const totalSessions = response.rows.reduce((sum, row) => 
      sum + parseInt(row.metricValues[0]?.values[0] || '0'), 0)

    return response.rows.map(row => ({
      source: row.dimensionValues[0]?.values[0] || 'Unknown',
      medium: row.dimensionValues[1]?.values[0] || 'Unknown',
      sessions: parseInt(row.metricValues[0]?.values[0] || '0'),
      users: parseInt(row.metricValues[1]?.values[0] || '0'),
      percentage: totalSessions > 0 ? 
        (parseInt(row.metricValues[0]?.values[0] || '0') / totalSessions) * 100 : 0
    }))
  }

  /**
   * Get page performance
   */
  async getPagePerformance(startDate: string, endDate: string): Promise<Array<{
    page: string
    pageviews: number
    uniquePageviews: number
    avgTimeOnPage: number
    exitRate: number
  }>> {
    const request: GAReportRequest = {
      dateRanges: [{
        startDate,
        endDate
      }],
      dimensions: [
        { name: 'pagePath' }
      ],
      metrics: [
        { expression: 'screenPageViews' },
        { expression: 'sessions' },
        { expression: 'averageSessionDuration' },
        { expression: 'exitRate' }
      ],
      orderBys: [{
        metric: { metricName: 'screenPageViews' },
        desc: true
      }],
      pageSize: 20
    }

    const response = await this.runReport(request)
    
    if (!response.rows || response.rows.length === 0) {
      return []
    }

    return response.rows.map(row => ({
      page: row.dimensionValues[0]?.values[0] || 'Unknown',
      pageviews: parseInt(row.metricValues[0]?.values[0] || '0'),
      uniquePageviews: parseInt(row.metricValues[1]?.values[0] || '0'),
      avgTimeOnPage: parseFloat(row.metricValues[2]?.values[0] || '0'),
      exitRate: parseFloat(row.metricValues[3]?.values[0] || '0')
    }))
  }

  /**
   * Get device and browser data
   */
  async getDeviceData(startDate: string, endDate: string): Promise<{
    devices: Array<{ category: string; sessions: number; percentage: number }>
    browsers: Array<{ browser: string; sessions: number; percentage: number }>
    operatingSystems: Array<{ os: string; sessions: number; percentage: number }>
  }> {
    const requests: GAReportRequest[] = [
      // Device categories
      {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ expression: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
      },
      // Browsers
      {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'browser' }],
        metrics: [{ expression: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        pageSize: 10
      },
      // Operating Systems
      {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'operatingSystem' }],
        metrics: [{ expression: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        pageSize: 10
      }
    ]

    const responses = await this.batchRunReports(requests)

    const calculatePercentages = (rows: GAReportRow[]) => {
      const totalSessions = rows.reduce((sum, row) => 
        sum + parseInt(row.metricValues[0]?.values[0] || '0'), 0)
      
      return rows.map(row => ({
        sessions: parseInt(row.metricValues[0]?.values[0] || '0'),
        percentage: totalSessions > 0 ? 
          (parseInt(row.metricValues[0]?.values[0] || '0') / totalSessions) * 100 : 0
      }))
    }

    return {
      devices: (responses[0]?.rows || []).map((row, index) => {
        const percentages = calculatePercentages(responses[0]?.rows || [])
        return {
          category: row.dimensionValues[0]?.values[0] || 'Unknown',
          sessions: percentages[index]?.sessions || 0,
          percentage: percentages[index]?.percentage || 0
        }
      }),
      browsers: (responses[1]?.rows || []).map((row, index) => {
        const percentages = calculatePercentages(responses[1]?.rows || [])
        return {
          browser: row.dimensionValues[0]?.values[0] || 'Unknown',
          sessions: percentages[index]?.sessions || 0,
          percentage: percentages[index]?.percentage || 0
        }
      }),
      operatingSystems: (responses[2]?.rows || []).map((row, index) => {
        const percentages = calculatePercentages(responses[2]?.rows || [])
        return {
          os: row.dimensionValues[0]?.values[0] || 'Unknown',
          sessions: percentages[index]?.sessions || 0,
          percentage: percentages[index]?.percentage || 0
        }
      })
    }
  }

  /**
   * Get conversion data (if goals are set up)
   */
  async getConversions(startDate: string, endDate: string): Promise<Array<{
    eventName: string
    eventCount: number
    conversionRate: number
  }>> {
    const request: GAReportRequest = {
      dateRanges: [{
        startDate,
        endDate
      }],
      dimensions: [
        { name: 'eventName' }
      ],
      metrics: [
        { expression: 'eventCount' },
        { expression: 'conversions' }
      ],
      dimensionFilterClauses: [{
        filters: [{
          dimensionName: 'eventName',
          operator: 'IN_LIST',
          expressions: ['purchase', 'sign_up', 'contact', 'download', 'subscribe']
        }]
      }],
      orderBys: [{
        metric: { metricName: 'eventCount' },
        desc: true
      }]
    }

    const response = await this.runReport(request)
    
    if (!response.rows || response.rows.length === 0) {
      return []
    }

    return response.rows.map(row => {
      const eventCount = parseInt(row.metricValues[0]?.values[0] || '0')
      const conversions = parseInt(row.metricValues[1]?.values[0] || '0')
      
      return {
        eventName: row.dimensionValues[0]?.values[0] || 'Unknown',
        eventCount,
        conversionRate: eventCount > 0 ? (conversions / eventCount) * 100 : 0
      }
    })
  }

  /**
   * Get real-time active users
   */
  async getActiveUsers(): Promise<{
    activeUsers: number
    activeUsersLast24h: number
    topPages: Array<{ page: string; activeUsers: number }>
  }> {
    const requests = [
      // Current active users
      {
        metrics: [{ expression: 'activeUsers' }]
      },
      // Active users by page
      {
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ expression: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        pageSize: 10
      }
    ]

    try {
      const [currentResponse, pagesResponse] = await Promise.all([
        this.runRealtimeReport(requests[0]),
        this.runRealtimeReport(requests[1])
      ])

      // Get 24h active users from regular API
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      const dailyMetrics = await this.getWebsiteMetrics(
        yesterday.toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      )

      return {
        activeUsers: parseInt(currentResponse.rows?.[0]?.metricValues[0]?.values[0] || '0'),
        activeUsersLast24h: dailyMetrics.users,
        topPages: (pagesResponse.rows || []).map(row => ({
          page: row.dimensionValues[0]?.values[0] || 'Unknown',
          activeUsers: parseInt(row.metricValues[0]?.values[0] || '0')
        }))
      }
    } catch (error) {
      console.error('Error fetching real-time data:', error)
      return {
        activeUsers: 0,
        activeUsersLast24h: 0,
        topPages: []
      }
    }
  }

  /**
   * Sync historical data for initial setup
   */
  async syncHistoricalData(integrationId: string, days: number = 30): Promise<{
    sessions: number
    users: number
    pageviews: number
  }> {
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]

    try {
      // Get daily metrics for the period
      const request: GAReportRequest = {
        dateRanges: [{
          startDate: startDateStr,
          endDate
        }],
        dimensions: [
          { name: 'date' }
        ],
        metrics: [
          { expression: 'sessions' },
          { expression: 'totalUsers' },
          { expression: 'screenPageViews' },
          { expression: 'newUsers' },
          { expression: 'averageSessionDuration' },
          { expression: 'bounceRate' }
        ],
        orderBys: [{
          dimension: { dimensionName: 'date' },
          desc: false
        }]
      }

      const response = await this.runReport(request)
      
      if (!response.rows || response.rows.length === 0) {
        return { sessions: 0, users: 0, pageviews: 0 }
      }

      // Store daily data points
      const dataPoints: any[] = []
      for (const row of response.rows) {
        const date = row.dimensionValues[0]?.values[0] || ''
        const dateRecorded = new Date(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`)
        
        const sessions = parseInt(row.metricValues[0]?.values[0] || '0')
        const users = parseInt(row.metricValues[1]?.values[0] || '0')
        const pageviews = parseInt(row.metricValues[2]?.values[0] || '0')
        const newUsers = parseInt(row.metricValues[3]?.values[0] || '0')
        const avgSessionDuration = parseFloat(row.metricValues[4]?.values[0] || '0')
        const bounceRate = parseFloat(row.metricValues[5]?.values[0] || '0')

        // Sessions data point
        dataPoints.push({
          integrationId,
          metricType: 'sessions',
          value: sessions,
          metadata: {
            date,
            source: 'google_analytics_sync'
          },
          dateRecorded
        })

        // Users data point
        dataPoints.push({
          integrationId,
          metricType: 'users',
          value: users,
          metadata: {
            date,
            newUsers,
            source: 'google_analytics_sync'
          },
          dateRecorded
        })

        // Pageviews data point
        dataPoints.push({
          integrationId,
          metricType: 'pageviews',
          value: pageviews,
          metadata: {
            date,
            avgSessionDuration,
            bounceRate,
            source: 'google_analytics_sync'
          },
          dateRecorded
        })
      }

      // Save all data points
      await prisma.dataPoint.createMany({ data: dataPoints })

      // Return summary counts
      const totalSessions = response.rows.reduce((sum, row) => 
        sum + parseInt(row.metricValues[0]?.values[0] || '0'), 0)
      const totalUsers = response.rows.reduce((sum, row) => 
        sum + parseInt(row.metricValues[1]?.values[0] || '0'), 0)
      const totalPageviews = response.rows.reduce((sum, row) => 
        sum + parseInt(row.metricValues[2]?.values[0] || '0'), 0)

      console.log(`Synced ${dataPoints.length} Google Analytics data points`)
      
      return {
        sessions: totalSessions,
        users: totalUsers,
        pageviews: totalPageviews
      }
    } catch (error) {
      console.error('Error syncing Google Analytics historical data:', error)
      throw error
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  static generateAuthUrl(state: string): string {
    const redirectUri = `${process.env.NEXTAUTH_URL || process.env.APP_URL}/api/integrations/google-analytics/callback`
    
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      state
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(code: string): Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    scope: string
  }> {
    const redirectUri = `${process.env.NEXTAUTH_URL || process.env.APP_URL}/api/integrations/google-analytics/callback`
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Failed to exchange code for tokens: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response.json()
  }

  /**
   * Get available GA4 properties for a user
   */
  static async getAvailableProperties(accessToken: string): Promise<Array<{
    propertyId: string
    displayName: string
    websiteUrl?: string
  }>> {
    const response = await fetch('https://analyticsadmin.googleapis.com/v1beta/properties', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Failed to fetch properties: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    
    return (data.properties || []).map((property: any) => ({
      propertyId: property.name.split('/')[1], // Extract ID from "properties/123456789"
      displayName: property.displayName,
      websiteUrl: property.websiteUrl
    }))
  }
}