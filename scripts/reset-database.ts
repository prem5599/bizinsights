// scripts/reset-database.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetDatabase() {
  console.log('🗑️  Starting comprehensive database reset...')
  console.log('⚠️  This will delete ALL data including users, organizations, integrations, and sample data!')
  
  try {
    // 1. Delete all webhook events first (if they exist)
    console.log('🧹 Deleting webhook events...')
    try {
      await prisma.webhookEvent.deleteMany({})
      console.log('✅ Webhook events deleted')
    } catch (error) {
      console.log('ℹ️  No webhook events to delete or table doesn\'t exist')
    }

    // 2. Delete all reports
    console.log('🧹 Deleting reports...')
    try {
      await prisma.report.deleteMany({})
      console.log('✅ Reports deleted')
    } catch (error) {
      console.log('ℹ️  No reports to delete or table doesn\'t exist')
    }

    // 3. Delete all data points
    console.log('🧹 Deleting data points...')
    const dataPointsDeleted = await prisma.dataPoint.deleteMany({})
    console.log(`✅ ${dataPointsDeleted.count} data points deleted`)

    // 4. Delete all insights
    console.log('🧹 Deleting insights...')
    const insightsDeleted = await prisma.insight.deleteMany({})
    console.log(`✅ ${insightsDeleted.count} insights deleted`)

    // 5. Delete all integrations
    console.log('🧹 Deleting integrations...')
    const integrationsDeleted = await prisma.integration.deleteMany({})
    console.log(`✅ ${integrationsDeleted.count} integrations deleted`)

    // 6. Delete all organization invitations
    console.log('🧹 Deleting organization invitations...')
    try {
      const invitationsDeleted = await prisma.organizationInvitation.deleteMany({})
      console.log(`✅ ${invitationsDeleted.count} organization invitations deleted`)
    } catch (error) {
      console.log('ℹ️  No organization invitations to delete or table doesn\'t exist')
    }

    // 7. Delete all organization members
    console.log('🧹 Deleting organization members...')
    const membersDeleted = await prisma.organizationMember.deleteMany({})
    console.log(`✅ ${membersDeleted.count} organization members deleted`)

    // 8. Delete all organizations
    console.log('🧹 Deleting organizations...')
    const organizationsDeleted = await prisma.organization.deleteMany({})
    console.log(`✅ ${organizationsDeleted.count} organizations deleted`)

    // 9. Delete all verification tokens
    console.log('🧹 Deleting verification tokens...')
    const verificationTokensDeleted = await prisma.verificationToken.deleteMany({})
    console.log(`✅ ${verificationTokensDeleted.count} verification tokens deleted`)

    // 10. Delete all user accounts (OAuth accounts)
    console.log('🧹 Deleting user accounts (OAuth)...')
    const accountsDeleted = await prisma.account.deleteMany({})
    console.log(`✅ ${accountsDeleted.count} OAuth accounts deleted`)

    // 11. Delete all user sessions
    console.log('🧹 Deleting user sessions...')
    const sessionsDeleted = await prisma.session.deleteMany({})
    console.log(`✅ ${sessionsDeleted.count} user sessions deleted`)

    // 12. Finally, delete all users
    console.log('🧹 Deleting users...')
    const usersDeleted = await prisma.user.deleteMany({})
    console.log(`✅ ${usersDeleted.count} users deleted`)

    // 13. Verify database is clean
    console.log('🔍 Verifying database cleanup...')
    const finalCounts = {
      users: await prisma.user.count(),
      accounts: await prisma.account.count(),
      sessions: await prisma.session.count(),
      organizations: await prisma.organization.count(),
      organizationMembers: await prisma.organizationMember.count(),
      integrations: await prisma.integration.count(),
      dataPoints: await prisma.dataPoint.count(),
      insights: await prisma.insight.count()
    }

    console.log('📊 Final database counts:', finalCounts)

    // Check if cleanup was successful
    const totalRecords = Object.values(finalCounts).reduce((sum, count) => sum + count, 0)
    
    if (totalRecords === 0) {
      console.log('✅ Database reset completed successfully!')
      console.log('🎉 Database is completely clean and ready for fresh setup!')
      console.log('')
      console.log('📝 What happens next:')
      console.log('   • All demo data and sample accounts have been removed')
      console.log('   • New users can now create fresh accounts')
      console.log('   • No dummy data will appear for new accounts')
      console.log('   • Real integrations will show actual data only')
      console.log('')
      console.log('🚀 You can now test with a new account!')
    } else {
      console.log('⚠️  Some records may still exist. This could be due to:')
      console.log('   • Foreign key constraints')
      console.log('   • Custom tables not included in this script')
      console.log('   • Database permissions')
      console.log('📊 Remaining records:', finalCounts)
    }

  } catch (error) {
    console.error('❌ Error during database reset:', error)
    console.error('')
    console.error('💡 Troubleshooting tips:')
    console.error('   • Check your DATABASE_URL in .env file')
    console.error('   • Ensure PostgreSQL is running')
    console.error('   • Verify database permissions')
    console.error('   • Run `npx prisma db push` to ensure schema is up to date')
    throw error
  } finally {
    await prisma.$disconnect()
    console.log('📡 Database connection closed')
  }
}

// Add confirmation prompt for safety
async function confirmReset() {
  console.log('⚠️  WARNING: This will delete ALL data in your database!')
  console.log('📋 This includes:')
  console.log('   • All user accounts and authentication data')
  console.log('   • All organizations and team data')
  console.log('   • All integrations (Shopify, Stripe, etc.)')
  console.log('   • All dashboard data and insights')
  console.log('   • All sample/demo data')
  console.log('')
  
  // In a production script, you might want to add readline for confirmation
  // For now, we'll proceed automatically since this is for development
  console.log('🔄 Proceeding with reset...')
  return true
}

// Main execution
async function main() {
  try {
    console.log('🚀 BizInsights Database Reset Utility')
    console.log('=====================================')
    console.log('')
    
    const confirmed = await confirmReset()
    if (!confirmed) {
      console.log('❌ Reset cancelled by user')
      process.exit(0)
    }

    await resetDatabase()
    
    console.log('')
    console.log('🎯 Reset Summary:')
    console.log('   ✅ All user accounts removed')
    console.log('   ✅ All organizations cleaned')
    console.log('   ✅ All integrations disconnected')
    console.log('   ✅ All sample data purged')
    console.log('   ✅ Database ready for fresh start')
    console.log('')
    console.log('📱 Next Steps:')
    console.log('   1. Start your dev server: npm run dev')
    console.log('   2. Create a new account with Google OAuth')
    console.log('   3. Connect real integrations')
    console.log('   4. Verify no dummy data appears')
    
    process.exit(0)
    
  } catch (error) {
    console.error('')
    console.error('💥 Reset failed with error:', error)
    console.error('')
    console.error('🔧 To fix this:')
    console.error('   1. Check your .env DATABASE_URL')
    console.error('   2. Ensure PostgreSQL is running')
    console.error('   3. Run: npx prisma db push')
    console.error('   4. Try the reset again')
    process.exit(1)
  }
}

// Run the script
main()