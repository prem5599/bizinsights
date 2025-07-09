// lib/reports/generator.ts
import { prisma } from '@/lib/prisma'

export interface ReportData {
  organization: {
    id: string
    name: string
    slug: string
  }
  period: {
    start: Date
    end: Date
    type: 'daily' | 'weekly' | 'monthly'
  }
  summary: {
    totalRevenue: number
    totalOrders: number
    totalCustomers: number
    totalSessions: number
    avgOrderValue: number
    conversionRate: number
    revenueChange: number
    ordersChange: number
    performanceScore: number
  }
  metrics: {
    revenue: Array<{ date: string; value: number }>
    orders: Array<{ date: string; value: number }>
    customers: Array<{ date: string; value: number }>
    sessions: Array<{ date: string; value: number }>
  }
  insights: Array<{
    type: string
    title: string
    description: string
    impactScore: number
  }>
  recommendations: Array<{
    category: string
    title: string
    description: string
    priority: 'high' | 'medium' | 'low'
    actionable: boolean
  }>
  topProducts?: Array<{
    name: string
    revenue: number
    orders: number
    percentage: number
  }>
  trafficSources?: Array<{
    source: string
    sessions: number
    conversion: number
    percentage: number
  }>
  generatedAt: Date
}

export class ReportGenerator {
  /**
   * Generate weekly business report
   */
  static async generateWeeklyReport(organizationId: string): Promise<ReportData> {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    return this.generateReport(organizationId, startDate, endDate, 'weekly')
  }

  /**
   * Generate monthly business report
   */
  static async generateMonthlyReport(organizationId: string): Promise<ReportData> {
    const endDate = new Date()
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
    
    return this.generateReport(organizationId, startDate, endDate, 'monthly')
  }

  /**
   * Generate custom date range report
   */
  static async generateCustomReport(
    organizationId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<ReportData> {
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const type = daysDiff <= 1 ? 'daily' : daysDiff <= 7 ? 'weekly' : 'monthly'
    
    return this.generateReport(organizationId, startDate, endDate, type)
  }

  /**
   * Core report generation logic
   */
  private static async generateReport(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    type: 'daily' | 'weekly' | 'monthly'
  ): Promise<ReportData> {
    // Get organization details
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true }
    })

    if (!organization) {
      throw new Error('Organization not found')
    }

    // Get active integrations
    const integrations = await prisma.integration.findMany({
      where: { organizationId, status: 'active' },
      select: { id: true }
    })

    const integrationIds = integrations.map(i => i.id)

    if (integrationIds.length === 0) {
      return this.generateEmptyReport(organization, startDate, endDate, type)
    }

    // Generate report sections
    const [metrics, summary, insights, recommendations] = await Promise.all([
      this.getMetricsData(integrationIds, startDate, endDate),
      this.getSummaryData(integrationIds, startDate, endDate),
      this.getInsightsData(organizationId),
      this.getRecommendations(integrationIds, startDate, endDate)
    ])

    const reportData: ReportData = {
      organization,
      period: { start: startDate, end: endDate, type },
      summary,
      metrics,
      insights,
      recommendations,
      generatedAt: new Date()
    }

    // Store report in database
    await this.storeReport(organizationId, reportData)

    return reportData
  }

  /**
   * Get metrics data for the report period
   */
  private static async getMetricsData(
    integrationIds: string[],
    startDate: Date,
    endDate: Date
  ) {
    const dailyMetrics = await prisma.$queryRaw`
      SELECT 
        DATE("dateRecorded") as date,
        "metricType",
        SUM("value") as total_value
      FROM "DataPoint"
      WHERE "integrationId" = ANY(${integrationIds})
        AND "dateRecorded" >= ${startDate}
        AND "dateRecorded" <= ${endDate}
      GROUP BY DATE("dateRecorded"), "metricType"
      ORDER BY date ASC
    ` as Array<{ date: Date; metricType: string; total_value: number }>

    // Group by metric type
    const groupedMetrics = dailyMetrics.reduce((acc, item) => {
      const dateStr = item.date.toISOString().split('T')[0]
      if (!acc[item.metricType]) {
        acc[item.metricType] = []
      }
      acc[item.metricType].push({
        date: dateStr,
        value: Number(item.total_value)
      })
      return acc
    }, {} as Record<string, Array<{ date: string; value: number }>>)

    return {
      revenue: groupedMetrics.revenue || [],
      orders: groupedMetrics.orders || [],
      customers: groupedMetrics.customers || [],
      sessions: groupedMetrics.sessions || []
    }
  }

  /**
   * Get summary statistics
   */
  private static async getSummaryData(
    integrationIds: string[],
    startDate: Date,
    endDate: Date
  ) {
    // Current period totals
    const currentTotals = await prisma.$queryRaw`
      SELECT 
        "metricType",
        SUM("value") as total_value
      FROM "DataPoint"
      WHERE "integrationId" = ANY(${integrationIds})
        AND "dateRecorded" >= ${startDate}
        AND "dateRecorded" <= ${endDate}
      GROUP BY "metricType"
    ` as Array<{ metricType: string; total_value: number }>

    // Previous period for comparison
    const periodLength = endDate.getTime() - startDate.getTime()
    const previousStart = new Date(startDate.getTime() - periodLength)
    const previousEnd = startDate

    const previousTotals = await prisma.$queryRaw`
      SELECT 
        "metricType",
        SUM("value") as total_value
      FROM "DataPoint"
      WHERE "integrationId" = ANY(${integrationIds})
        AND "dateRecorded" >= ${previousStart}
        AND "dateRecorded" < ${previousEnd}
      GROUP BY "metricType"
    ` as Array<{ metricType: string; total_value: number }>

    // Convert to objects for easier access
    const current = currentTotals.reduce((acc, item) => {
      acc[item.metricType] = Number(item.total_value)
      return acc
    }, {} as Record<string, number>)

    const previous = previousTotals.reduce((acc, item) => {
      acc[item.metricType] = Number(item.total_value)
      return acc
    }, {} as Record<string, number>)

    // Calculate derived metrics
    const totalRevenue = current.revenue || 0
    const totalOrders = current.orders || 0
    const totalCustomers = current.customers || 0
    const totalSessions = current.sessions || 0

    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const conversionRate = totalSessions > 0 ? (totalOrders / totalSessions) * 100 : 0

    // Calculate changes
    const revenueChange = previous.revenue > 0 
      ? ((totalRevenue - previous.revenue) / previous.revenue) * 100 
      : 0

    const ordersChange = previous.orders > 0 
      ? ((totalOrders - previous.orders) / previous.orders) * 100 
      : 0

    // Calculate performance score (0-100)
    const performanceScore = this.calculatePerformanceScore({
      revenueChange,
      ordersChange,
      conversionRate,
      avgOrderValue
    })

    return {
      totalRevenue,
      totalOrders,
      totalCustomers,
      totalSessions,
      avgOrderValue,
      conversionRate,
      revenueChange,
      ordersChange,
      performanceScore
    }
  }

  /**
   * Get insights for the report
   */
  private static async getInsightsData(organizationId: string) {
    const insights = await prisma.insight.findMany({
      where: { organizationId },
      orderBy: { impactScore: 'desc' },
      take: 5,
      select: {
        type: true,
        title: true,
        description: true,
        impactScore: true
      }
    })

    return insights
  }

  /**
   * Generate actionable recommendations
   */
  private static async getRecommendations(
    integrationIds: string[],
    startDate: Date,
    endDate: Date
  ) {
    const recommendations = []

    // Get basic metrics for analysis
    const totals = await prisma.$queryRaw`
      SELECT 
        "metricType",
        SUM("value") as total_value
      FROM "DataPoint"
      WHERE "integrationId" = ANY(${integrationIds})
        AND "dateRecorded" >= ${startDate}
        AND "dateRecorded" <= ${endDate}
      GROUP BY "metricType"
    ` as Array<{ metricType: string; total_value: number }>

    const metrics = totals.reduce((acc, item) => {
      acc[item.metricType] = Number(item.total_value)
      return acc
    }, {} as Record<string, number>)

    const orders = metrics.orders || 0
    const sessions = metrics.sessions || 0
    const revenue = metrics.revenue || 0

    // Conversion rate recommendation
    if (sessions > 0) {
      const conversionRate = (orders / sessions) * 100
      if (conversionRate < 2) {
        recommendations.push({
          category: 'conversion',
          title: 'Improve conversion rate',
          description: `Your conversion rate is ${conversionRate.toFixed(2)}%. Consider optimizing your checkout process, product pages, and pricing strategy.`,
          priority: 'high' as const,
          actionable: true
        })
      }
    }

    // Revenue per order recommendation
    if (orders > 0) {
      const avgOrderValue = revenue / orders
      if (avgOrderValue < 50) {
        recommendations.push({
          category: 'revenue',
          title: 'Increase average order value',
          description: `Your average order value is $${avgOrderValue.toFixed(2)}. Consider implementing upselling, cross-selling, or bundling strategies.`,
          priority: 'medium' as const,
          actionable: true
        })
      }
    }

    // Traffic recommendation
    if (sessions < 1000) {
      recommendations.push({
        category: 'traffic',
        title: 'Increase website traffic',
        description: 'Your traffic volume is relatively low. Consider investing in SEO, content marketing, or paid advertising to drive more visitors.',
        priority: 'medium' as const,
        actionable: true
      })
    }

    // Default recommendations if no data
    if (recommendations.length === 0) {
      recommendations.push({
        category: 'general',
        title: 'Continue monitoring performance',
        description: 'Keep tracking your key metrics and look for patterns in your business data.',
        priority: 'low' as const,
        actionable: false
      })
    }

    return recommendations
  }

  /**
   * Calculate overall performance score
   */
  private static calculatePerformanceScore(metrics: {
    revenueChange: number
    ordersChange: number
    conversionRate: number
    avgOrderValue: number
  }): number {
    let score = 50 // Base score

    // Revenue growth factor (0-25 points)
    if (metrics.revenueChange > 20) score += 25
    else if (metrics.revenueChange > 10) score += 15
    else if (metrics.revenueChange > 0) score += 10
    else if (metrics.revenueChange < -20) score -= 25
    else if (metrics.revenueChange < -10) score -= 15

    // Orders growth factor (0-15 points)
    if (metrics.ordersChange > 15) score += 15
    else if (metrics.ordersChange > 5) score += 10
    else if (metrics.ordersChange > 0) score += 5
    else if (metrics.ordersChange < -15) score -= 15

    // Conversion rate factor (0-10 points)
    if (metrics.conversionRate > 5) score += 10
    else if (metrics.conversionRate > 3) score += 5
    else if (metrics.conversionRate < 1) score -= 10

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  /**
   * Store report in database
   */
  private static async storeReport(organizationId: string, reportData: ReportData) {
    await prisma.report.create({
      data: {
        organizationId,
        reportType: reportData.period.type,
        title: `${reportData.period.type.charAt(0).toUpperCase() + reportData.period.type.slice(1)} Report - ${reportData.period.start.toLocaleDateString()}`,
        content: reportData,
        dateRangeStart: reportData.period.start,
        dateRangeEnd: reportData.period.end
      }
    })
  }

  /**
   * Generate empty report for organizations without data
   */
  private static generateEmptyReport(
    organization: any,
    startDate: Date,
    endDate: Date,
    type: 'daily' | 'weekly' | 'monthly'
  ): ReportData {
    return {
      organization,
      period: { start: startDate, end: endDate, type },
      summary: {
        totalRevenue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        totalSessions: 0,
        avgOrderValue: 0,
        conversionRate: 0,
        revenueChange: 0,
        ordersChange: 0,
        performanceScore: 0
      },
      metrics: {
        revenue: [],
        orders: [],
        customers: [],
        sessions: []
      },
      insights: [],
      recommendations: [
        {
          category: 'setup',
          title: 'Connect your first integration',
          description: 'Add Shopify, Stripe, or Google Analytics to start generating detailed business reports.',
          priority: 'high',
          actionable: true
        }
      ],
      generatedAt: new Date()
    }
  }
}