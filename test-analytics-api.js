// Test Analytics API with real data
async function testAnalyticsAPI() {
  console.log('🧪 TESTING ANALYTICS API...\n')

  try {
    // First get organization
    console.log('1. Getting organization...')
    const orgResponse = await fetch('http://localhost:3000/api/organizations/current', {
      credentials: 'include'
    })
    
    if (!orgResponse.ok) {
      throw new Error(`Failed to get organization: ${orgResponse.status}`)
    }
    
    const orgData = await orgResponse.json()
    console.log('✅ Organization:', orgData.organization?.name, orgData.organization?.id)
    
    const organizationId = orgData.organization?.id
    if (!organizationId) {
      throw new Error('No organization ID found')
    }

    // Test analytics API
    console.log('\n2. Testing analytics API...')
    const analyticsResponse = await fetch(`http://localhost:3000/api/analytics?range=30d&organizationId=${organizationId}`, {
      credentials: 'include'
    })

    if (!analyticsResponse.ok) {
      const errorText = await analyticsResponse.text()
      throw new Error(`Analytics API failed: ${analyticsResponse.status} - ${errorText}`)
    }

    const analyticsData = await analyticsResponse.json()
    console.log('✅ Analytics API response:', JSON.stringify(analyticsData, null, 2))

    // Validate data structure
    if (analyticsData.success) {
      console.log('\n📊 Analytics Summary:')
      console.log(`   Revenue: ₹${analyticsData.metrics.currentPeriod.revenue.toLocaleString()}`)
      console.log(`   Orders: ${analyticsData.metrics.currentPeriod.orders}`)
      console.log(`   Customers: ${analyticsData.metrics.currentPeriod.customers}`)
      console.log(`   AOV: ₹${analyticsData.metrics.currentPeriod.aov.toFixed(2)}`)
      console.log(`   Chart data points: ${analyticsData.charts.revenueOverTime.length}`)
      console.log(`   Has real data: ${analyticsData.hasRealData}`)
    }

  } catch (error) {
    console.error('❌ Analytics API test failed:', error.message)
  }
}

testAnalyticsAPI()