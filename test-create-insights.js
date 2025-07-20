// Create sample insights for the Insights page
const { PrismaClient } = require('@prisma/client')

async function createInsights() {
  const prisma = new PrismaClient()
  
  console.log('💡 CREATING SAMPLE INSIGHTS...\n')

  try {
    // Get organization
    const org = await prisma.organization.findFirst()
    if (!org) {
      throw new Error('No organization found')
    }

    console.log('✅ Found organization:', org.name, org.id)

    // Get revenue and order data for insights
    const totalRevenue = await prisma.dataPoint.aggregate({
      where: {
        integration: { organizationId: org.id },
        metricType: 'revenue'
      },
      _sum: { value: true },
      _count: { id: true }
    })

    const totalOrders = await prisma.dataPoint.count({
      where: {
        integration: { organizationId: org.id },
        metricType: 'orders'
      }
    })

    const revenue = Number(totalRevenue._sum.value) || 0
    const orders = totalOrders || 0
    const aov = orders > 0 ? revenue / orders : 0

    // Create insights based on real data
    const insights = [
      {
        organizationId: org.id,
        type: 'trend',
        title: 'Revenue Growth Analysis',
        description: `Your store has generated ₹${revenue.toLocaleString()} in total revenue from ${orders} orders. This represents a strong performance with an average order value of ₹${aov.toFixed(2)}.`,
        impactScore: 85,
        metadata: {
          totalRevenue: revenue,
          totalOrders: orders,
          averageOrderValue: aov,
          currency: 'INR',
          source: 'shopify_analysis'
        }
      },
      {
        organizationId: org.id,
        type: 'recommendation',
        title: 'Optimize Customer Retention',
        description: `With ${orders} orders processed, focus on customer retention strategies. Consider implementing email marketing campaigns and loyalty programs to increase repeat purchases.`,
        impactScore: 75,
        metadata: {
          customerCount: 8,
          averageOrderValue: aov,
          strategy: 'retention',
          source: 'ai_recommendation'
        }
      },
      {
        organizationId: org.id,
        type: 'anomaly',
        title: 'Conversion Rate Opportunity',
        description: 'Your current conversion metrics suggest there\'s room for improvement in the checkout process. Consider A/B testing different payment methods and checkout flows.',
        impactScore: 65,
        metadata: {
          conversionRate: 6.7,
          checkoutOptimization: true,
          source: 'performance_analysis'
        }
      },
      {
        organizationId: org.id,
        type: 'trend',
        title: 'Product Performance Insights',
        description: 'Your best-selling products include snowboards and liquid products. Consider expanding your inventory in these high-performing categories.',
        impactScore: 70,
        metadata: {
          topCategories: ['snowboards', 'liquid'],
          inventoryExpansion: true,
          source: 'product_analysis'
        }
      },
      {
        organizationId: org.id,
        type: 'recommendation',
        title: 'Peak Sales Time Analysis',
        description: 'Your orders show activity during business hours. Consider scheduling marketing campaigns and promotions during your peak engagement times.',
        impactScore: 60,
        metadata: {
          peakHours: ['10-12', '14-16'],
          timingOptimization: true,
          source: 'temporal_analysis'
        }
      }
    ]

    // Delete existing insights to avoid duplicates
    await prisma.insight.deleteMany({
      where: { organizationId: org.id }
    })

    // Create new insights
    let created = 0
    for (const insight of insights) {
      await prisma.insight.create({
        data: insight
      })
      created++
      console.log(`  ✓ Created: ${insight.title}`)
    }

    console.log(`\n✅ Created ${created} insights successfully!`)

    // Verify insights were created
    const insightCount = await prisma.insight.count({
      where: { organizationId: org.id }
    })

    console.log(`📈 Total insights in database: ${insightCount}`)

  } catch (error) {
    console.error('❌ Failed to create insights:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createInsights()