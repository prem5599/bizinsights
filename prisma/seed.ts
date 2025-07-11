// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create a test user
  const hashedPassword = await hash('password123', 12)
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@bizinsights.com' },
    update: {},
    create: {
      email: 'demo@bizinsights.com',
      name: 'Demo User',
      password: hashedPassword,
    },
  })

  console.log('👤 Created user:', user.email)

  // Create a demo organization
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-business' },
    update: {},
    create: {
      name: 'Demo Business',
      slug: 'demo-business',
      subscriptionTier: 'free',
    },
  })

  console.log('🏢 Created organization:', org.name)

  // Add user to organization as owner
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: user.id,
      role: 'owner',
    },
  })

  console.log('🔗 Added user to organization as owner')

  // Create sample integrations
  const integrations = [
    {
      platform: 'shopify',
      platformAccountId: 'demo-shopify-store',
      isActive: true,
      organizationId: org.id,
    },
    {
      platform: 'stripe',
      platformAccountId: 'acct_demo_stripe',
      isActive: true,
      organizationId: org.id,
    },
    {
      platform: 'google_analytics',
      platformAccountId: 'demo-ga-account',
      isActive: false,
      organizationId: org.id,
    },
  ]

  for (const integration of integrations) {
    await prisma.integration.upsert({
      where: {
        organizationId_platform: {
          organizationId: integration.organizationId,
          platform: integration.platform,
        },
      },
      update: {},
      create: integration,
    })
  }

  console.log('🔌 Created sample integrations')

  // Create sample insights
  const insights = [
    {
      organizationId: org.id,
      type: 'trend',
      title: 'Revenue Growth Accelerating',
      description: 'Your revenue has increased by 23% this month compared to last month, showing strong upward momentum.',
      impactScore: 85,
      metadata: {
        metric: 'revenue',
        change: 23.4,
        period: 'month',
      },
      isRead: false,
    },
    {
      organizationId: org.id,
      type: 'recommendation',
      title: 'Optimize Checkout Flow',
      description: 'Cart abandonment rate is 68%. Consider simplifying your checkout process or adding exit-intent popups.',
      impactScore: 72,
      metadata: {
        metric: 'conversion_rate',
        current_value: 32,
        benchmark: 45,
        potential_impact: '15% increase in conversions',
      },
      isRead: false,
    },
    {
      organizationId: org.id,
      type: 'anomaly',
      title: 'Unusual Traffic Spike Detected',
      description: 'Website traffic increased by 150% yesterday. Investigate the source to capitalize on this opportunity.',
      impactScore: 90,
      metadata: {
        metric: 'sessions',
        change: 150,
        date: new Date().toISOString(),
      },
      isRead: true,
    },
  ]

  for (const insight of insights) {
    await prisma.insight.create({
      data: insight,
    })
  }

  console.log('💡 Created sample insights')

  // Create sample reports
  const report = await prisma.report.create({
    data: {
      organizationId: org.id,
      name: 'Monthly Performance Report',
      type: 'monthly',
      description: 'Comprehensive overview of business performance for the month',
      config: {
        metrics: ['revenue', 'orders', 'customers', 'conversion_rate'],
        charts: ['revenue_trend', 'traffic_sources', 'top_products'],
        period: '30d',
      },
      isScheduled: true,
      scheduleConfig: {
        frequency: 'monthly',
        dayOfMonth: 1,
        time: '09:00',
        recipients: [user.email],
      },
    },
  })

  console.log('📊 Created sample report:', report.name)

  console.log('✅ Database seed completed successfully!')
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