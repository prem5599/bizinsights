// Trigger data sync for Shopify integration
async function triggerSync() {
  console.log('🔄 TRIGGERING SHOPIFY DATA SYNC...\n')

  try {
    // First get organization info
    console.log('1. Getting organization...')
    const orgResponse = await fetch('http://localhost:3001/api/organizations/current', {
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

    // Trigger sync
    console.log('\n2. Triggering data sync...')
    const syncResponse = await fetch('http://localhost:3001/api/integrations/shopify/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        organizationId: organizationId
      })
    })

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text()
      throw new Error(`Sync failed: ${syncResponse.status} - ${errorText}`)
    }

    const syncResult = await syncResponse.json()
    console.log('✅ Sync result:', JSON.stringify(syncResult, null, 2))

    // Wait a bit for sync to complete
    console.log('\n3. Waiting for sync to complete...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Check data points count
    console.log('\n4. Checking database after sync...')
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message)
  }
}

triggerSync()