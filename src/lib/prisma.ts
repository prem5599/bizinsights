// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Connection management
export async function connectDatabase() {
  try {
    await prisma.$connect()
    console.log('✅ Database connected successfully')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  }
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect()
    console.log('✅ Database disconnected successfully')
  } catch (error) {
    console.error('❌ Database disconnection failed:', error)
  }
}

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

// Transaction helper
export async function withTransaction<T>(
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(callback)
}

// Enhanced error handling
export function isPrismaError(error: unknown): error is { code: string; message: string } {
  return typeof error === 'object' && error !== null && 'code' in error
}

export function handlePrismaError(error: unknown): string {
  if (isPrismaError(error)) {
    switch (error.code) {
      case 'P2002':
        return 'A record with this information already exists'
      case 'P2014':
        return 'The change would violate a required relation'
      case 'P2003':
        return 'Foreign key constraint failed'
      case 'P2025':
        return 'Record not found'
      case 'P2016':
        return 'Query interpretation error'
      case 'P2021':
        return 'Table does not exist'
      default:
        return `Database error: ${error.message}`
    }
  }
  return 'An unexpected database error occurred'
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await disconnectDatabase()
})

process.on('SIGINT', async () => {
  await disconnectDatabase()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await disconnectDatabase()
  process.exit(0)
})