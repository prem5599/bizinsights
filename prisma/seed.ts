// Updated prisma/seed.ts - Add demo user with password
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo user with password
  const hashedPassword = await hash('demo123456', 12) // Demo password: demo123456
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@bizinsights.com' },
    update: {},
    create: {
      email: 'demo@bizinsights.com',
      name: 'Demo User',
      password: hashedPassword,
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face',
    },
  })

  // Create sample organization
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      name: 'Demo Company',
      slug: 'demo-company',
      subscriptionTier: 'pro',
      members: {
        create: {
          userId: user.id,
          role: 'owner',
        },
      },
    },
  })

  // Create sample integrations
  const shopifyIntegration = await prisma.integration.create({
    data: {
      organizationId: org.id,
      platform: 'shopify',
      platformAccountId: 'demo-shop.myshopify.com',
      status: 'active',
      lastSyncAt: new Date(),
    },
  })

  const stripeIntegration = await prisma.integration.create({
    data: {
      organizationId: org.id,
      platform: 'stripe',
      platformAccountId: 'acct_demo123',
      status: 'active',
      lastSyncAt: new Date(),
    },
  })

  // Create sample data points for the last 30 days
  const now = new Date()
  const dataPoints = []

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    // Shopify revenue data
    dataPoints.push({
      integrationId: shopifyIntegration.id,
      metricType: 'revenue',
      value: Math.floor(Math.random() * 5000) + 1000, // $1K-$6K per day
      dateRecorded: date,
      metadata: { source: 'shopify' },
    })

    // Shopify orders data
    dataPoints.push({
      integrationId: shopifyIntegration.id,
      metricType: 'orders',
      value: Math.floor(Math.random() * 50) + 10, // 10-60 orders per day
      dateRecorded: date,
      metadata: { source: 'shopify' },
    })

    // Stripe revenue data
    dataPoints.push({
      integrationId: stripeIntegration.id,
      metricType: 'revenue',
      value: Math.floor(Math.random() * 3000) + 500, // $500-$3.5K per day
      dateRecorded: date,
      metadata: { source: 'stripe' },
    })

    // Sessions data
    dataPoints.push({
      integrationId: shopifyIntegration.id,
      metricType: 'sessions',
      value: Math.floor(Math.random() * 1000) + 200, // 200-1200 sessions per day
      dateRecorded: date,
      metadata: { source: 'shopify' },
    })
  }

  await prisma.dataPoint.createMany({
    data: dataPoints,
  })

  // Create sample insights
  await prisma.insight.createMany({
    data: [
      {
        organizationId: org.id,
        type: 'trend',
        title: 'Revenue Growth Accelerating',
        description: 'Your revenue has increased by 23% compared to last month, driven primarily by higher average order values.',
        impactScore: 8,
        metadata: {
          metric: 'revenue',
          change: 23,
          period: 'monthly',
        },
      },
      {
        organizationId: org.id,
        type: 'anomaly',
        title: 'Unusual Traffic Spike Detected',
        description: 'Website sessions increased by 150% on March 15th. This could indicate a successful marketing campaign or viral content.',
        impactScore: 6,
        metadata: {
          metric: 'sessions',
          change: 150,
          date: '2024-03-15',
        },
      },
      {
        organizationId: org.id,
        type: 'recommendation',
        title: 'Optimize Checkout Process',
        description: 'Conversion rate dropped by 5% this week. Consider reviewing your checkout flow for potential friction points.',
        impactScore: 7,
        metadata: {
          metric: 'conversion',
          change: -5,
          action: 'checkout_optimization',
        },
      },
    ],
  })

  console.log('✅ Database seeded successfully!')
  console.log(`Created user: ${user.email}`)
  console.log('Demo login credentials:')
  console.log('  Email: demo@bizinsights.com')
  console.log('  Password: demo123456')
  console.log(`Created organization: ${org.name}`)
  console.log(`Created ${dataPoints.length} data points`)
  console.log(`Created 3 insights`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })