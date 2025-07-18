// Test script for Shopify integration
// Run with: node test-shopify-integration.js

// TODO: Update these with your actual Shopify store credentials
const shopDomain = 'bizinsights-test-store'; // Replace with your store name (just the name, not the full URL)
const accessToken = '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'; // Replace with your private app token

// Example:
// const shopDomain = 'my-test-store';
// const accessToken = 'shpat_1234567890abcdef1234567890abcdef';

async function testShopifyIntegration() {
  console.log('🧪 Testing Shopify Integration...\n');

  // Test 1: Basic Connection
  console.log('1. Testing basic connection...');
  try {
    const response = await fetch(`https://${shopDomain}.myshopify.com/admin/api/2023-10/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Connection successful!');
      console.log(`   Shop Name: ${data.shop.name}`);
      console.log(`   Domain: ${data.shop.domain}`);
      console.log(`   Currency: ${data.shop.currency}`);
    } else {
      console.log('❌ Connection failed:', response.status, await response.text());
    }
  } catch (error) {
    console.log('❌ Connection error:', error.message);
  }

  // Test 2: API Endpoints
  console.log('\n2. Testing API endpoints...');
  const endpoints = [
    { name: 'Orders', path: '/admin/api/2023-10/orders.json?limit=5' },
    { name: 'Products', path: '/admin/api/2023-10/products.json?limit=5' },
    { name: 'Customers', path: '/admin/api/2023-10/customers.json?limit=5' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`https://${shopDomain}.myshopify.com${endpoint.path}`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const count = Object.keys(data)[0]; // orders, products, customers
        console.log(`✅ ${endpoint.name}: ${data[count].length} items fetched`);
      } else {
        console.log(`❌ ${endpoint.name}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.message}`);
    }
  }

  // Test 3: Test local API
  console.log('\n3. Testing local API...');
  try {
    console.log('   Note: This test requires your Next.js dev server to be running (npm run dev)');
    const response = await fetch('http://localhost:3000/api/integrations/shopify/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain: shopDomain,
        accessToken: accessToken,
        method: 'private_app'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Local API test successful!');
      console.log(`   Shop: ${data.shopName}`);
    } else {
      const errorText = await response.text();
      console.log('❌ Local API test failed:', response.status);
      console.log('   Response:', errorText);
      if (response.status === 401) {
        console.log('   Note: Authentication required. Make sure to test this from the browser where you\'re logged in.');
      }
    }
  } catch (error) {
    console.log('❌ Local API error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('   Note: Make sure your Next.js dev server is running (npm run dev)');
    }
  }

  console.log('\n🎯 Test complete!');
}

// Instructions
console.log('📋 Shopify Integration Test Instructions:');
console.log('1. Replace shopDomain with your actual store name');
console.log('2. Replace accessToken with your private app token');
console.log('3. Make sure your dev server is running (npm run dev)');
console.log('4. Run: node test-shopify-integration.js\n');

// Only run if we have real credentials
if (shopDomain !== 'your-store-name' && accessToken !== 'shpat_your_access_token_here') {
  testShopifyIntegration();
} else {
  console.log('⚠️  Please update the credentials in this file first!');
  console.log('   Update shopDomain to your actual store name (e.g., "my-test-store")');
  console.log('   Update accessToken to your private app token (e.g., "shpat_1234567890abcdef...")');
}