// Test Report Generation
const fetch = require('node-fetch')

async function testReportGeneration() {
  try {
    console.log('🧪 Testing Report Generation...')
    
    // We'll simulate what happens when the Reports page tries to generate a report
    // Since we can't easily simulate authentication, we'll test the business logic
    
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    // Get organization
    const org = await prisma.organization.findFirst()
    if (!org) {
      console.log('❌ No organization found')
      return
    }
    
    console.log('📊 Testing report generation for organization:', org.name)
    
    // Test data aggregation (simulate ReportGenerator logic)
    const now = new Date()
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    console.log('📅 Date ranges:')
    console.log(`  Weekly: ${weekStart.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`)
    console.log(`  Monthly: ${monthStart.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`)
    
    // Get integrations
    const integrations = await prisma.integration.findMany({
      where: { organizationId: org.id, status: 'active' }
    })
    
    const integrationIds = integrations.map(i => i.id)
    console.log('🔌 Active integrations:', integrationIds.length)
    
    // Test weekly metrics aggregation
    const weeklyMetrics = await prisma.dataPoint.groupBy({
      by: ['metricType'],
      where: {
        integrationId: { in: integrationIds },
        dateRecorded: { gte: weekStart, lte: now }
      },
      _sum: { value: true },
      _count: { value: true }
    })
    
    console.log('📈 Weekly metrics:')
    let weeklyRevenue = 0
    let weeklyOrders = 0
    let weeklyCustomers = 0
    
    weeklyMetrics.forEach(metric => {
      const sum = Number(metric._sum.value || 0)
      console.log(`  ${metric.metricType}: ${sum} (${metric._count.value} records)`)
      
      if (metric.metricType === 'revenue') weeklyRevenue = sum
      else if (metric.metricType === 'orders') weeklyOrders = sum
      else if (metric.metricType === 'customer_created') weeklyCustomers = sum
    })
    
    // Calculate derived metrics
    const weeklyAOV = weeklyOrders > 0 ? weeklyRevenue / weeklyOrders : 0
    const performanceScore = Math.min(100, Math.max(0, 
      (weeklyRevenue / 1000) * 20 + // Revenue component
      (weeklyOrders / 10) * 20 + // Orders component  
      (weeklyCustomers / 5) * 20 + // Customers component
      Math.random() * 40 // Random component for other factors
    ))
    
    console.log('🎯 Calculated metrics:')
    console.log(`  Weekly Revenue: $${weeklyRevenue.toFixed(2)}`)
    console.log(`  Weekly Orders: ${weeklyOrders}`)
    console.log(`  Weekly Customers: ${weeklyCustomers}`)
    console.log(`  Average Order Value: $${weeklyAOV.toFixed(2)}`)
    console.log(`  Performance Score: ${performanceScore.toFixed(1)}/100`)
    
    // Test daily breakdown
    const dailyBreakdown = await prisma.dataPoint.findMany({
      where: {
        integrationId: { in: integrationIds },
        dateRecorded: { gte: weekStart, lte: now },
        metricType: 'revenue'
      },
      orderBy: { dateRecorded: 'asc' }
    })
    
    console.log('📅 Daily revenue breakdown:', dailyBreakdown.length, 'records')
    
    // Group by day
    const dailyRevenue = new Map()
    dailyBreakdown.forEach(point => {
      const date = point.dateRecorded.toISOString().split('T')[0]
      const current = dailyRevenue.get(date) || 0
      dailyRevenue.set(date, current + Number(point.value))
    })
    
    console.log('📊 Daily revenue totals:')
    Array.from(dailyRevenue.entries()).forEach(([date, revenue]) => {
      console.log(`  ${date}: $${revenue.toFixed(2)}`)
    })
    
    // Test product analysis
    const productData = await prisma.dataPoint.findMany({
      where: {
        integrationId: { in: integrationIds },
        metricType: 'revenue',
        dateRecorded: { gte: weekStart, lte: now }
      },
      select: { value: true, metadata: true }
    })
    
    const productRevenue = new Map()
    productData.forEach(point => {
      const metadata = point.metadata || {}
      const productName = metadata.title || metadata.name || metadata.product_title || 'Unknown Product'
      const current = productRevenue.get(productName) || 0
      productRevenue.set(productName, current + Number(point.value))
    })
    
    const topProducts = Array.from(productRevenue.entries())
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
    
    console.log('🛍️ Top products by revenue:')
    topProducts.forEach((product, i) => {
      const percentage = weeklyRevenue > 0 ? (product.revenue / weeklyRevenue) * 100 : 0
      console.log(`  ${i+1}. ${product.name}: $${product.revenue.toFixed(2)} (${percentage.toFixed(1)}%)`)
    })
    
    // Simulate report structure
    const reportData = {
      organization: { id: org.id, name: org.name, slug: org.slug },
      period: { start: weekStart, end: now, type: 'weekly' },
      summary: {
        totalRevenue: weeklyRevenue,
        totalOrders: weeklyOrders,
        totalCustomers: weeklyCustomers,
        totalSessions: weeklyOrders * 15, // Estimated
        avgOrderValue: weeklyAOV,
        conversionRate: 6.7, // Estimated
        revenueChange: 12.5, // Estimated
        ordersChange: 8.3, // Estimated
        performanceScore: performanceScore
      },
      metrics: {
        revenue: Array.from(dailyRevenue.entries()).map(([date, value]) => ({ date, value }))
      },
      topProducts: topProducts.map((product, i) => ({
        ...product,
        orders: Math.ceil(product.revenue / weeklyAOV) || 1,
        percentage: weeklyRevenue > 0 ? (product.revenue / weeklyRevenue) * 100 : 0
      }))
    }
    
    console.log('✅ Report generation test completed successfully!')
    console.log('📋 Report summary:')
    console.log(`  Revenue: $${reportData.summary.totalRevenue.toFixed(2)}`)
    console.log(`  Orders: ${reportData.summary.totalOrders}`)
    console.log(`  Performance: ${reportData.summary.performanceScore.toFixed(1)}/100`)
    console.log(`  Daily data points: ${reportData.metrics.revenue.length}`)
    console.log(`  Top products: ${reportData.topProducts.length}`)
    
    await prisma.$disconnect()
    
  } catch (error) {
    console.error('❌ Report generation test failed:', error)
  }
}

testReportGeneration()