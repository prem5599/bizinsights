// lib/insights/engine.ts
import { prisma } from '@/lib/prisma'

export interface InsightData {
  type: 'trend' | 'anomaly' | 'recommendation' | 'opportunity'
  title: string
  description: string
  impactScore: number
  metadata: Record<string, any>
  category: 'revenue' | 'customers' | 'performance' | 'growth'
  actionable: boolean
  urgency: 'low' | 'medium' | 'high'
}

export class InsightsEngine {
  private organizationId: string
  private integrationIds: string[]

  constructor(organizationId: string, integrationIds: string[]) {
    this.organizationId = organizationId
    this.integrationIds = integrationIds
  }

  /**
   * Generate all insights for an organization
   */
  async generateInsights(): Promise<InsightData[]> {
    if (this.integrationIds.length === 0) {
      return this.getOnboardingInsights()
    }

    const insights: InsightData[] = []

    // Revenue Analysis
    const revenueInsights = await this.analyzeRevenueTrends()
    insights.push(...revenueInsights)

    // Customer Analysis
    const customerInsights = await this.analyzeCustomerPatterns()
    insights.push(...customerInsights)

    // Performance Analysis
    const performanceInsights = await this.analyzePerformanceMetrics()
    insights.push(...performanceInsights)

    // Anomaly Detection
    const anomalies = await this.detectAnomalies()
    insights.push(...anomalies)

    // Growth Opportunities
    const opportunities = await this.identifyGrowthOpportunities()
    insights.push(...opportunities)

    // Sort by impact score and urgency
    return insights
      .sort((a, b) => {
        const urgencyWeight = { high: 3, medium: 2, low: 1 }
        const aScore = a.impactScore * urgencyWeight[a.urgency]
        const bScore = b.impactScore * urgencyWeight[b.urgency]
        return bScore - aScore
      })
      .slice(0, 10) // Limit to top 10 insights
  }

  /**
   * Analyze revenue trends and patterns
   */
  private async analyzeRevenueTrends(): Promise<InsightData[]> {
    const insights: InsightData[] = []
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

    // Get revenue data for comparison periods
    const currentRevenue = await this.getRevenueData(thirtyDaysAgo)
    const previousRevenue = await this.getRevenueData(sixtyDaysAgo, thirtyDaysAgo)

    const currentTotal = currentRevenue.reduce((sum, d) => sum + Number(d.value), 0)
    const previousTotal = previousRevenue.reduce((sum, d) => sum + Number(d.value), 0)

    if (previousTotal > 0) {
      const change = ((currentTotal - previousTotal) / previousTotal) * 100

      if (Math.abs(change) >= 10) {
        const isPositive = change > 0
        insights.push({
          type: 'trend',
          title: `Revenue ${isPositive ? 'growth' : 'decline'} detected`,
          description: `Your revenue has ${isPositive ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% over the last 30 days compared to the previous period.`,
          impactScore: Math.min(Math.abs(change) / 2, 10),
          metadata: { change, currentTotal, previousTotal, period: '30d' },
          category: 'revenue',
          actionable: true,
          urgency: Math.abs(change) > 25 ? 'high' : Math.abs(change) > 15 ? 'medium' : 'low'
        })
      }
    }

    // Weekly revenue pattern analysis
    const weeklyPattern = await this.analyzeWeeklyRevenuePattern()
    if (weeklyPattern) {
      insights.push(weeklyPattern)
    }

    // Revenue concentration analysis
    const concentration = await this.analyzeRevenueConcentration()
    if (concentration) {
      insights.push(concentration)
    }

    return insights
  }

  /**
   * Analyze customer patterns and behavior
   */
  private async analyzeCustomerPatterns(): Promise<InsightData[]> {
    const insights: InsightData[] = []
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Customer acquisition analysis
    const newCustomers = await prisma.dataPoint.count({
      where: {
        integrationId: { in: this.integrationIds },
        metricType: 'customers',
        dateRecorded: { gte: thirtyDaysAgo }
      }
    })

    const totalOrders = await prisma.dataPoint.count({
      where: {
        integrationId: { in: this.integrationIds },
        metricType: 'orders',
        dateRecorded: { gte: thirtyDaysAgo }
      }
    })

    // Calculate customer lifetime value trends
    if (newCustomers > 0 && totalOrders > 0) {
      const avgOrdersPerCustomer = totalOrders / newCustomers

      if (avgOrdersPerCustomer > 2) {
        insights.push({
          type: 'opportunity',
          title: 'Strong customer retention detected',
          description: `Your customers are placing an average of ${avgOrdersPerCustomer.toFixed(1)} orders, indicating good retention. Consider implementing a loyalty program to further increase repeat purchases.`,
          impactScore: 7,
          metadata: { avgOrdersPerCustomer, newCustomers, totalOrders },
          category: 'customers',
          actionable: true,
          urgency: 'medium'
        })
      } else if (avgOrdersPerCustomer < 1.2) {
        insights.push({
          type: 'recommendation',
          title: 'Low customer retention rate',
          description: `Most customers are only making one purchase. Focus on improving customer retention through email marketing, product recommendations, or loyalty programs.`,
          impactScore: 8,
          metadata: { avgOrdersPerCustomer, newCustomers, totalOrders },
          category: 'customers',
          actionable: true,
          urgency: 'high'
        })
      }
    }

    return insights
  }

  /**
   * Analyze performance metrics and conversion rates
   */
  private async analyzePerformanceMetrics(): Promise<InsightData[]> {
    const insights: InsightData[] = []
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Get sessions and orders for conversion analysis
    const sessions = await prisma.dataPoint.aggregate({
      where: {
        integrationId: { in: this.integrationIds },
        metricType: 'sessions',
        dateRecorded: { gte: thirtyDaysAgo }
      },
      _sum: { value: true }
    })

    const orders = await prisma.dataPoint.aggregate({
      where: {
        integrationId: { in: this.integrationIds },
        metricType: 'orders',
        dateRecorded: { gte: thirtyDaysAgo }
      },
      _sum: { value: true }
    })

    const sessionCount = Number(sessions._sum.value || 0)
    const orderCount = Number(orders._sum.value || 0)

    if (sessionCount > 0) {
      const conversionRate = (orderCount / sessionCount) * 100

      if (conversionRate < 1) {
        insights.push({
          type: 'recommendation',
          title: 'Low conversion rate detected',
          description: `Your conversion rate is ${conversionRate.toFixed(2)}%, which is below industry average. Consider optimizing your checkout process, product pages, or pricing strategy.`,
          impactScore: 9,
          metadata: { conversionRate, sessions: sessionCount, orders: orderCount },
          category: 'performance',
          actionable: true,
          urgency: 'high'
        })
      } else if (conversionRate > 5) {
        insights.push({
          type: 'opportunity',
          title: 'Excellent conversion rate',
          description: `Your conversion rate of ${conversionRate.toFixed(2)}% is above industry average. Consider increasing traffic to capitalize on this high-converting experience.`,
          impactScore: 8,
          metadata: { conversionRate, sessions: sessionCount, orders: orderCount },
          category: 'performance',
          actionable: true,
          urgency: 'medium'
        })
      }
    }

    return insights
  }

  /**
   * Detect anomalies in business data
   */
  private async detectAnomalies(): Promise<InsightData[]> {
    const insights: InsightData[] = []
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // Get daily revenue for the last 7 days
    const dailyRevenue = await prisma.$queryRaw`
      SELECT 
        DATE("dateRecorded") as date,
        SUM("value") as total_revenue
      FROM "DataPoint"
      WHERE "integrationId" = ANY(${this.integrationIds})
        AND "metricType" = 'revenue'
        AND "dateRecorded" >= ${sevenDaysAgo}
      GROUP BY DATE("dateRecorded")
      ORDER BY date ASC
    ` as Array<{ date: Date; total_revenue: number }>

    if (dailyRevenue.length >= 3) {
      // Check for unusual spikes or drops (>50% change from average)
      const revenues = dailyRevenue.map(d => Number(d.total_revenue))
      const average = revenues.reduce((sum, val) => sum + val, 0) / revenues.length

      for (let i = 1; i < revenues.length; i++) {
        const change = average > 0 ? ((revenues[i] - average) / average) * 100 : 0

        if (Math.abs(change) > 50) {
          const isSpike = change > 0
          insights.push({
            type: 'anomaly',
            title: `Unusual revenue ${isSpike ? 'spike' : 'drop'} detected`,
            description: `Revenue on ${dailyRevenue[i].date.toLocaleDateString()} was ${Math.abs(change).toFixed(1)}% ${isSpike ? 'above' : 'below'} your recent average. ${isSpike ? 'Identify what drove this success to replicate it.' : 'Investigate potential issues that may have caused this decline.'}`,
            impactScore: Math.min(Math.abs(change) / 10, 10),
            metadata: { 
              date: dailyRevenue[i].date, 
              revenue: revenues[i], 
              average, 
              change 
            },
            category: 'revenue',
            actionable: true,
            urgency: isSpike ? 'medium' : 'high'
          })
        }
      }
    }

    return insights
  }

  /**
   * Identify growth opportunities
   */
  private async identifyGrowthOpportunities(): Promise<InsightData[]> {
    const insights: InsightData[] = []
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Analyze traffic sources performance (if available)
    const trafficSources = await prisma.$queryRaw`
      SELECT 
        ("metadata"->>'source') as source,
        SUM(CASE WHEN "metricType" = 'sessions' THEN "value" ELSE 0 END) as sessions,
        SUM(CASE WHEN "metricType" = 'orders' THEN "value" ELSE 0 END) as orders
      FROM "DataPoint"
      WHERE "integrationId" = ANY(${this.integrationIds})
        AND "dateRecorded" >= ${thirtyDaysAgo}
        AND "metadata"->>'source' IS NOT NULL
      GROUP BY "metadata"->>'source'
      HAVING SUM(CASE WHEN "metricType" = 'sessions' THEN "value" ELSE 0 END) > 0
      ORDER BY sessions DESC
    ` as Array<{ source: string; sessions: number; orders: number }>

    if (trafficSources.length > 1) {
      // Find best performing traffic source
      const sourcesWithConversion = trafficSources
        .filter(s => Number(s.sessions) > 10) // Minimum threshold
        .map(s => ({
          ...s,
          sessions: Number(s.sessions),
          orders: Number(s.orders),
          conversionRate: Number(s.sessions) > 0 ? (Number(s.orders) / Number(s.sessions)) * 100 : 0
        }))
        .sort((a, b) => b.conversionRate - a.conversionRate)

      if (sourcesWithConversion.length > 0) {
        const bestSource = sourcesWithConversion[0]
        const totalSessions = sourcesWithConversion.reduce((sum, s) => sum + s.sessions, 0)
        const sourceShare = (bestSource.sessions / totalSessions) * 100

        if (bestSource.conversionRate > 3 && sourceShare < 50) {
          insights.push({
            type: 'opportunity',
            title: `${bestSource.source} shows high conversion potential`,
            description: `${bestSource.source} has a ${bestSource.conversionRate.toFixed(1)}% conversion rate but only accounts for ${sourceShare.toFixed(1)}% of your traffic. Consider increasing investment in this channel.`,
            impactScore: 8,
            metadata: { 
              source: bestSource.source, 
              conversionRate: bestSource.conversionRate,
              sessions: bestSource.sessions,
              orders: bestSource.orders,
              share: sourceShare
            },
            category: 'growth',
            actionable: true,
            urgency: 'medium'
          })
        }
      }
    }

    return insights
  }

  /**
   * Get insights for organizations without integrations
   */
  private getOnboardingInsights(): InsightData[] {
    return [
      {
        type: 'recommendation',
        title: 'Connect your first data source',
        description: 'Start by connecting Shopify, Stripe, or Google Analytics to begin receiving AI-powered insights about your business performance.',
        impactScore: 10,
        metadata: { onboarding: true },
        category: 'growth',
        actionable: true,
        urgency: 'high'
      },
      {
        type: 'opportunity',
        title: 'Unlock business intelligence',
        description: 'Once connected, you\'ll receive insights about revenue trends, customer behavior, conversion optimization, and growth opportunities.',
        impactScore: 9,
        metadata: { onboarding: true },
        category: 'growth',
        actionable: true,
        urgency: 'medium'
      }
    ]
  }

  /**
   * Helper methods
   */
  private async getRevenueData(startDate: Date, endDate?: Date) {
    return prisma.dataPoint.findMany({
      where: {
        integrationId: { in: this.integrationIds },
        metricType: 'revenue',
        dateRecorded: {
          gte: startDate,
          ...(endDate && { lt: endDate })
        }
      },
      select: { value: true, dateRecorded: true, metadata: true }
    })
  }

  private async analyzeWeeklyRevenuePattern(): Promise<InsightData | null> {
    // Implementation for weekly pattern analysis
    // This would analyze which days of the week perform best
    return null
  }

  private async analyzeRevenueConcentration(): Promise<InsightData | null> {
    // Implementation for revenue concentration analysis
    // This would identify if revenue is too concentrated in few customers/products
    return null
  }
}