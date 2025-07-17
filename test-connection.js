// test-connection.js
const { PrismaClient } = require('@prisma/client')

async function testConnection() {
  const prisma = new PrismaClient({
    log: ['query', 'error', 'info', 'warn'],
  })

  try {
    console.log('🔍 Testing database connection...')
    console.log('Database URL:', process.env.DATABASE_URL?.substring(0, 50) + '...')
    
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Connected to database successfully!')
    
    // Test if we can query
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Query test successful:', result)
    
    // Test server version
    const version = await prisma.$queryRaw`SELECT version() as version`
    console.log('✅ PostgreSQL version:', version[0]?.version?.substring(0, 50) + '...')
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
    
    if (error.code === 'P1001') {
      console.log('')
      console.log('💡 Connection troubleshooting:')
      console.log('   1. Check if your Supabase project is active')
      console.log('   2. Verify the DATABASE_URL format')
      console.log('   3. Ensure password is correct')
      console.log('   4. Try using the connection pooler (port 6543)')
      console.log('   5. Check network/firewall settings')
    }
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()