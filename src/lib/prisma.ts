// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

/**
 * Prisma Client Configuration
 * Handles database connections with proper singleton pattern for Next.js
 */

/**
 * Global Prisma instance to prevent multiple connections in development
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

/**
 * Database logging levels based on environment
 */
const getLogLevel = (): Array<'query' | 'info' | 'warn' | 'error'> => {
  if (process.env.NODE_ENV === 'development') {
    return ['error', 'warn']
  }
  if (process.env.NODE_ENV === 'test') {
    return ['error']
  }
  return ['error', 'warn']
}

/**
 * Prisma Client options based on environment
 */
const getPrismaOptions = () => {
  const baseOptions = {
    log: getLogLevel(),
    errorFormat: 'pretty' as const,
  }

  // Development specific options
  if (process.env.NODE_ENV === 'development') {
    return {
      ...baseOptions,
      // Add more verbose logging in development if needed
      // log: ['query', 'info', 'warn', 'error'] as const,
    }
  }

  // Production specific options
  if (process.env.NODE_ENV === 'production') {
    return {
      ...baseOptions,
      // Production optimizations
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    }
  }

  // Test environment options
  if (process.env.NODE_ENV === 'test') {
    return {
      ...baseOptions,
      log: ['error'] as const,
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        },
      },
    }
  }

  return baseOptions
}

/**
 * Create Prisma Client instance with proper configuration
 */
function createPrismaClient() {
  const options = getPrismaOptions()
  
  console.log(`🗄️  Initializing Prisma Client for ${process.env.NODE_ENV} environment`)
  
  const client = new PrismaClient(options)

  // Add middleware for logging in development
  if (process.env.NODE_ENV === 'development') {
    client.$use(async (params, next) => {
      const start = Date.now()
      const result = await next(params)
      const duration = Date.now() - start
      
      // Log slow queries (> 100ms)
      if (duration > 100) {
        console.log(`🐌 Slow query detected: ${params.model}.${params.action} took ${duration}ms`)
      }
      
      return result
    })
  }

  // Add error handling middleware
  client.$use(async (params, next) => {
    try {
      return await next(params)
    } catch (error) {
      console.error(`💥 Database error in ${params.model}.${params.action}:`, error)
      throw error
    }
  })

  // Handle graceful shutdown
  if (typeof window === 'undefined') {
    // Only on server side
    process.on('beforeExit', async () => {
      console.log('🔌 Disconnecting Prisma Client...')
      await client.$disconnect()
    })

    process.on('SIGINT', async () => {
      console.log('🔌 Received SIGINT, disconnecting Prisma Client...')
      await client.$disconnect()
      process.exit(0)
    })

    process.on('SIGTERM', async () => {
      console.log('🔌 Received SIGTERM, disconnecting Prisma Client...')
      await client.$disconnect()
      process.exit(0)
    })
  }

  return client
}

/**
 * Singleton Prisma Client instance
 * Prevents multiple instances in development due to hot reloading
 */
const prisma = globalThis.__prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

/**
 * Database connection test utility
 */
export async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...')
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Database connection successful')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

/**
 * Database health check utility
 */
export async function getDatabaseHealth() {
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const responseTime = Date.now() - start

    // Get database stats
    const [userCount, organizationCount, integrationCount] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.integration.count(),
    ])

    return {
      status: 'healthy',
      responseTime,
      statistics: {
        users: userCount,
        organizations: organizationCount,
        integrations: integrationCount,
      },
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Database health check failed:', error)
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Database cleanup utility for development/testing
 */
export async function cleanupDatabase() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database cleanup is not allowed in production')
  }

  console.log('🧹 Cleaning up database...')
  
  try {
    // Delete in correct order to avoid foreign key constraints
    await prisma.webhookEvent.deleteMany()
    await prisma.dataPoint.deleteMany()
    await prisma.insight.deleteMany()
    await prisma.report.deleteMany()
    await prisma.integration.deleteMany()
    await prisma.organizationInvitation.deleteMany()
    await prisma.organizationMember.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.session.deleteMany()
    await prisma.account.deleteMany()
    await prisma.verificationToken.deleteMany()
    await prisma.user.deleteMany()

    console.log('✅ Database cleanup completed')
  } catch (error) {
    console.error('❌ Database cleanup failed:', error)
    throw error
  }
}

/**
 * Transaction utility with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on certain errors
      if (
        error instanceof Error &&
        (error.message.includes('Unique constraint') ||
         error.message.includes('Record not found') ||
         error.message.includes('Foreign key constraint'))
      ) {
        throw error
      }

      if (attempt === maxRetries) {
        console.error(`❌ Operation failed after ${maxRetries} attempts:`, error)
        throw error
      }

      console.log(`⚠️  Attempt ${attempt} failed, retrying in ${delay}ms...`, error)
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 2 // Exponential backoff
    }
  }

  throw lastError!
}

/**
 * Enhanced transaction wrapper with error handling
 */
export async function transaction<T>(
  operation: (tx: Parameters<typeof prisma.$transaction>[0]) => Promise<T>
): Promise<T> {
  return withRetry(async () => {
    return prisma.$transaction(operation, {
      maxWait: 5000, // Maximum time to wait for a transaction to start
      timeout: 10000, // Maximum time for the transaction to run
    })
  })
}

/**
 * Connection pool monitoring
 */
export function getConnectionPoolStatus() {
  // This would be more detailed with actual connection pool metrics
  // For now, return basic info
  return {
    environment: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing',
    timestamp: new Date().toISOString(),
  }
}

/**
 * Export the singleton Prisma Client instance
 */
export { prisma }

/**
 * Export Prisma types for use throughout the application
 */
export type {
  User,
  Organization,
  OrganizationMember,
  Integration,
  DataPoint,
  WebhookEvent,
  Insight,
  Report,
  Prisma,
} from '@prisma/client'

/**
 * Re-export Prisma enums and utilities
 */
export { Prisma } from '@prisma/client'

// Default export for convenience
export default prisma