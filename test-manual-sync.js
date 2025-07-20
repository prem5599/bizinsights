// Manual data sync test - bypasses authentication  
const { PrismaClient } = require('@prisma/client')

// Simple direct sync without imports
const shopDomain = 'bizinsights-test-store'
const accessToken = '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'

async function manualSync() {
  const prisma = new PrismaClient()
  
  console.log('🔄 MANUAL SHOPIFY SYNC TEST...\n')

  try {
    // Get the Shopify integration
    const integration = await prisma.integration.findFirst({
      where: { platform: 'shopify' }
    })

    if (!integration) {
      throw new Error('No Shopify integration found')
    }

    console.log('✅ Found integration:', integration.platformAccountId)

    // Create Shopify client
    const shopifyClient = new ShopifyIntegration(
      integration.accessToken,
      integration.platformAccountId
    )

    // Test connection
    console.log('\n🧪 Testing connection...')
    const isConnected = await shopifyClient.testConnection()
    if (!isConnected) {
      throw new Error('Connection test failed')
    }
    console.log('✅ Connection successful')

    // Sync historical data
    console.log('\n📊 Starting data sync...')
    const result = await shopifyClient.syncHistoricalData(integration.id, 365)
    
    console.log('✅ Sync completed:')
    console.log(`   Orders: ${result.orders}`)
    console.log(`   Customers: ${result.customers}`)
    console.log(`   Products: ${result.products}`)

    // Check final data point count
    const dataPointCount = await prisma.dataPoint.count()
    console.log(`\n📈 Total data points in database: ${dataPointCount}`)

    // Show sample data points
    const samplePoints = await prisma.dataPoint.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    })
    
    console.log('\n📋 Sample data points:')
    samplePoints.forEach(dp => {
      console.log(`   ${dp.metricType}: ${dp.value} (${dp.dateRecorded.toISOString().split('T')[0]})`)
    })

  } catch (error) {
    console.error('❌ Manual sync failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

manualSync()