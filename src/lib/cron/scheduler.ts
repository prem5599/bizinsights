// src/lib/cron/scheduler.ts
import { prisma } from '@/lib/prisma'
import { generateInsightsForAllOrganizations } from '@/lib/insights/engine'
import { emailService } from '@/lib/email/service'
import { captureError } from '@/lib/monitoring/sentry'

/**
 * Scheduled job to generate insights for all organizations
 */
export async function generateInsightsJob(): Promise<void> {
  console.log('🔄 Starting scheduled insight generation...')
  
  try {
    await generateInsightsForAllOrganizations()
    console.log('✅ Scheduled insight generation completed')
  } catch (error) {
    console.error('❌ Scheduled insight generation failed:', error)
    captureError(error as Error, { job: 'generateInsights' })
    throw error
  }
}

/**
 * Send weekly insight digest emails
 */
export async function sendWeeklyDigestJob(): Promise<void> {
  console.log('📧 Starting weekly digest email job...')
  
  try {
    // Get all organizations with active members
    const organizations = await prisma.organization.findMany({
      include: {
        members: {
          include: { user: true },
          where: { role: { in: ['owner', 'admin'] } }
        },
        insights: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          },
          orderBy: { impactScore: 'desc' },
          take: 10
        }
      }
    })

    for (const org of organizations) {
      if (org.insights.length === 0) continue
      
      // Send digest to admins
      for (const member of org.members) {
        if (member.user.email) {
          try {
            await emailService.sendInsightDigest(
              member.user.email,
              org.name,
              org.insights
            )
            console.log(`📧 Sent digest to ${member.user.email} for ${org.name}`)
          } catch (error) {
            console.error(`Failed to send digest to ${member.user.email}:`, error)
          }
        }
      }
    }
    
    console.log('✅ Weekly digest emails completed')
  } catch (error) {
    console.error('❌ Weekly digest job failed:', error)
    captureError(error as Error, { job: 'weeklyDigest' })
    throw error
  }
}

/**
 * Check integration health and send alerts
 */
export async function checkIntegrationHealthJob(): Promise<void> {
  console.log('🔍 Starting integration health check...')
  
  try {
    const organizations = await prisma.organization.findMany({
      include: {
        integrations: {
          where: { status: 'active' }
        },
        members: {
          include: { user: true },
          where: { role: { in: ['owner', 'admin'] } }
        }
      }
    })

    for (const org of organizations) {
      for (const integration of org.integrations) {
        // Check if integration has synced recently (last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        
        if (!integration.lastSyncAt || integration.lastSyncAt < oneDayAgo) {
          // Send alert to organization admins
          const issue = `${integration.platform} integration hasn't synced in over 24 hours`
          
          for (const member of org.members) {
            if (member.user.email) {
              try {
                await emailService.sendIntegrationAlert(
                  member.user.email,
                  org.name,
                  integration.platform,
                  issue
                )
                console.log(`🚨 Sent integration alert to ${member.user.email}`)
              } catch (error) {
                console.error(`Failed to send alert to ${member.user.email}:`, error)
              }
            }
          }
          
          // Update integration status
          await prisma.integration.update({
            where: { id: integration.id },
            data: {
              status: 'error',
              metadata: {
                ...(integration.metadata as any || {}),
                lastHealthCheck: new Date().toISOString(),
                healthStatus: 'sync_stale'
              }
            }
          })
        }
      }
    }
    
    console.log('✅ Integration health check completed')
  } catch (error) {
    console.error('❌ Integration health check failed:', error)
    captureError(error as Error, { job: 'integrationHealth' })
    throw error
  }
}

/**
 * Cleanup old data (data points older than 1 year, insights older than 3 months)
 */
export async function cleanupOldDataJob(): Promise<void> {
  console.log('🧹 Starting data cleanup job...')
  
  try {
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    
    // Delete old data points
    const deletedDataPoints = await prisma.dataPoint.deleteMany({
      where: {
        dateRecorded: { lt: oneYearAgo }
      }
    })
    
    // Delete old insights
    const deletedInsights = await prisma.insight.deleteMany({
      where: {
        createdAt: { lt: threeMonthsAgo }
      }
    })
    
    // Delete old webhook events
    const deletedWebhooks = await prisma.webhookEvent.deleteMany({
      where: {
        receivedAt: { lt: threeMonthsAgo }
      }
    })
    
    console.log(`🧹 Cleanup completed:`)
    console.log(`  - Deleted ${deletedDataPoints.count} old data points`)
    console.log(`  - Deleted ${deletedInsights.count} old insights`)
    console.log(`  - Deleted ${deletedWebhooks.count} old webhook events`)
    
  } catch (error) {
    console.error('❌ Data cleanup job failed:', error)
    captureError(error as Error, { job: 'dataCleanup' })
    throw error
  }
}
