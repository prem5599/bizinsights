// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 12)
  
  const user1 = await prisma.user.upsert({
    where: { email: 'admin@bizinsights.com' },
    update: {},
    create: {
      email: 'admin@bizinsights.com',
      name: 'Admin User',
      password: hashedPassword,
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'demo@bizinsights.com' },
    update: {},
    create: {
      email: 'demo@bizinsights.com',
      name: 'Demo User',
      password: hashedPassword,
    },
  })

  // Create test organization
  const organization = await prisma.organization.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      name: 'Demo Company',
      slug: 'demo-company',
      subscriptionTier: 'free',
    },
  })

  // Create organization members
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user1.id,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      userId: user1.id,
      role: 'owner',
    },
  })

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user2.id,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      userId: user2.id,
      role: 'member',
    },
  })

  // Create sample integration
  const integration = await prisma.integration.upsert({
    where: {
      organizationId_platform: {
        organizationId: organization.id,
        platform: 'shopify',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      platform: 'shopify',
      platformAccountId: 'demo-shop',
      accessToken: 'demo-token',
      status: 'active',
      lastSyncAt: new Date(),
    },
  })

  // Create sample data points
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const sampleDataPoints = []
  
  // Generate 30 days of sample data
  for (let i = 0; i < 30; i++) {
    const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
    const baseRevenue = 1000 + Math.random() * 500
    const orders = Math.floor(15 + Math.random() * 10)
    
    sampleDataPoints.push(
      {
        integrationId: integration.id,
        metricType: 'revenue',
        value: baseRevenue,
        metadata: { currency: 'USD', source: 'seed' },
        dateRecorded: date,
      },
      {
        integrationId: integration.id,
        metricType: 'orders',
        value: orders,
        metadata: { source: 'seed' },
        dateRecorded: date,
      },
      {
        integrationId: integration.id,
        metricType: 'sessions',
        value: Math.floor(200 + Math.random() * 100),
        metadata: { source: 'seed' },
        dateRecorded: date,
      },
      {
        integrationId: integration.id,
        metricType: 'customers',
        value: Math.floor(orders * 0.7),
        metadata: { source: 'seed' },
        dateRecorded: date,
      }
    )
  }

  await prisma.dataPoint.createMany({
    data: sampleDataPoints,
    skipDuplicates: true,
  })

  // Create sample insights
  await prisma.insight.upsert({
    where: { id: 'sample-insight-1' },
    update: {},
    create: {
      id: 'sample-insight-1',
      organizationId: organization.id,
      type: 'trend',
      title: 'Revenue Growth Detected',
      description: 'Your revenue has increased by 15% over the last 7 days compared to the previous week.',
      impactScore: 85,
      isRead: false,
      metadata: { trend: 'positive', percentage: 15 },
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log('\n📝 Test Accounts Created:')
  console.log('Email: admin@bizinsights.com')
  console.log('Email: demo@bizinsights.com')
  console.log('Password: password123')
  console.log('\n🏢 Organization: Demo Company (slug: demo-company)')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })