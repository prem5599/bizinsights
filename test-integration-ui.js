// Test script to verify integration UI works
// This tests the frontend integration flow without needing real Shopify credentials

async function testIntegrationUI() {
  console.log('🌐 Testing Integration UI...\n');
  
  try {
    // Check if dev server is running
    const response = await fetch('http://localhost:3001/');
    if (!response.ok) {
      console.log('❌ Dev server not running. Please run: npm run dev');
      return;
    }
    console.log('✅ Dev server is running');
    
    // Test API endpoints
    console.log('\n🔍 Testing API endpoints...');
    
    // Test health endpoint
    try {
      const healthResponse = await fetch('http://localhost:3001/api/health');
      console.log(`✅ Health API: ${healthResponse.status}`);
    } catch (error) {
      console.log(`❌ Health API: ${error.message}`);
    }
    
    // Test integrations endpoint (should require auth)
    try {
      const integrationsResponse = await fetch('http://localhost:3001/api/integrations');
      console.log(`📋 Integrations API: ${integrationsResponse.status} (${integrationsResponse.status === 401 ? 'Auth required - Expected' : 'Response received'})`);
    } catch (error) {
      console.log(`❌ Integrations API: ${error.message}`);
    }
    
    // Test Shopify test endpoint (should require auth)
    try {
      const shopifyTestResponse = await fetch('http://localhost:3001/api/integrations/shopify/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          domain: 'test-store',
          method: 'private_app',
          accessToken: 'shpat_test'
        })
      });
      console.log(`🛍️ Shopify Test API: ${shopifyTestResponse.status} (${shopifyTestResponse.status === 401 ? 'Auth required - Expected' : 'Response received'})`);
    } catch (error) {
      console.log(`❌ Shopify Test API: ${error.message}`);
    }
    
    console.log('\n🎯 UI Test Instructions:');
    console.log('1. Open http://localhost:3001 in your browser');
    console.log('2. Sign in with Google');
    console.log('3. Go to Dashboard → Integrations');
    console.log('4. Try adding a Shopify integration');
    console.log('5. Use the Private App method for testing');
    
    console.log('\n📝 To get real Shopify credentials:');
    console.log('1. Go to your Shopify admin');
    console.log('2. Settings → Apps and sales channels');
    console.log('3. Click "Develop apps"');
    console.log('4. Create a new app');
    console.log('5. Configure Admin API scopes (read_orders, read_customers, read_products)');
    console.log('6. Install the app and copy the access token');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testIntegrationUI();