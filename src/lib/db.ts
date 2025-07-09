// lib/db.ts
import { prisma } from './prisma'

export async function getUserOrganizations(userId: string) {
  return prisma.organizationMember.findMany({
    where: { userId },
    include: {
      organization: {
        include: {
          _count: {
            select: {
              integrations: true,
              members: true,
            },
          },
        },
      },
    },
  })
}

export async function createOrganization(name: string, userId: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
  
  return prisma.organization.create({
    data: {
      name,
      slug,
      members: {
        create: {
          userId,
          role: 'owner',
        },
      },
    },
    include: {
      members: true,
    },
  })
}

export async function getOrganizationBySlug(slug: string) {
  return prisma.organization.findUnique({
    where: { slug },
    include: {
      members: {
        include: {
          user: true,
        },
      },
      integrations: true,
      _count: {
        select: {
          insights: true,
          reports: true,
        },
      },
    },
  })
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      organizations: {
        include: {
          organization: true,
        },
      },
    },
  })
}