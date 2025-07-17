// // src/app/api/admin/generate-sample-data/route.ts
// import { NextRequest, NextResponse } from 'next/server'
// import { getServerSession } from 'next-auth'
// import { authOptions } from '@/lib/auth'
// import { prisma } from '@/lib/prisma'

// export async function POST(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions)
//     if (!session?.user?.id) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }

//     const { organizationId, days = 30 } = await request.json()

//     // Verify user has access to organization
//     const membership = await prisma.organizationMember.findFirst({
//       where: {
//         organizationId,
//         userId: session.user.id
//       }
//     })

//     if (!membership) {
//       return NextResponse.json(
//         { error: 'Organization not found or access denied' },
//         { status: 404 }
//       )
//     }

//     console.log(`Generating ${days} days of sample data for organization ${organizationId}`)

//     // Get or create a sample integration
//     let integration = await prisma.integration.findFirst({
//       where: {
//         organizationId,
//         platform: 'shopify'
//       }
//     })

//     if (!integration) {
//       integration = await prisma.integration.create({
//         data: {
//           organizationId,
//           platform: 'shopify',
//           platformAccountId: 'sample-store.myshopify.com',
//           accessToken: 'sample_token_for_demo',
//           status: 'active',
//           metadata: {
//             storeName: 'Sample Store',
//             currency: 'INR',
//             isSample: true
//           }
//         }
//       })
//     }

//     // Clear existing sample data for this integration
//     await prisma.dataPoint.deleteMany({
//       where: {
//         integrationId: integration.id,
//         metadata: {
//           path: ['source'],
//           equals: 'sample_data'
//         }
//       }
//     })

//     const dataPoints = []
//     const now = new Date()

//     // Generate realistic Indian e-commerce data
//     for (let i = 0; i < days; i++) {
//       const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      
//       // Simulate weekly patterns (higher on weekends)
//       const dayOfWeek = date.getDay()
//       const weekendMultiplier = [0.7, 1.0, 1.0, 1.1, 1.2, 1.4, 1.3][dayOfWeek]
      
//       // Simulate seasonal trends
//       const month = date.getMonth()
//       const seasonalMultiplier = [0.8, 0.9, 1.0, 1.1, 1.2, 1.1, 0.9, 0.8, 0.9, 1.3, 1.5, 1.8][month]
      
//       // Base metrics with Indian market characteristics
//       const baseRevenue = 2500 // Average daily revenue in INR
//       const dailyRevenue = Math.floor(
//         baseRevenue * weekendMultiplier * seasonalMultiplier * (0.7 + Math.random() * 0.6)
//       )
      
//       // Orders with typical Indian AOV (300-800 INR)
//       const averageOrderValue = 400 + Math.random() * 400
//       const dailyOrders = Math.max(1, Math.floor(dailyRevenue / averageOrderValue))
      
//       // Sessions with Indian conversion rates (1-3%)
//       const conversionRate = 0.01 + Math.random() * 0.02
//       const dailySessions = Math.floor(dailyOrders / conversionRate)
      
//       // Customers (some are returning)
//       const returningCustomerRate = 0.3
//       const dailyNewCustomers = Math.floor(dailyOrders * (1 - returningCustomerRate))

//       // Revenue data point
//       dataPoints.push({
//         integrationId: integration.id,
//         metricType: 'revenue',
//         value: dailyRevenue,
//         metadata: {
//           currency: 'INR',
//           source: 'sample_data',
//           aov: Math.round(averageOrderValue),
//           generatedAt: new Date().toISOString(),
//           dayOfWeek: dayOfWeek,
//           seasonal: seasonalMultiplier.toFixed(2)
//         },
//         dateRecorded: date
//       })

//       // Orders data point
//       dataPoints.push({
//         integrationId: integration.id,
//         metricType: 'orders',
//         value: dailyOrders,
//         metadata: {
//           source: 'sample_data',
//           platform: 'shopify',
//           generatedAt: new Date().toISOString(),
//           paymentMethods: ['razorpay', 'paytm', 'phonepe', 'cod']
//         },
//         dateRecorded: date
//       })

//       // Sessions data point
//       dataPoints.push({
//         integrationId: integration.id,
//         metricType: 'sessions',
//         value: dailySessions,
//         metadata: {
//           source: Math.random() > 0.5 ? 'organic' : Math.random() > 0.5 ? 'direct' : 'social',
//           generatedAt: new Date().toISOString(),
//           conversionRate: (conversionRate * 100).toFixed(2)
//         },
//         dateRecorded: date
//       })

//       // Customers data point
//       dataPoints.push({
//         integrationId: integration.id,
//         metricType: 'customers',
//         value: dailyNewCustomers,
//         metadata: {
//           source: 'sample_data',
//           type: 'new_customers',
//           generatedAt: new Date().toISOString(),
//           returningRate: (returningCustomerRate * 100).toFixed(1)
//         },
//         dateRecorded: date
//       })
//     }

//     // Save all data points
//     await prisma.dataPoint.createMany({ data: dataPoints })

//     // Generate sample insights
//     const insights = [
//       {
//         organizationId,
//         type: 'trend',
//         title: 'Revenue Growth Trending Up',
//         description: 'Your revenue has increased by 23% compared to last month, driven by higher order values and increased traffic from social media campaigns.',
//         impactScore: 8,
//         isRead: false,
//         metadata: {
//           metric: 'revenue',
//           growth: 23,
//           period: 'month',
//           source: 'sample_data',
//           generatedAt: new Date().toISOString()
//         }
//       },
//       {
//         organizationId,
//         type: 'recommendation',
//         title: 'Optimize Mobile Experience',
//         description: 'Mobile traffic accounts for 67% of sessions but only 45% of conversions. Consider mobile checkout optimization to improve conversion rates.',
//         impactScore: 7,
//         isRead: false,
//         metadata: {
//           conversionGap: 22,
//           platform: 'mobile',
//           source: 'sample_data',
//           generatedAt: new Date().toISOString()
//         }
//       },
//       {
//         organizationId,
//         type: 'anomaly',
//         title: 'Unusual Traffic Spike Detected',
//         description: 'Traffic increased by 156% yesterday compared to the weekly average. This appears to be from a viral social media post.',
//         impactScore: 6,
//         isRead: false,
//         metadata: {
//           spike: 156,
//           date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
//           source: 'sample_data',
//           generatedAt: new Date().toISOString()
//         }
//       },
//       {
//         organizationId,
//         type: 'recommendation',
//         title: 'High Cart Abandonment Rate',
//         description: 'Cart abandonment rate is 78%. Implementing exit-intent popups and cart recovery emails could recover 15-25% of abandoned carts.',
//         impactScore: 9,
//         isRead: false,
//         metadata: {
//           abandonnmentRate: 78,
//           potentialRecovery: '15-25%',
//           source: 'sample_data',
//           generatedAt: new Date().toISOString()
//         }
//       },
//       {
//         organizationId,
//         type: 'trend',
//         title: 'Customer Acquisition Cost Improving',
//         description: 'Your customer acquisition cost has decreased by 18% this month while maintaining quality. Your marketing efficiency is improving.',
//         impactScore: 7,
//         isRead: false,
//         metadata: {
//           cacImprovement: 18,
//           period: 'month',
//           source: 'sample_data',
//           generatedAt: new Date().toISOString()
//         }
//       }
//     ]

//     // Delete existing sample insights first
//     await prisma.insight.deleteMany({
//       where: {
//         organizationId,
//         metadata: {
//           path: ['source'],
//           equals: 'sample_data'
//         }
//       }
//     })

//     await prisma.insight.createMany({ data: insights })

//     // Update integration last sync time
//     await prisma.integration.update({
//       where: { id: integration.id },
//       data: {
//         lastSyncAt: new Date(),
//         status: 'active'
//       }
//     })

//     return NextResponse.json({
//       success: true,
//       dataPointsCreated: dataPoints.length,
//       insightsCreated: insights.length,
//       integrationId: integration.id,
//       message: `Generated ${days} days of sample data with ${dataPoints.length} data points and ${insights.length} insights`
//     })

//   } catch (error) {
//     console.error('Sample data generation error:', error)
//     return NextResponse.json(
//       { error: 'Failed to generate sample data' },
//       { status: 500 }
//     )
//   }
// }

// export async function DELETE(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions)
//     if (!session?.user?.id) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }

//     const { searchParams } = new URL(request.url)
//     const organizationId = searchParams.get('organizationId')

//     if (!organizationId) {
//       return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
//     }

//     // Verify user has access to organization
//     const membership = await prisma.organizationMember.findFirst({
//       where: {
//         organizationId,
//         userId: session.user.id
//       }
//     })

//     if (!membership) {
//       return NextResponse.json(
//         { error: 'Organization not found or access denied' },
//         { status: 404 }
//       )
//     }

//     // Delete sample data points
//     const deletedDataPoints = await prisma.dataPoint.deleteMany({
//       where: {
//         integration: {
//           organizationId
//         },
//         metadata: {
//           path: ['source'],
//           equals: 'sample_data'
//         }
//       }
//     })

//     // Delete sample insights
//     const deletedInsights = await prisma.insight.deleteMany({
//       where: {
//         organizationId,
//         metadata: {
//           path: ['source'],
//           equals: 'sample_data'
//         }
//       }
//     })

//     return NextResponse.json({
//       success: true,
//       deletedDataPoints: deletedDataPoints.count,
//       deletedInsights: deletedInsights.count,
//       message: `Removed all sample data`
//     })

//   } catch (error) {
//     console.error('Sample data deletion error:', error)
//     return NextResponse.json(
//       { error: 'Failed to delete sample data' },
//       { status: 500 }
//     )
//   }
// }