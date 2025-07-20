// Test Reports functionality
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testReports() {
  try {
    console.log('📊 Testing Reports functionality...')
    
    // Get organization
    const org = await prisma.organization.findFirst()
    if (!org) {
      console.log('❌ No organization found')
      return
    }
    
    console.log('✓ Found organization:', org.name, org.id)
    
    // Check existing reports
    const reports = await prisma.report.findMany({
      where: { organizationId: org.id },
      orderBy: { generatedAt: 'desc' },
      take: 5
    })
    
    console.log('📄 Found', reports.length, 'existing reports')
    reports.forEach((report, i) => {
      const dateRange = `${report.dateRangeStart.toISOString().split('T')[0]} to ${report.dateRangeEnd.toISOString().split('T')[0]}`
      console.log(`  ${i+1}. ${report.title} (${report.reportType}) - ${dateRange}`)
    })
    
    // Check organization members and permissions
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: org.id },
      include: { user: { select: { name: true, email: true } } }
    })
    
    console.log('👥 Organization members:')
    members.forEach((member, i) => {
      console.log(`  ${i+1}. ${member.user.name || member.user.email} (${member.role})`)
    })
    
    // Check data availability for reports
    const dataPoints = await prisma.dataPoint.count({
      where: {
        integration: { organizationId: org.id }
      }
    })
    
    console.log('📊 Data points available:', dataPoints)
    
    // Check integrations
    const integrations = await prisma.integration.findMany({
      where: { organizationId: org.id },
      select: { platform: true, status: true }
    })
    
    console.log('🔌 Integrations:')
    integrations.forEach((integration, i) => {
      console.log(`  ${i+1}. ${integration.platform}: ${integration.status}`)
    })
    
    // Test report generation readiness
    const hasActiveIntegrations = integrations.some(i => i.status === 'active')
    const hasData = dataPoints > 0
    const hasMembers = members.length > 0
    
    console.log('🚀 Report generation readiness:')
    console.log(`  ✓ Has active integrations: ${hasActiveIntegrations}`)
    console.log(`  ✓ Has data: ${hasData}`)
    console.log(`  ✓ Has members: ${hasMembers}`)
    
    if (hasActiveIntegrations && hasData && hasMembers) {
      console.log('✅ Reports system is ready for use!')
    } else {
      console.log('⚠️ Reports system needs setup')
    }
    
    // Test database schema
    try {
      const reportSchema = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'Report'
        ORDER BY ordinal_position
      `
      
      console.log('📋 Report table schema verified with', reportSchema.length, 'columns')
    } catch (error) {
      console.log('⚠️ Could not verify Report table schema')
    }
    
  } catch (error) {
    console.error('❌ Reports test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testReports()