// src/lib/organization-helper.ts
import { prisma } from '@/lib/prisma'

export interface UserOrganization {
  organizationId: string
  organization: {
    id: string
    name: string
    slug: string
    subscriptionTier: string
    createdAt: Date
    updatedAt: Date
  }
  role: string
}

/**
 * Get or create organization membership for a user
 * This ensures every user has at least one organization
 */
export async function ensureUserOrganization(
  userId: string, 
  userName?: string, 
  userEmail?: string
): Promise<UserOrganization> {
  // First, try to find existing membership
  const existingMembership = await prisma.organizationMember.findFirst({
    where: { userId },
    include: { organization: true }
  })

  if (existingMembership) {
    return {
      organizationId: existingMembership.organizationId,
      organization: existingMembership.organization,
      role: existingMembership.role
    }
  }

  // No membership found, create a new organization
  console.log('Creating new organization for user:', userId)
  
  const orgName = `${userName || userEmail || 'User'}'s Organization`
  const baseSlug = generateSlugFromUserId(userId)
  
  // Generate unique slug
  const uniqueSlug = await generateUniqueSlug(baseSlug)
  
  try {
    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: orgName,
          slug: uniqueSlug,
          subscriptionTier: 'free'
        }
      })

      // Create membership
      const membership = await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: userId,
          role: 'owner'
        }
      })

      return {
        organizationId: organization.id,
        organization: organization,
        role: membership.role
      }
    })

    console.log('✅ Created organization:', result.organization.id, 'with slug:', result.organization.slug)
    return result

  } catch (error) {
    console.error('❌ Failed to create organization:', error)
    
    // If creation failed, maybe another request created it concurrently
    // Try to find existing membership one more time
    const retryMembership = await prisma.organizationMember.findFirst({
      where: { userId },
      include: { organization: true }
    })

    if (retryMembership) {
      console.log('✅ Found organization created by concurrent request')
      return {
        organizationId: retryMembership.organizationId,
        organization: retryMembership.organization,
        role: retryMembership.role
      }
    }

    // Still failed, throw the error
    throw new Error(`Failed to create organization: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate a base slug from user ID
 */
function generateSlugFromUserId(userId: string): string {
  const shortId = userId.slice(-8).toLowerCase()
  return `org-${shortId}`
}

/**
 * Generate a unique slug by checking database and adding counter if needed
 */
async function generateUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug
  let counter = 1

  while (counter <= 100) {
    const existing = await prisma.organization.findUnique({
      where: { slug }
    })

    if (!existing) {
      return slug
    }

    slug = `${baseSlug}-${counter}`
    counter++
  }

  // If we couldn't find a unique slug after 100 tries, use timestamp
  return `${baseSlug}-${Date.now()}`
}

/**
 * Check if user has access to organization
 */
export async function checkUserOrganizationAccess(
  userId: string, 
  organizationId: string
): Promise<{ hasAccess: boolean; role?: string }> {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organizationId
    }
  })

  return {
    hasAccess: !!membership,
    role: membership?.role
  }
}

/**
 * Get all organizations for a user
 */
export async function getUserOrganizations(userId: string) {
  return prisma.organizationMember.findMany({
    where: { userId },
    include: {
      organization: {
        include: {
          _count: {
            select: {
              integrations: true,
              members: true
            }
          }
        }
      }
    }
  })
}