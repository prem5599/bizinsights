// scripts/test-connection.js
const { PrismaClient } = require('@prisma/client')

async function testConnection() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Testing database connection...')
    await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Database connection successful!')
    
    // Test basic queries
    const userCount = await prisma.user.count()
    console.log(`📊 Users in database: ${userCount}`)
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()