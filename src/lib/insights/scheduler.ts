// lib/insights/scheduler.ts
import { prisma } from '@/lib/prisma'
import { InsightsEngine } from './engine'

export class InsightsScheduler {
  /**
   * Generate insights for a specific organization
   */
  static async generateOrganizationInsights(organizationId: string): Promise<void> {
    try {
      console.log(`Generating insights for organization: ${organizationId}`)

      // Get active integrations
      const integrations = await prisma.integration.findMany({
        where: {
          organizationId,
          status: 'active'
        },
        select: { id: true }
      })

      const integrationIds = integrations.map(i => i.id)

      // Initialize insights engine
      const engine = new InsightsEngine(organizationId, integrationIds)
      const insights = await engine.generateInsights()

      // Clear old insights (keep only last 50)
      const existingInsights = await prisma.insight.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        skip: 50
      })

      if (existingInsights.length > 0) {
        await prisma.insight.deleteMany({
          where: {
            id: { in: existingInsights.map(i => i.id) }
          }
        })
      }

      // Store new insights
      for (const insight of insights) {
        await prisma.insight.create({
          data: {
            organizationId,
            type: insight.type,
            title: insight.title,
            description: insight.description,
            impactScore: insight.impactScore,
            metadata: {
              ...insight.metadata,
              category: insight.category,
              actionable: insight.actionable,
              urgency: insight.urgency
            }
          }
        })
      }

      console.log(`Generated ${insights.length} insights for organization: ${organizationId}`)

    } catch (error) {
      console.error(`Failed to generate insights for organization ${organizationId}:`, error)
      throw error
    }
  }

  /**
   * Generate insights for all organizations
   */
  static async generateAllInsights(): Promise<void> {
    try {
      const organizations = await prisma.organization.findMany({
        include: {
          integrations: {
            where: { status: 'active' }
          }
        }
      })

      const results = []

      for (const org of organizations) {
        try {
          await this.generateOrganizationInsights(org.id)
          results.push({
            organizationId: org.id,
            organizationName: org.name,
            status: 'success'
          })
        } catch (error) {
          console.error(`Failed to generate insights for ${org.name}:`, error)
          results.push({
            organizationId: org.id,
            organizationName: org.name,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      console.log('Insights generation summary:', results)
      return results

    } catch (error) {
      console.error('Failed to generate insights for all organizations:', error)
      throw error
    }
  }

  /**
   * Schedule insights generation (for background jobs)
   */
  static async scheduleInsightGeneration(): Promise<void> {
    // In a production app, this would integrate with a job queue system like Bull Queue
    // For now, we'll just run it immediately
    console.log('Starting scheduled insight generation...')
    await this.generateAllInsights()
    console.log('Scheduled insight generation completed')
  }

  /**
   * Get insights summary for an organization
   */
  static async getInsightsSummary(organizationId: string) {
    const insights = await prisma.insight.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    const summary = {
      total: insights.length,
      unread: insights.filter(i => !i.isRead).length,
      byType: {
        trend: insights.filter(i => i.type === 'trend').length,
        anomaly: insights.filter(i => i.type === 'anomaly').length,
        recommendation: insights.filter(i => i.type === 'recommendation').length,
        opportunity: insights.filter(i => i.type === 'opportunity').length
      },
      byUrgency: {
        high: insights.filter(i => i.metadata?.urgency === 'high').length,
        medium: insights.filter(i => i.metadata?.urgency === 'medium').length,
        low: insights.filter(i => i.metadata?.urgency === 'low').length
      },
      avgImpactScore: insights.length > 0 
        ? insights.reduce((sum, i) => sum + i.impactScore, 0) / insights.length 
        : 0,
      lastGenerated: insights[0]?.createdAt || null
    }

    return summary
  }

  /**
   * Mark insights as read
   */
  static async markInsightsAsRead(organizationId: string, insightIds?: string[]): Promise<void> {
    const whereCondition = insightIds 
      ? { id: { in: insightIds }, organizationId }
      : { organizationId, isRead: false }

    await prisma.insight.updateMany({
      where: whereCondition,
      data: { isRead: true }
    })
  }

  /**
   * Get actionable insights for an organization
   */
  static async getActionableInsights(organizationId: string, limit: number = 5) {
    return prisma.insight.findMany({
      where: {
        organizationId,
        metadata: {
          path: ['actionable'],
          equals: true
        }
      },
      orderBy: [
        { impactScore: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit
    })
  }

  /**
   * Get high priority insights
   */
  static async getHighPriorityInsights(organizationId: string) {
    return prisma.insight.findMany({
      where: {
        organizationId,
        metadata: {
          path: ['urgency'],
          equals: 'high'
        }
      },
      orderBy: [
        { impactScore: 'desc' },
        { createdAt: 'desc' }
      ]
    })
  }
}