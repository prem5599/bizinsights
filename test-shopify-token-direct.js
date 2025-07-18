// Direct Shopify token test - bypasses local API authentication
// Run with: node test-shopify-token-direct.js

const shopDomain = 'bizinsights-test-store'; // Replace with your store name
const accessToken = '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'; // Replace with your token

async function testShopifyTokenDirect() {
  console.log('🔑 Testing Shopify Access Token Directly...\n');
  
  // Clean domain
  let cleanDomain = shopDomain.replace('.myshopify.com', '').replace(/^https?:\/\//, '');
  
  console.log(`🏪 Testing store: ${cleanDomain}.myshopify.com`);
  console.log(`🔐 Using token: ${accessToken.substring(0, 10)}...`);
  
  // Test 1: Basic shop info
  console.log('\n1. Testing shop info...');
  try {
    const response = await fetch(`https://${cleanDomain}.myshopify.com/admin/api/2023-10/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Shop info retrieved successfully!');
      console.log(`   Name: ${data.shop.name}`);
      console.log(`   Domain: ${data.shop.domain}`);
      console.log(`   Currency: ${data.shop.currency}`);
      console.log(`   Country: ${data.shop.country_name || data.shop.country}`);
      console.log(`   Plan: ${data.shop.plan_name || data.shop.plan_display_name}`);
      console.log(`   Email: ${data.shop.email}`);
      console.log('\n📊 Full shop data:');
      console.log(JSON.stringify(data.shop, null, 2));
    } else {
      console.log('❌ Shop info failed:', response.status);
      const errorText = await response.text();
      console.log('   Error:', errorText);
      return; // Stop testing if basic connection fails
    }
  } catch (error) {
    console.log('❌ Shop info error:', error.message);
    return;
  }

  // Test 2: Orders endpoint
  console.log('\n2. Testing orders endpoint...');
  try {
    const response = await fetch(`https://${cleanDomain}.myshopify.com/admin/api/2023-10/orders.json?limit=5`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Orders: ${data.orders.length} orders retrieved`);
      if (data.orders.length > 0) {
        console.log(`   Latest order: ${data.orders[0].name || data.orders[0].order_number}`);
      }
    } else {
      console.log(`❌ Orders: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log('   Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Orders error:', error.message);
  }

  // Test 3: Products endpoint
  console.log('\n3. Testing products endpoint...');
  try {
    const response = await fetch(`https://${cleanDomain}.myshopify.com/admin/api/2023-10/products.json?limit=5`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Products: ${data.products.length} products retrieved`);
      if (data.products.length > 0) {
        console.log(`   Sample product: ${data.products[0].title}`);
      }
    } else {
      console.log(`❌ Products: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log('   Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Products error:', error.message);
  }

  // Test 4: Customers endpoint
  console.log('\n4. Testing customers endpoint...');
  try {
    const response = await fetch(`https://${cleanDomain}.myshopify.com/admin/api/2023-10/customers.json?limit=5`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Customers: ${data.customers.length} customers retrieved`);
      if (data.customers.length > 0) {
        console.log(`   Sample customer: ${data.customers[0].email || data.customers[0].first_name}`);
      }
    } else {
      console.log(`❌ Customers: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log('   Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Customers error:', error.message);
  }

  console.log('\n🎯 Token test complete!');
  console.log('\nIf all tests passed, your Shopify access token is working correctly.');
  console.log('You can now use it in your application through the authenticated endpoints.');
}

// Instructions
console.log('📋 Direct Shopify Token Test:');
console.log('1. Update shopDomain with your store name (without .myshopify.com)');
console.log('2. Update accessToken with your private app token');
console.log('3. Run: node test-shopify-token-direct.js\n');

// Run the test
testShopifyTokenDirect();