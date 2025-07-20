// Check database for integrations and data points
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkDatabase() {
  console.log('🔍 CHECKING DATABASE STATUS...\n')

  try {
    // Check organizations
    const orgs = await prisma.organization.findMany({
      include: {
        members: true,
        integrations: true
      }
    })
    console.log('📊 Organizations:', orgs.length)
    orgs.forEach(org => {
      console.log(`  - ${org.name} (${org.slug}) - ${org.integrations.length} integrations`)
    })

    // Check integrations  
    const integrations = await prisma.integration.findMany()
    console.log('\n🔗 Integrations:', integrations.length)
    integrations.forEach(int => {
      console.log(`  - ${int.platform}: ${int.platformAccountId} (${int.status})`)
    })

    // Check data points
    const dataPoints = await prisma.dataPoint.count()
    console.log('\n📈 Data Points:', dataPoints)

    if (dataPoints > 0) {
      const samplePoints = await prisma.dataPoint.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { integration: true }
      })
      console.log('\n📋 Sample Data Points:')
      samplePoints.forEach(dp => {
        console.log(`  - ${dp.metricType}: ${dp.value} (${dp.integration?.platform})`)
      })
    }

    // Check users
    const users = await prisma.user.count()
    console.log('\n👥 Users:', users)

  } catch (error) {
    console.error('❌ Database check failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabase()