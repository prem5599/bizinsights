// Simple sync test - manually fetch Shopify data and store in database
const { PrismaClient } = require('@prisma/client')

const shopDomain = 'bizinsights-test-store'
const accessToken = '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'

async function simpleSync() {
  const prisma = new PrismaClient()
  
  console.log('🔄 SIMPLE SHOPIFY SYNC TEST...\n')

  try {
    // Get integration
    const integration = await prisma.integration.findFirst({
      where: { platform: 'shopify' }
    })

    if (!integration) {
      throw new Error('No Shopify integration found')
    }

    console.log('✅ Found integration:', integration.id)

    // Fetch orders from Shopify API
    console.log('\n📊 Fetching orders from Shopify...')
    const ordersResponse = await fetch(`https://${shopDomain}.myshopify.com/admin/api/2023-10/orders.json?status=any&limit=50`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })

    if (!ordersResponse.ok) {
      throw new Error(`Failed to fetch orders: ${ordersResponse.status}`)
    }

    const ordersData = await ordersResponse.json()
    const orders = ordersData.orders || []
    
    console.log(`✅ Found ${orders.length} orders`)

    // Process each order and create data points
    let dataPointsCreated = 0
    
    for (const order of orders) {
      try {
        // Create order data point
        await prisma.dataPoint.create({
          data: {
            integrationId: integration.id,
            metricType: 'orders',
            value: 1,
            metadata: {
              orderId: order.id,
              orderNumber: order.number,
              customerId: order.customer?.id,
              totalPrice: order.total_price,
              currency: order.currency,
              financialStatus: order.financial_status,
              source: 'manual_sync'
            },
            dateRecorded: new Date(order.created_at)
          }
        })
        dataPointsCreated++

        // Create revenue data point if paid
        if (order.financial_status === 'paid' || order.financial_status === 'partially_paid') {
          await prisma.dataPoint.create({
            data: {
              integrationId: integration.id,
              metricType: 'revenue',
              value: parseFloat(order.total_price || '0'),
              metadata: {
                orderId: order.id,
                orderNumber: order.number,
                customerId: order.customer?.id,
                currency: order.currency,
                financialStatus: order.financial_status,
                source: 'manual_sync'
              },
              dateRecorded: new Date(order.created_at)
            }
          })
          dataPointsCreated++
        }

        console.log(`  ✓ Processed order #${order.number}: ${order.currency} ${order.total_price}`)
        
      } catch (error) {
        console.log(`  ❌ Failed to process order ${order.id}: ${error.message}`)
      }
    }

    // Fetch customers
    console.log('\n👥 Fetching customers from Shopify...')
    const customersResponse = await fetch(`https://${shopDomain}.myshopify.com/admin/api/2023-10/customers.json?limit=50`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })

    if (customersResponse.ok) {
      const customersData = await customersResponse.json()
      const customers = customersData.customers || []
      
      console.log(`✅ Found ${customers.length} customers`)

      for (const customer of customers) {
        try {
          await prisma.dataPoint.create({
            data: {
              integrationId: integration.id,
              metricType: 'customer_created',
              value: 1,
              metadata: {
                customerId: customer.id,
                email: customer.email,
                firstName: customer.first_name,
                lastName: customer.last_name,
                ordersCount: customer.orders_count,
                totalSpent: customer.total_spent,
                source: 'manual_sync'
              },
              dateRecorded: new Date(customer.created_at)
            }
          })
          dataPointsCreated++
          
        } catch (error) {
          console.log(`  ❌ Failed to process customer ${customer.id}: ${error.message}`)
        }
      }
    }

    // Update integration sync time
    await prisma.integration.update({
      where: { id: integration.id },
      data: { 
        lastSyncAt: new Date(),
        metadata: {
          ...integration.metadata,
          lastManualSync: new Date().toISOString(),
          lastSyncRecords: dataPointsCreated
        }
      }
    })

    console.log(`\n✅ Sync completed! Created ${dataPointsCreated} data points`)

    // Check final counts
    const totalDataPoints = await prisma.dataPoint.count({
      where: { integrationId: integration.id }
    })
    
    const revenuePoints = await prisma.dataPoint.count({
      where: { 
        integrationId: integration.id,
        metricType: 'revenue'
      }
    })

    const orderPoints = await prisma.dataPoint.count({
      where: { 
        integrationId: integration.id,
        metricType: 'orders'
      }
    })

    console.log(`\n📈 Final database status:`)
    console.log(`   Total data points: ${totalDataPoints}`)
    console.log(`   Revenue points: ${revenuePoints}`)
    console.log(`   Order points: ${orderPoints}`)

  } catch (error) {
    console.error('❌ Sync failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

simpleSync()