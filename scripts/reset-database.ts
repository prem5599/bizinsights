// scripts/reset-database.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetDatabase() {
  console.log('🗑️  Starting database reset...')

  try {
    // Delete all data in correct order (respecting foreign key constraints)
    console.log('Deleting data points...')
    await prisma.dataPoint.deleteMany({})

    console.log('Deleting insights...')
    await prisma.insight.deleteMany({})

    console.log('Deleting integrations...')
    await prisma.integration.deleteMany({})

    console.log('Deleting organization members...')
    await prisma.organizationMember.deleteMany({})

    console.log('Deleting organizations...')
    await prisma.organization.deleteMany({})

    console.log('Deleting user accounts...')
    await prisma.account.deleteMany({})

    console.log('Deleting user sessions...')
    await prisma.session.deleteMany({})

    console.log('Deleting users...')
    await prisma.user.deleteMany({})

    console.log('✅ Database reset completed successfully!')
    console.log('📝 All demo data, integrations, and sample accounts have been removed.')
    console.log('🆕 You can now create a fresh account and connect real integrations.')

  } catch (error) {
    console.error('❌ Error resetting database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the reset
resetDatabase()
  .then(() => {
    console.log('🎉 Database is now clean and ready for fresh setup!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Reset failed:', error)
    process.exit(1)
  })
  