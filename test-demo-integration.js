// Test the demo Shopify integration
// This tests the demo integration without needing real Shopify credentials

async function testDemoIntegration() {
  console.log('🎭 Testing Demo Shopify Integration...\n');
  
  try {
    // Check if dev server is running
    const response = await fetch('http://localhost:3000/');
    if (!response.ok) {
      console.log('❌ Dev server not running. Please run: npm run dev');
      return;
    }
    console.log('✅ Dev server is running');
    
    // Test demo endpoint (should require auth)
    try {
      const demoResponse = await fetch('http://localhost:3000/api/integrations/shopify/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          storeName: 'test-demo-store',
          organizationId: 'test-org-id'
        })
      });
      
      console.log(`🎭 Demo API: ${demoResponse.status} (${demoResponse.status === 401 ? 'Auth required - Expected' : 'Response received'})`);
      
      if (demoResponse.status === 401) {
        console.log('✅ Demo endpoint properly requires authentication');
      }
    } catch (error) {
      console.log(`❌ Demo API error: ${error.message}`);
    }
    
    console.log('\n🎯 Demo Integration Test Instructions:');
    console.log('1. Open http://localhost:3000 in your browser');
    console.log('2. Sign in with Google OAuth');
    console.log('3. Go to Dashboard → Integrations');
    console.log('4. Click "Add Integration" → "Shopify"');
    console.log('5. Select "Demo Store" option');
    console.log('6. Enter any store name (e.g., "my-test-store")');
    console.log('7. Click "Continue" to create demo integration');
    console.log('8. Check dashboard for demo data');
    
    console.log('\n📊 What the Demo Creates:');
    console.log('• 30 days of sample revenue data ($100-$2000/day)');
    console.log('• Daily order counts (1-15 orders/day)');
    console.log('• Customer creation data (1-10 customers/day)');
    console.log('• 10 sample products');
    console.log('• Integration status showing as "active"');
    
    console.log('\n🔧 Demo Features:');
    console.log('• No real Shopify store needed');
    console.log('• Instant setup with sample data');
    console.log('• Perfect for testing the UI');
    console.log('• Shows how real integrations would work');
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Test the demo integration first');
    console.log('2. Once satisfied, get real Shopify credentials');
    console.log('3. Use Private App method for real store connection');
    console.log('4. Follow the SHOPIFY_SETUP.md guide for production setup');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDemoIntegration();