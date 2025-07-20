// Test script to check user creation and authentication
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function testLoginFlow() {
  try {
    console.log('🔍 Testing database connection...')
    
    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    // Check if users table exists and has data
    const userCount = await prisma.user.count()
    console.log(`📊 Total users in database: ${userCount}`)
    
    // Check for existing test user
    const testEmail = 'test@example.com'
    let testUser = await prisma.user.findUnique({
      where: { email: testEmail }
    })
    
    if (!testUser) {
      console.log('👤 Creating test user...')
      const hashedPassword = await bcrypt.hash('123456', 12)
      
      testUser = await prisma.user.create({
        data: {
          email: testEmail,
          name: 'Test User',
          password: hashedPassword
        }
      })
      console.log('✅ Test user created:', testUser.email)
    } else {
      console.log('👤 Test user already exists:', testUser.email)
    }
    
    // Test password verification
    console.log('🔐 Testing password verification...')
    console.log('Password hash in DB:', testUser.password)
    const passwordMatch = await bcrypt.compare('123456', testUser.password || '')
    console.log('✅ Password verification:', passwordMatch ? 'SUCCESS' : 'FAILED')
    
    // Update test user password
    if (!passwordMatch && testUser.password) {
      console.log('🔄 Updating test user password...')
      const newHashedPassword = await bcrypt.hash('123456', 12)
      await prisma.user.update({
        where: { id: testUser.id },
        data: { password: newHashedPassword }
      })
      console.log('✅ Test user password updated')
    }
    
    // List all users
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    })
    console.log('👥 All users in database:')
    allUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.name}) - ${user.id}`)
    })
    
    console.log('✅ Database test completed successfully')
    
  } catch (error) {
    console.error('❌ Database test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testLoginFlow()