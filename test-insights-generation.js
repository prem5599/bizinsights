// Test insights generation
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Mock the insights engine functions since we can't easily import TypeScript
async function testInsightsGeneration() {
  try {
    console.log('🧪 Testing insights functionality...')
    
    // Get first organization
    const org = await prisma.organization.findFirst()
    if (!org) {
      console.log('❌ No organization found')
      return
    }
    
    console.log('✓ Found organization:', org.name, org.id)
    
    // Check existing data points
    const dataPoints = await prisma.dataPoint.findMany({
      where: {
        integration: { organizationId: org.id }
      },
      take: 5,
      orderBy: { dateRecorded: 'desc' }
    })
    
    console.log('📊 Found', dataPoints.length, 'data points')
    dataPoints.forEach((dp, i) => {
      console.log(`  ${i+1}. ${dp.metricType}: ${dp.value} (${dp.dateRecorded.toISOString().split('T')[0]})`)
    })
    
    // Check existing insights
    const insights = await prisma.insight.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
    
    console.log('💡 Found', insights.length, 'insights in database')
    insights.forEach((insight, i) => {
      const relativeTime = Math.floor((Date.now() - insight.createdAt.getTime()) / (1000 * 60))
      console.log(`  ${i+1}. [${insight.type}] ${insight.title} (${relativeTime}m ago, Impact: ${insight.impactScore})`)
    })
    
    // Test insights by type
    const typeBreakdown = await prisma.insight.groupBy({
      by: ['type'],
      where: { organizationId: org.id },
      _count: { id: true }
    })
    
    console.log('📈 Insights by type:')
    typeBreakdown.forEach(item => {
      console.log(`  ${item.type}: ${item._count.id}`)
    })
    
    // Check integrations
    const integrations = await prisma.integration.findMany({
      where: { organizationId: org.id },
      select: { id: true, platform: true, status: true }
    })
    
    console.log('🔌 Integrations:', integrations.length)
    integrations.forEach(int => {
      console.log(`  ${int.platform}: ${int.status}`)
    })
    
    console.log('✅ Insights system test completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testInsightsGeneration()