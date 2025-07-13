// src/lib/insights/engine.ts
import { prisma } from '@/lib/prisma'

/**
 * Insight Types
 */
export type InsightType = 'trend' | 'anomaly' | 'recommendation' | 'alert' | 'opportunity'

export interface InsightData {
  type: InsightType
  title: string
  description: string
  impactScore: number // 1-10
  confidence: number // 0-100
  category: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  actionable: boolean
  metadata: {
    metricType: string
    timeframe: string
    value?: number
    previousValue?: number
    changePercent?: number
    trend?: 'up' | 'down' | 'stable'
    data?: any
  }
}

export interface AnalyticsSnapshot {
  organizationId: string
  timeframe: { start: Date; end: Date }
  metrics: {
    revenue: { current: number; previous: number; change: number }
    orders: { current: number; previous: number; change: number }
    customers: { current: number; previous: number; change: number }
    sessions: { current: number; previous: number; change: number }
    conversion: { current: number; previous: number; change: number }
    aov: { current: number; previous: number; change: number }
  }
  trends: Array<{ date: string; revenue: number; orders: number; sessions: number }>
  comparisons: { industry?: any; seasonality?: any }
}

/**
 * AI Insights Engine Class
 */
export class AIInsightsEngine {
  private organizationId: string

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  /**
   * Generate all insights for an organization
   */
  async generateInsights(timeframe: { start: Date; end: Date }): Promise<InsightData[]> {
    try {
      console.log(`Generating insights for org ${this.organizationId}`)
      
      // Get analytics snapshot
      const snapshot = await this.getAnalyticsSnapshot(timeframe)
      
      // Generate different types of insights
      const insights: InsightData[] = []
      
      // Trend analysis
      insights.push(...await this.analyzeTrends(snapshot))
      
      // Anomaly detection
      insights.push(...await this.detectAnomalies(snapshot))
      
      // Performance recommendations
      insights.push(...await this.generateRecommendations(snapshot))
      
      // Growth opportunities
      insights.push(...await this.identifyOpportunities(snapshot))
      
      // Revenue optimization
      insights.push(...await this.analyzeRevenue(snapshot))
      
      // Customer behavior insights
      insights.push(...await this.analyzeCustomerBehavior(snapshot))
      
      // Sort by impact score and confidence
      insights.sort((a, b) => (b.impactScore * b.confidence) - (a.impactScore * a.confidence))
      
      // Save insights to database
      await this.saveInsights(insights)
      
      console.log(`Generated ${insights.length} insights`)
      return insights
      
    } catch (error) {
      console.error('Error generating insights:', error)
      throw error
    }
  }

  /**
   * Get comprehensive analytics snapshot
   */
  private async getAnalyticsSnapshot(timeframe: { start: Date; end: Date }): Promise<AnalyticsSnapshot> {
    // Calculate previous period for comparison
    const periodLength = timeframe.end.getTime() - timeframe.start.getTime()
    const previousPeriod = {
      start: new Date(timeframe.start.getTime() - periodLength),
      end: new Date(timeframe.start.getTime())
    }

    // Get integrations for this organization
    const integrations = await prisma.integration.findMany({
      where: { organizationId: this.organizationId, status: 'active' }
    })

    const integrationIds = integrations.map(i => i.id)

    // Get current period metrics
    const currentMetrics = await this.getMetrics(integrationIds, timeframe)
    const previousMetrics = await this.getMetrics(integrationIds, previousPeriod)

    // Get trend data (daily breakdown)
    const trends = await this.getTrendData(integrationIds, timeframe)

    return {
      organizationId: this.organizationId,
      timeframe,
      metrics: {
        revenue: {
          current: currentMetrics.revenue,
          previous: previousMetrics.revenue,
          change: this.calculatePercentChange(currentMetrics.revenue, previousMetrics.revenue)
        },
        orders: {
          current: currentMetrics.orders,
          previous: previousMetrics.orders,
          change: this.calculatePercentChange(currentMetrics.orders, previousMetrics.orders)
        },
        customers: {
          current: currentMetrics.customers,
          previous: previousMetrics.customers,
          change: this.calculatePercentChange(currentMetrics.customers, previousMetrics.customers)
        },
        sessions: {
          current: currentMetrics.sessions,
          previous: previousMetrics.sessions,
          change: this.calculatePercentChange(currentMetrics.sessions, previousMetrics.sessions)
        },
        conversion: {
          current: currentMetrics.orders > 0 ? (currentMetrics.orders / currentMetrics.sessions) * 100 : 0,
          previous: previousMetrics.orders > 0 ? (previousMetrics.orders / previousMetrics.sessions) * 100 : 0,
          change: 0 // Will be calculated
        },
        aov: {
          current: currentMetrics.orders > 0 ? currentMetrics.revenue / currentMetrics.orders : 0,
          previous: previousMetrics.orders > 0 ? previousMetrics.revenue / previousMetrics.orders : 0,
          change: 0 // Will be calculated
        }
      },
      trends,
      comparisons: {}
    }
  }

  /**
   * Get aggregated metrics for a time period
   */
  private async getMetrics(integrationIds: string[], timeframe: { start: Date; end: Date }) {
    const results = await prisma.dataPoint.groupBy({
      by: ['metricType'],
      where: {
        integrationId: { in: integrationIds },
        dateRecorded: {
          gte: timeframe.start,
          lte: timeframe.end
        }
      },
      _sum: { value: true },
      _count: { value: true }
    })

    const metrics = {
      revenue: 0,
      orders: 0,
      customers: 0,
      sessions: 0
    }

    results.forEach(result => {
      const sum = Number(result._sum.value || 0)
      switch (result.metricType) {
        case 'revenue':
          metrics.revenue += sum
          break
        case 'orders':
        case 'order_created':
          metrics.orders += sum
          break
        case 'customer_created':
          metrics.customers += sum
          break
        case 'sessions':
          metrics.sessions += sum
          break
      }
    })

    return metrics
  }

  /**
   * Get daily trend data
   */
  private async getTrendData(integrationIds: string[], timeframe: { start: Date; end: Date }) {
    const trends = await prisma.dataPoint.findMany({
      where: {
        integrationId: { in: integrationIds },
        dateRecorded: {
          gte: timeframe.start,
          lte: timeframe.end
        },
        metricType: { in: ['revenue', 'orders', 'sessions'] }
      },
      orderBy: { dateRecorded: 'asc' }
    })

    // Group by date
    const trendMap = new Map<string, { revenue: number; orders: number; sessions: number }>()

    trends.forEach(point => {
      const date = point.dateRecorded.toISOString().split('T')[0]
      if (!trendMap.has(date)) {
        trendMap.set(date, { revenue: 0, orders: 0, sessions: 0 })
      }

      const dayData = trendMap.get(date)!
      const value = Number(point.value)

      switch (point.metricType) {
        case 'revenue':
          dayData.revenue += value
          break
        case 'orders':
          dayData.orders += value
          break
        case 'sessions':
          dayData.sessions += value
          break
      }
    })

    return Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      ...data
    }))
  }

  /**
   * Analyze trends and generate insights
   */
  private async analyzeTrends(snapshot: AnalyticsSnapshot): Promise<InsightData[]> {
    const insights: InsightData[] = []

    // Revenue trend analysis
    if (Math.abs(snapshot.metrics.revenue.change) > 10) {
      const trend = snapshot.metrics.revenue.change > 0 ? 'up' : 'down'
      const isPositive = trend === 'up'

      insights.push({
        type: 'trend',
        title: `Revenue ${isPositive ? 'Growth' : 'Decline'} Alert`,
        description: `Your revenue has ${isPositive ? 'increased' : 'decreased'} by ${Math.abs(snapshot.metrics.revenue.change).toFixed(1)}% compared to the previous period. ${isPositive ? 'Keep up the great work!' : 'This needs attention.'}`,
        impactScore: Math.min(Math.abs(snapshot.metrics.revenue.change) / 10, 10),
        confidence: 95,
        category: 'Revenue',
        priority: Math.abs(snapshot.metrics.revenue.change) > 25 ? 'high' : 'medium',
        actionable: !isPositive,
        metadata: {
          metricType: 'revenue',
          timeframe: 'period_over_period',
          value: snapshot.metrics.revenue.current,
          previousValue: snapshot.metrics.revenue.previous,
          changePercent: snapshot.metrics.revenue.change,
          trend
        }
      })
    }

    // Order volume trends
    if (Math.abs(snapshot.metrics.orders.change) > 15) {
      const trend = snapshot.metrics.orders.change > 0 ? 'up' : 'down'
      const isPositive = trend === 'up'

      insights.push({
        type: 'trend',
        title: `${isPositive ? 'Surge' : 'Drop'} in Order Volume`,
        description: `Order volume has ${isPositive ? 'increased' : 'decreased'} by ${Math.abs(snapshot.metrics.orders.change).toFixed(1)}%. ${isPositive ? 'Your marketing efforts are paying off!' : 'Consider reviewing your sales funnel.'}`,
        impactScore: Math.min(Math.abs(snapshot.metrics.orders.change) / 15, 10),
        confidence: 90,
        category: 'Sales',
        priority: Math.abs(snapshot.metrics.orders.change) > 30 ? 'high' : 'medium',
        actionable: !isPositive,
        metadata: {
          metricType: 'orders',
          timeframe: 'period_over_period',
          value: snapshot.metrics.orders.current,
          previousValue: snapshot.metrics.orders.previous,
          changePercent: snapshot.metrics.orders.change,
          trend
        }
      })
    }

    // Customer acquisition trends
    if (Math.abs(snapshot.metrics.customers.change) > 20) {
      const trend = snapshot.metrics.customers.change > 0 ? 'up' : 'down'
      const isPositive = trend === 'up'

      insights.push({
        type: 'trend',
        title: `Customer Acquisition ${isPositive ? 'Boost' : 'Slowdown'}`,
        description: `New customer acquisition has ${isPositive ? 'increased' : 'decreased'} by ${Math.abs(snapshot.metrics.customers.change).toFixed(1)}%. ${isPositive ? 'Great job on customer acquisition!' : 'Focus on improving your acquisition channels.'}`,
        impactScore: Math.min(Math.abs(snapshot.metrics.customers.change) / 20, 10),
        confidence: 85,
        category: 'Customers',
        priority: isPositive ? 'low' : 'high',
        actionable: !isPositive,
        metadata: {
          metricType: 'customers',
          timeframe: 'period_over_period',
          value: snapshot.metrics.customers.current,
          previousValue: snapshot.metrics.customers.previous,
          changePercent: snapshot.metrics.customers.change,
          trend
        }
      })
    }

    return insights
  }

  /**
   * Detect anomalies in data
   */
  private async detectAnomalies(snapshot: AnalyticsSnapshot): Promise<InsightData[]> {
    const insights: InsightData[] = []

    // Check for unusual spikes or drops in daily data
    if (snapshot.trends.length >= 7) {
      const avgRevenue = snapshot.trends.reduce((sum, day) => sum + day.revenue, 0) / snapshot.trends.length
      const revenueStdDev = Math.sqrt(
        snapshot.trends.reduce((sum, day) => sum + Math.pow(day.revenue - avgRevenue, 2), 0) / snapshot.trends.length
      )

      // Find days with revenue more than 2 standard deviations from mean
      const anomalousDays = snapshot.trends.filter(day => 
        Math.abs(day.revenue - avgRevenue) > 2 * revenueStdDev
      )

      if (anomalousDays.length > 0) {
        const maxAnomaly = anomalousDays.reduce((max, day) => 
          Math.abs(day.revenue - avgRevenue) > Math.abs(max.revenue - avgRevenue) ? day : max
        )

        const isSpike = maxAnomaly.revenue > avgRevenue
        
        insights.push({
          type: 'anomaly',
          title: `Unusual Revenue ${isSpike ? 'Spike' : 'Drop'} Detected`,
          description: `On ${maxAnomaly.date}, revenue was ${Math.abs(((maxAnomaly.revenue - avgRevenue) / avgRevenue) * 100).toFixed(1)}% ${isSpike ? 'above' : 'below'} the typical daily average. ${isSpike ? 'Investigate what drove this success!' : 'Check for any issues that day.'}`,
          impactScore: Math.min(Math.abs((maxAnomaly.revenue - avgRevenue) / avgRevenue) * 10, 10),
          confidence: 80,
          category: 'Revenue',
          priority: isSpike ? 'low' : 'high',
          actionable: true,
          metadata: {
            metricType: 'revenue',
            timeframe: 'daily',
            value: maxAnomaly.revenue,
            previousValue: avgRevenue,
            changePercent: ((maxAnomaly.revenue - avgRevenue) / avgRevenue) * 100,
            trend: isSpike ? 'up' : 'down',
            data: { date: maxAnomaly.date, anomalousDays: anomalousDays.length }
          }
        })
      }
    }

    return insights
  }

  /**
   * Generate actionable recommendations
   */
  private async generateRecommendations(snapshot: AnalyticsSnapshot): Promise<InsightData[]> {
    const insights: InsightData[] = []

    // Low conversion rate recommendation
    if (snapshot.metrics.conversion.current < 2.0 && snapshot.metrics.sessions.current > 100) {
      insights.push({
        type: 'recommendation',
        title: 'Optimize Your Conversion Rate',
        description: `Your conversion rate is ${snapshot.metrics.conversion.current.toFixed(2)}%, which is below the typical 2-3% benchmark. Consider A/B testing your checkout process, improving product descriptions, or adding customer reviews.`,
        impactScore: 8,
        confidence: 85,
        category: 'Conversion',
        priority: 'high',
        actionable: true,
        metadata: {
          metricType: 'conversion',
          timeframe: 'current_period',
          value: snapshot.metrics.conversion.current,
          data: {
            recommendations: [
              'A/B test checkout process',
              'Add customer reviews',
              'Improve product descriptions',
              'Reduce checkout steps',
              'Add trust badges'
            ]
          }
        }
      })
    }

    // High traffic, low revenue recommendation
    if (snapshot.metrics.sessions.current > 1000 && snapshot.metrics.revenue.current < 500) {
      insights.push({
        type: 'recommendation',
        title: 'Monetize Your High Traffic',
        description: `You have ${snapshot.metrics.sessions.current} sessions but only $${snapshot.metrics.revenue.current.toFixed(2)} in revenue. Consider improving your pricing strategy, upselling, or targeting higher-value customers.`,
        impactScore: 9,
        confidence: 90,
        category: 'Revenue',
        priority: 'high',
        actionable: true,
        metadata: {
          metricType: 'revenue_per_session',
          timeframe: 'current_period',
          value: snapshot.metrics.revenue.current / snapshot.metrics.sessions.current,
          data: {
            sessions: snapshot.metrics.sessions.current,
            revenue: snapshot.metrics.revenue.current,
            recommendations: [
              'Review pricing strategy',
              'Implement upselling',
              'Target higher-value segments',
              'Add premium products',
              'Improve average order value'
            ]
          }
        }
      })
    }

    // Seasonal optimization
    const currentMonth = new Date().getMonth()
    if ([10, 11, 0].includes(currentMonth)) { // Holiday season
      insights.push({
        type: 'recommendation',
        title: 'Holiday Season Optimization',
        description: 'The holiday season is here! Consider creating gift guides, offering holiday promotions, and ensuring your inventory can handle increased demand.',
        impactScore: 7,
        confidence: 75,
        category: 'Seasonal',
        priority: 'medium',
        actionable: true,
        metadata: {
          metricType: 'seasonal',
          timeframe: 'holiday_season',
          data: {
            season: 'holiday',
            recommendations: [
              'Create gift guides',
              'Launch holiday promotions',
              'Increase inventory',
              'Optimize for mobile shopping',
              'Prepare customer service for volume'
            ]
          }
        }
      })
    }

    return insights
  }

  /**
   * Identify growth opportunities
   */
  private async identifyOpportunities(snapshot: AnalyticsSnapshot): Promise<InsightData[]> {
    const insights: InsightData[] = []

    // Customer lifetime value opportunity
    if (snapshot.metrics.customers.current > 0 && snapshot.metrics.aov.current > 0) {
      const customerValue = snapshot.metrics.revenue.current / snapshot.metrics.customers.current
      
      if (customerValue < snapshot.metrics.aov.current * 2) {
        insights.push({
          type: 'opportunity',
          title: 'Increase Customer Lifetime Value',
          description: `Your customers spend an average of $${customerValue.toFixed(2)}. With an AOV of $${snapshot.metrics.aov.current.toFixed(2)}, there's opportunity to increase repeat purchases through email marketing, loyalty programs, or subscription models.`,
          impactScore: 8,
          confidence: 80,
          category: 'Customer Value',
          priority: 'medium',
          actionable: true,
          metadata: {
            metricType: 'customer_lifetime_value',
            timeframe: 'current_period',
            value: customerValue,
            data: {
              currentCLV: customerValue,
              aov: snapshot.metrics.aov.current,
              potentialCLV: snapshot.metrics.aov.current * 2.5,
              strategies: [
                'Email marketing campaigns',
                'Loyalty program',
                'Subscription model',
                'Cross-selling',
                'Retargeting campaigns'
              ]
            }
          }
        })
      }
    }

    // Market expansion opportunity
    if (snapshot.metrics.revenue.change > 20 && snapshot.metrics.customers.change > 15) {
      insights.push({
        type: 'opportunity',
        title: 'Scale Your Success',
        description: `With ${snapshot.metrics.revenue.change.toFixed(1)}% revenue growth and ${snapshot.metrics.customers.change.toFixed(1)}% customer growth, you're ready to scale. Consider expanding to new markets, launching new products, or increasing your marketing budget.`,
        impactScore: 9,
        confidence: 85,
        category: 'Growth',
        priority: 'high',
        actionable: true,
        metadata: {
          metricType: 'growth_opportunity',
          timeframe: 'period_over_period',
          value: snapshot.metrics.revenue.change,
          data: {
            revenueGrowth: snapshot.metrics.revenue.change,
            customerGrowth: snapshot.metrics.customers.change,
            scalingStrategies: [
              'Expand to new markets',
              'Launch new products',
              'Increase marketing spend',
              'Hire more sales staff',
              'Improve infrastructure'
            ]
          }
        }
      })
    }

    return insights
  }

  /**
   * Analyze revenue patterns
   */
  private async analyzeRevenue(snapshot: AnalyticsSnapshot): Promise<InsightData[]> {
    const insights: InsightData[] = []

    // Revenue per session analysis
    const revenuePerSession = snapshot.metrics.sessions.current > 0 
      ? snapshot.metrics.revenue.current / snapshot.metrics.sessions.current 
      : 0

    if (revenuePerSession > 0) {
      let performanceLevel = 'average'
      let recommendation = ''

      if (revenuePerSession < 0.5) {
        performanceLevel = 'below average'
        recommendation = 'Focus on improving conversion rates and average order value.'
      } else if (revenuePerSession > 2.0) {
        performanceLevel = 'excellent'
        recommendation = 'Maintain your high performance and consider scaling your traffic.'
      }

      if (performanceLevel !== 'average') {
        insights.push({
          type: 'trend',
          title: `Revenue Per Session is ${performanceLevel}`,
          description: `You're generating $${revenuePerSession.toFixed(2)} per session, which is ${performanceLevel}. ${recommendation}`,
          impactScore: performanceLevel === 'below average' ? 7 : 6,
          confidence: 90,
          category: 'Revenue',
          priority: performanceLevel === 'below average' ? 'high' : 'low',
          actionable: performanceLevel === 'below average',
          metadata: {
            metricType: 'revenue_per_session',
            timeframe: 'current_period',
            value: revenuePerSession,
            data: { performanceLevel, recommendation }
          }
        })
      }
    }

    return insights
  }

  /**
   * Analyze customer behavior patterns
   */
  private async analyzeCustomerBehavior(snapshot: AnalyticsSnapshot): Promise<InsightData[]> {
    const insights: InsightData[] = []

    // Customer acquisition cost effectiveness
    if (snapshot.metrics.customers.current > 0 && snapshot.metrics.revenue.current > 0) {
      const revenuePerCustomer = snapshot.metrics.revenue.current / snapshot.metrics.customers.current
      
      if (revenuePerCustomer > 100) {
        insights.push({
          type: 'opportunity',
          title: 'High-Value Customer Acquisition',
          description: `Your customers are worth an average of $${revenuePerCustomer.toFixed(2)}. This indicates healthy unit economics - consider increasing your customer acquisition spend to capture more high-value customers.`,
          impactScore: 7,
          confidence: 85,
          category: 'Customer Acquisition',
          priority: 'medium',
          actionable: true,
          metadata: {
            metricType: 'revenue_per_customer',
            timeframe: 'current_period',
            value: revenuePerCustomer,
            data: {
              strategy: 'Increase acquisition spend',
              justification: 'High customer value supports increased CAC'
            }
          }
        })
      }
    }

    return insights
  }

  /**
   * Save insights to database
   */
  private async saveInsights(insights: InsightData[]): Promise<void> {
    // Delete old insights for this organization (keep only recent ones)
    await prisma.insight.deleteMany({
      where: {
        organizationId: this.organizationId,
        createdAt: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Older than 7 days
        }
      }
    })

    // Save new insights
    await prisma.insight.createMany({
      data: insights.map(insight => ({
        organizationId: this.organizationId,
        type: insight.type,
        title: insight.title,
        description: insight.description,
        impactScore: insight.impactScore,
        isRead: false,
        metadata: insight.metadata
      }))
    })
  }

  /**
   * Calculate percentage change
   */
  private calculatePercentChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  /**
   * Get recent insights for an organization
   */
  async getRecentInsights(limit: number = 10): Promise<any[]> {
    return prisma.insight.findMany({
      where: { organizationId: this.organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }

  /**
   * Mark insights as read
   */
  async markInsightsAsRead(insightIds: string[]): Promise<void> {
    await prisma.insight.updateMany({
      where: {
        id: { in: insightIds },
        organizationId: this.organizationId
      },
      data: { isRead: true }
    })
  }
}

/**
 * Generate insights for all active organizations
 */
export async function generateInsightsForAllOrganizations(): Promise<void> {
  const organizations = await prisma.organization.findMany({
    where: {
      integrations: {
        some: { status: 'active' }
      }
    }
  })

  const timeframe = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    end: new Date()
  }

  for (const org of organizations) {
    try {
      const engine = new AIInsightsEngine(org.id)
      await engine.generateInsights(timeframe)
      console.log(`Generated insights for organization: ${org.name}`)
    } catch (error) {
      console.error(`Failed to generate insights for ${org.name}:`, error)
    }
  }
}

/**
 * Schedule insight generation (to be called by cron job)
 */
export async function scheduleInsightGeneration(): Promise<void> {
  console.log('Starting scheduled insight generation...')
  await generateInsightsForAllOrganizations()
  console.log('Scheduled insight generation completed')
}