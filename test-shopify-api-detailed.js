// Detailed Shopify API Test - Shows all JSON responses
// Run with: node test-shopify-api-detailed.js

const shopDomain = 'bizinsights-test-store';
const accessToken = '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';

async function makeShopifyRequest(endpoint, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 ${description}`);
  console.log(`📡 Endpoint: ${endpoint}`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    const url = `https://${shopDomain}.myshopify.com/admin/api/2023-10/${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success! JSON Response:`);
      console.log(JSON.stringify(data, null, 2));
      return data;
    } else {
      const errorText = await response.text();
      console.log(`❌ Error Response:`, errorText);
      return null;
    }
  } catch (error) {
    console.log(`❌ Request failed:`, error.message);
    return null;
  }
}

async function testAllShopifyAPIs() {
  console.log('🚀 COMPREHENSIVE SHOPIFY API TEST');
  console.log(`🏪 Store: ${shopDomain}.myshopify.com`);
  console.log(`🔑 Token: ${accessToken.substring(0, 10)}...`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);

  // 1. Shop Information
  await makeShopifyRequest('shop.json', 'SHOP INFORMATION');

  // 2. Orders (all statuses)
  await makeShopifyRequest('orders.json?status=any&limit=10', 'ALL ORDERS (ANY STATUS)');
  
  // 3. Orders (specific statuses)
  await makeShopifyRequest('orders.json?status=open&limit=5', 'OPEN ORDERS');
  await makeShopifyRequest('orders.json?status=closed&limit=5', 'CLOSED ORDERS');
  await makeShopifyRequest('orders.json?financial_status=paid&limit=5', 'PAID ORDERS');
  await makeShopifyRequest('orders.json?financial_status=pending&limit=5', 'PENDING PAYMENT ORDERS');

  // 4. Products
  await makeShopifyRequest('products.json?limit=10', 'ALL PRODUCTS');
  await makeShopifyRequest('products.json?status=active&limit=5', 'ACTIVE PRODUCTS');
  await makeShopifyRequest('products.json?status=draft&limit=5', 'DRAFT PRODUCTS');

  // 5. Customers
  await makeShopifyRequest('customers.json?limit=10', 'ALL CUSTOMERS');

  // 6. Product variants (for first product if exists)
  const products = await makeShopifyRequest('products.json?limit=1', 'FIRST PRODUCT FOR VARIANTS TEST');
  if (products?.products?.length > 0) {
    const productId = products.products[0].id;
    await makeShopifyRequest(`products/${productId}/variants.json`, `VARIANTS FOR PRODUCT ${productId}`);
  }

  // 7. Order transactions (for first order if exists)
  const orders = await makeShopifyRequest('orders.json?limit=1&status=any', 'FIRST ORDER FOR TRANSACTIONS TEST');
  if (orders?.orders?.length > 0) {
    const orderId = orders.orders[0].id;
    await makeShopifyRequest(`orders/${orderId}/transactions.json`, `TRANSACTIONS FOR ORDER ${orderId}`);
  }

  // 8. Inventory levels
  await makeShopifyRequest('locations.json', 'INVENTORY LOCATIONS');
  
  // 9. Webhooks
  await makeShopifyRequest('webhooks.json', 'EXISTING WEBHOOKS');

  // 10. Shop policies
  await makeShopifyRequest('policies.json', 'SHOP POLICIES');

  // 11. Product collections
  await makeShopifyRequest('collections.json?limit=5', 'PRODUCT COLLECTIONS');
  await makeShopifyRequest('custom_collections.json?limit=5', 'CUSTOM COLLECTIONS');
  await makeShopifyRequest('smart_collections.json?limit=5', 'SMART COLLECTIONS');

  // 12. Discounts
  await makeShopifyRequest('price_rules.json?limit=5', 'PRICE RULES (DISCOUNTS)');

  // 13. Gift cards
  await makeShopifyRequest('gift_cards.json?limit=5', 'GIFT CARDS');

  // 14. Shipping
  await makeShopifyRequest('shipping_zones.json', 'SHIPPING ZONES');

  // 15. Tax settings
  await makeShopifyRequest('countries.json', 'TAX COUNTRIES');

  // 16. Analytics data (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateParam = thirtyDaysAgo.toISOString();
  await makeShopifyRequest(`orders.json?created_at_min=${dateParam}&status=any&limit=50`, 'RECENT ORDERS (LAST 30 DAYS)');

  // 17. Application charges (if any)
  await makeShopifyRequest('application_charges.json', 'APPLICATION CHARGES');

  console.log(`\n${'='.repeat(60)}`);
  console.log('🎯 COMPREHENSIVE API TEST COMPLETED');
  console.log(`⏰ Finished at: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}`);
}

// Run the comprehensive test
testAllShopifyAPIs().catch(console.error);