// __mocks__/prisma.js
import { jest } from '@jest/globals'

// Mock database records
const mockUsers = [
  {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'user-2',
    email: 'admin@example.com',
    name: 'Admin User',
    image: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
]

const mockOrganizations = [
  {
    id: 'org-1',
    name: 'Test Organization',
    slug: 'test-org',
    subscriptionTier: 'free',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'org-2',
    name: 'Premium Organization',
    slug: 'premium-org',
    subscriptionTier: 'premium',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
]

const mockIntegrations = [
  {
    id: 'integration-1',
    organizationId: 'org-1',
    platform: 'shopify',
    platformAccountId: 'test-shop',
    accessToken: 'mock-token',
    refreshToken: null,
    tokenExpiresAt: null,
    status: 'active',
    lastSyncAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'integration-2',
    organizationId: 'org-1',
    platform: 'stripe',
    platformAccountId: 'acct_test',
    accessToken: 'sk_test_mock',
    refreshToken: null,
    tokenExpiresAt: null,
    status: 'active',
    lastSyncAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
]

const mockDataPoints = [
  {
    id: 'dp-1',
    integrationId: 'integration-1',
    metricType: 'revenue',
    value: 1000.00,
    metadata: { orderId: 'order-1', currency: 'USD' },
    dateRecorded: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'dp-2',
    integrationId: 'integration-1',
    metricType: 'orders',
    value: 1,
    metadata: { orderId: 'order-1' },
    dateRecorded: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
  },
]

const mockInsights = [
  {
    id: 'insight-1',
    organizationId: 'org-1',
    type: 'trend',
    title: 'Revenue Growth',
    description: 'Revenue increased by 25% this month',
    impactScore: 85,
    isRead: false,
    metadata: {},
    createdAt: new Date('2024-01-01'),
  },
]

const mockOrganizationMembers = [
  {
    id: 'member-1',
    organizationId: 'org-1',
    userId: 'user-1',
    role: 'owner',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'member-2',
    organizationId: 'org-1',
    userId: 'user-2',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
  },
]

// Helper functions for mock operations
const findById = (array, id) => array.find(item => item.id === id) || null
const findByField = (array, field, value) => array.find(item => item[field] === value) || null
const findManyByField = (array, field, value) => array.filter(item => item[field] === value)

const applyWhere = (array, where) => {
  if (!where) return array
  
  return array.filter(item => {
    return Object.entries(where).every(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        // Handle nested conditions like { in: [...] }
        if (value.in) return value.in.includes(item[key])
        if (value.not) return item[key] !== value.not
        if (value.gte) return item[key] >= value.gte
        if (value.lte) return item[key] <= value.lte
        if (value.gt) return item[key] > value.gt
        if (value.lt) return item[key] < value.lt
        if (value.contains) return item[key]?.includes(value.contains)
        if (value.startsWith) return item[key]?.startsWith(value.startsWith)
        if (value.endsWith) return item[key]?.endsWith(value.endsWith)
        return true
      }
      return item[key] === value
    })
  })
}

const applyInclude = (item, include, mockData) => {
  if (!include || !item) return item
  
  const result = { ...item }
  
  Object.entries(include).forEach(([relation, options]) => {
    switch (relation) {
      case 'organization':
        result.organization = findById(mockOrganizations, item.organizationId)
        break
      case 'user':
        result.user = findById(mockUsers, item.userId)
        break
      case 'integrations':
        result.integrations = findManyByField(mockIntegrations, 'organizationId', item.id)
        break
      case 'members':
        result.members = findManyByField(mockOrganizationMembers, 'organizationId', item.id)
        if (options?.include?.user) {
          result.members = result.members.map(member => ({
            ...member,
            user: findById(mockUsers, member.userId)
          }))
        }
        break
      case 'dataPoints':
        result.dataPoints = findManyByField(mockDataPoints, 'integrationId', item.id)
        if (options?.take) {
          result.dataPoints = result.dataPoints.slice(0, options.take)
        }
        break
    }
  })
  
  return result
}

// Create mock Prisma client
const createMockPrismaClient = () => ({
  // User model
  user: {
    findUnique: jest.fn(({ where }) => {
      const user = where.id ? findById(mockUsers, where.id) : findByField(mockUsers, 'email', where.email)
      return Promise.resolve(user)
    }),
    
    findFirst: jest.fn(({ where }) => {
      const filtered = applyWhere(mockUsers, where)
      return Promise.resolve(filtered[0] || null)
    }),
    
    findMany: jest.fn(({ where, include, take, skip, orderBy }) => {
      let filtered = applyWhere(mockUsers, where)
      
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0]
        filtered.sort((a, b) => {
          const aVal = a[field]
          const bVal = b[field]
          if (direction === 'desc') return bVal > aVal ? 1 : -1
          return aVal > bVal ? 1 : -1
        })
      }
      
      if (skip) filtered = filtered.slice(skip)
      if (take) filtered = filtered.slice(0, take)
      
      const result = filtered.map(item => applyInclude(item, include))
      return Promise.resolve(result)
    }),
    
    create: jest.fn(({ data, include }) => {
      const newUser = {
        id: `user-${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockUsers.push(newUser)
      return Promise.resolve(applyInclude(newUser, include))
    }),
    
    update: jest.fn(({ where, data, include }) => {
      const index = mockUsers.findIndex(user => user.id === where.id)
      if (index === -1) throw new Error('User not found')
      
      mockUsers[index] = {
        ...mockUsers[index],
        ...data,
        updatedAt: new Date(),
      }
      return Promise.resolve(applyInclude(mockUsers[index], include))
    }),
    
    delete: jest.fn(({ where }) => {
      const index = mockUsers.findIndex(user => user.id === where.id)
      if (index === -1) throw new Error('User not found')
      
      const deleted = mockUsers.splice(index, 1)[0]
      return Promise.resolve(deleted)
    }),
  },

  // Organization model
  organization: {
    findUnique: jest.fn(({ where, include }) => {
      const org = where.id ? findById(mockOrganizations, where.id) : findByField(mockOrganizations, 'slug', where.slug)
      return Promise.resolve(applyInclude(org, include))
    }),
    
    findFirst: jest.fn(({ where, include }) => {
      const filtered = applyWhere(mockOrganizations, where)
      const result = filtered[0] || null
      return Promise.resolve(applyInclude(result, include))
    }),
    
    findMany: jest.fn(({ where, include, take, skip, orderBy }) => {
      let filtered = applyWhere(mockOrganizations, where)
      
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0]
        filtered.sort((a, b) => {
          const aVal = a[field]
          const bVal = b[field]
          if (direction === 'desc') return bVal > aVal ? 1 : -1
          return aVal > bVal ? 1 : -1
        })
      }
      
      if (skip) filtered = filtered.slice(skip)
      if (take) filtered = filtered.slice(0, take)
      
      const result = filtered.map(item => applyInclude(item, include))
      return Promise.resolve(result)
    }),
    
    create: jest.fn(({ data, include }) => {
      const newOrg = {
        id: `org-${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockOrganizations.push(newOrg)
      return Promise.resolve(applyInclude(newOrg, include))
    }),
    
    update: jest.fn(({ where, data, include }) => {
      const index = mockOrganizations.findIndex(org => org.id === where.id)
      if (index === -1) throw new Error('Organization not found')
      
      mockOrganizations[index] = {
        ...mockOrganizations[index],
        ...data,
        updatedAt: new Date(),
      }
      return Promise.resolve(applyInclude(mockOrganizations[index], include))
    }),
    
    delete: jest.fn(({ where }) => {
      const index = mockOrganizations.findIndex(org => org.id === where.id)
      if (index === -1) throw new Error('Organization not found')
      
      const deleted = mockOrganizations.splice(index, 1)[0]
      return Promise.resolve(deleted)
    }),
  },

  // OrganizationMember model
  organizationMember: {
    findUnique: jest.fn(({ where, include }) => {
      const member = findById(mockOrganizationMembers, where.id)
      return Promise.resolve(applyInclude(member, include))
    }),
    
    findFirst: jest.fn(({ where, include }) => {
      const filtered = applyWhere(mockOrganizationMembers, where)
      const result = filtered[0] || null
      return Promise.resolve(applyInclude(result, include))
    }),
    
    findMany: jest.fn(({ where, include, take, skip, orderBy }) => {
      let filtered = applyWhere(mockOrganizationMembers, where)
      
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0]
        filtered.sort((a, b) => {
          const aVal = a[field]
          const bVal = b[field]
          if (direction === 'desc') return bVal > aVal ? 1 : -1
          return aVal > bVal ? 1 : -1
        })
      }
      
      if (skip) filtered = filtered.slice(skip)
      if (take) filtered = filtered.slice(0, take)
      
      const result = filtered.map(item => applyInclude(item, include))
      return Promise.resolve(result)
    }),
    
    create: jest.fn(({ data, include }) => {
      const newMember = {
        id: `member-${Date.now()}`,
        ...data,
        createdAt: new Date(),
      }
      mockOrganizationMembers.push(newMember)
      return Promise.resolve(applyInclude(newMember, include))
    }),
    
    update: jest.fn(({ where, data, include }) => {
      const index = mockOrganizationMembers.findIndex(member => member.id === where.id)
      if (index === -1) throw new Error('Organization member not found')
      
      mockOrganizationMembers[index] = {
        ...mockOrganizationMembers[index],
        ...data,
      }
      return Promise.resolve(applyInclude(mockOrganizationMembers[index], include))
    }),
    
    delete: jest.fn(({ where }) => {
      const index = mockOrganizationMembers.findIndex(member => member.id === where.id)
      if (index === -1) throw new Error('Organization member not found')
      
      const deleted = mockOrganizationMembers.splice(index, 1)[0]
      return Promise.resolve(deleted)
    }),
  },

  // Integration model
  integration: {
    findUnique: jest.fn(({ where, include }) => {
      const integration = findById(mockIntegrations, where.id)
      return Promise.resolve(applyInclude(integration, include))
    }),
    
    findFirst: jest.fn(({ where, include }) => {
      const filtered = applyWhere(mockIntegrations, where)
      const result = filtered[0] || null
      return Promise.resolve(applyInclude(result, include))
    }),
    
    findMany: jest.fn(({ where, include, take, skip, orderBy }) => {
      let filtered = applyWhere(mockIntegrations, where)
      
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0]
        filtered.sort((a, b) => {
          const aVal = a[field]
          const bVal = b[field]
          if (direction === 'desc') return bVal > aVal ? 1 : -1
          return aVal > bVal ? 1 : -1
        })
      }
      
      if (skip) filtered = filtered.slice(skip)
      if (take) filtered = filtered.slice(0, take)
      
      const result = filtered.map(item => applyInclude(item, include))
      return Promise.resolve(result)
    }),
    
    create: jest.fn(({ data, include }) => {
      const newIntegration = {
        id: `integration-${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockIntegrations.push(newIntegration)
      return Promise.resolve(applyInclude(newIntegration, include))
    }),
    
    update: jest.fn(({ where, data, include }) => {
      const index = mockIntegrations.findIndex(integration => integration.id === where.id)
      if (index === -1) throw new Error('Integration not found')
      
      mockIntegrations[index] = {
        ...mockIntegrations[index],
        ...data,
        updatedAt: new Date(),
      }
      return Promise.resolve(applyInclude(mockIntegrations[index], include))
    }),
    
    delete: jest.fn(({ where }) => {
      const index = mockIntegrations.findIndex(integration => integration.id === where.id)
      if (index === -1) throw new Error('Integration not found')
      
      const deleted = mockIntegrations.splice(index, 1)[0]
      return Promise.resolve(deleted)
    }),
  },

  // DataPoint model
  dataPoint: {
    findUnique: jest.fn(({ where, include }) => {
      const dataPoint = findById(mockDataPoints, where.id)
      return Promise.resolve(applyInclude(dataPoint, include))
    }),
    
    findFirst: jest.fn(({ where, include }) => {
      const filtered = applyWhere(mockDataPoints, where)
      const result = filtered[0] || null
      return Promise.resolve(applyInclude(result, include))
    }),
    
    findMany: jest.fn(({ where, include, take, skip, orderBy }) => {
      let filtered = applyWhere(mockDataPoints, where)
      
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0]
        filtered.sort((a, b) => {
          const aVal = a[field]
          const bVal = b[field]
          if (direction === 'desc') return bVal > aVal ? 1 : -1
          return aVal > bVal ? 1 : -1
        })
      }
      
      if (skip) filtered = filtered.slice(skip)
      if (take) filtered = filtered.slice(0, take)
      
      const result = filtered.map(item => applyInclude(item, include))
      return Promise.resolve(result)
    }),
    
    create: jest.fn(({ data, include }) => {
      const newDataPoint = {
        id: `dp-${Date.now()}`,
        ...data,
        createdAt: new Date(),
      }
      mockDataPoints.push(newDataPoint)
      return Promise.resolve(applyInclude(newDataPoint, include))
    }),
    
    createMany: jest.fn(({ data, skipDuplicates }) => {
      const newDataPoints = data.map((item, index) => ({
        id: `dp-${Date.now()}-${index}`,
        ...item,
        createdAt: new Date(),
      }))
      
      if (skipDuplicates) {
        // Simple duplicate detection based on integrationId + metricType + dateRecorded
        const existingKeys = new Set(
          mockDataPoints.map(dp => `${dp.integrationId}-${dp.metricType}-${dp.dateRecorded.getTime()}`)
        )
        
        const uniqueDataPoints = newDataPoints.filter(dp => 
          !existingKeys.has(`${dp.integrationId}-${dp.metricType}-${dp.dateRecorded.getTime()}`)
        )
        
        mockDataPoints.push(...uniqueDataPoints)
        return Promise.resolve({ count: uniqueDataPoints.length })
      } else {
        mockDataPoints.push(...newDataPoints)
        return Promise.resolve({ count: newDataPoints.length })
      }
    }),
    
    updateMany: jest.fn(({ where, data }) => {
      const filtered = applyWhere(mockDataPoints, where)
      let updateCount = 0
      
      filtered.forEach(dataPoint => {
        const index = mockDataPoints.findIndex(dp => dp.id === dataPoint.id)
        if (index !== -1) {
          mockDataPoints[index] = {
            ...mockDataPoints[index],
            ...data,
          }
          updateCount++
        }
      })
      
      return Promise.resolve({ count: updateCount })
    }),
    
    count: jest.fn(({ where }) => {
      const filtered = applyWhere(mockDataPoints, where)
      return Promise.resolve(filtered.length)
    }),
    
    groupBy: jest.fn(({ by, where, _count, _sum, _avg, _min, _max }) => {
      const filtered = applyWhere(mockDataPoints, where)
      const groups = {}
      
      filtered.forEach(item => {
        const key = by.map(field => item[field]).join('-')
        if (!groups[key]) {
          groups[key] = {
            ...by.reduce((acc, field) => ({ ...acc, [field]: item[field] }), {}),
            items: []
          }
        }
        groups[key].items.push(item)
      })
      
      const result = Object.values(groups).map(group => {
        const groupResult = { ...group }
        delete groupResult.items
        
        if (_count) {
          groupResult._count = {}
          Object.keys(_count).forEach(field => {
            groupResult._count[field] = group.items.length
          })
        }
        
        if (_sum) {
          groupResult._sum = {}
          Object.keys(_sum).forEach(field => {
            groupResult._sum[field] = group.items.reduce((sum, item) => sum + (Number(item[field]) || 0), 0)
          })
        }
        
        if (_avg) {
          groupResult._avg = {}
          Object.keys(_avg).forEach(field => {
            const sum = group.items.reduce((sum, item) => sum + (Number(item[field]) || 0), 0)
            groupResult._avg[field] = group.items.length > 0 ? sum / group.items.length : 0
          })
        }
        
        if (_min) {
          groupResult._min = {}
          Object.keys(_min).forEach(field => {
            groupResult._min[field] = Math.min(...group.items.map(item => Number(item[field]) || 0))
          })
        }
        
        if (_max) {
          groupResult._max = {}
          Object.keys(_max).forEach(field => {
            groupResult._max[field] = Math.max(...group.items.map(item => Number(item[field]) || 0))
          })
        }
        
        return groupResult
      })
      
      return Promise.resolve(result)
    }),
    
    delete: jest.fn(({ where }) => {
      const index = mockDataPoints.findIndex(dp => dp.id === where.id)
      if (index === -1) throw new Error('DataPoint not found')
      
      const deleted = mockDataPoints.splice(index, 1)[0]
      return Promise.resolve(deleted)
    }),
  },

  // Insight model
  insight: {
    findUnique: jest.fn(({ where, include }) => {
      const insight = findById(mockInsights, where.id)
      return Promise.resolve(applyInclude(insight, include))
    }),
    
    findFirst: jest.fn(({ where, include }) => {
      const filtered = applyWhere(mockInsights, where)
      const result = filtered[0] || null
      return Promise.resolve(applyInclude(result, include))
    }),
    
    findMany: jest.fn(({ where, include, take, skip, orderBy }) => {
      let filtered = applyWhere(mockInsights, where)
      
      if (orderBy) {
        const [field, direction] = Object.entries(orderBy)[0]
        filtered.sort((a, b) => {
          const aVal = a[field]
          const bVal = b[field]
          if (direction === 'desc') return bVal > aVal ? 1 : -1
          return aVal > bVal ? 1 : -1
        })
      }
      
      if (skip) filtered = filtered.slice(skip)
      if (take) filtered = filtered.slice(0, take)
      
      const result = filtered.map(item => applyInclude(item, include))
      return Promise.resolve(result)
    }),
    
    create: jest.fn(({ data, include }) => {
      const newInsight = {
        id: `insight-${Date.now()}`,
        ...data,
        createdAt: new Date(),
      }
      mockInsights.push(newInsight)
      return Promise.resolve(applyInclude(newInsight, include))
    }),
    
    update: jest.fn(({ where, data, include }) => {
      const index = mockInsights.findIndex(insight => insight.id === where.id)
      if (index === -1) throw new Error('Insight not found')
      
      mockInsights[index] = {
        ...mockInsights[index],
        ...data,
      }
      return Promise.resolve(applyInclude(mockInsights[index], include))
    }),
    
    delete: jest.fn(({ where }) => {
      const index = mockInsights.findIndex(insight => insight.id === where.id)
      if (index === -1) throw new Error('Insight not found')
      
      const deleted = mockInsights.splice(index, 1)[0]
      return Promise.resolve(deleted)
    }),
  },

  // Transaction support
  $transaction: jest.fn((queries) => {
    // Simple transaction mock - just execute all queries
    if (Array.isArray(queries)) {
      return Promise.all(queries)
    } else if (typeof queries === 'function') {
      // Interactive transaction
      const tx = createMockPrismaClient()
      return Promise.resolve(queries(tx))
    }
    return Promise.resolve([])
  }),

  // Connection and utility methods
  $connect: jest.fn(() => Promise.resolve()),
  $disconnect: jest.fn(() => Promise.resolve()),
  $executeRaw: jest.fn(() => Promise.resolve(1)),
  $queryRaw: jest.fn(() => Promise.resolve([])),
  
  // Reset function for tests
  $reset: jest.fn(() => {
    // Reset all mock data to initial state
    mockUsers.length = 0
    mockUsers.push(
      {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'user-2',
        email: 'admin@example.com',
        name: 'Admin User',
        image: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
    )
    
    mockOrganizations.length = 0
    mockOrganizations.push(
      {
        id: 'org-1',
        name: 'Test Organization',
        slug: 'test-org',
        subscriptionTier: 'free',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
    )
    
    mockIntegrations.length = 0
    mockIntegrations.push(
      {
        id: 'integration-1',
        organizationId: 'org-1',
        platform: 'shopify',
        platformAccountId: 'test-shop',
        accessToken: 'mock-token',
        refreshToken: null,
        tokenExpiresAt: null,
        status: 'active',
        lastSyncAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }
    )
    
    mockDataPoints.length = 0
    mockInsights.length = 0
    mockOrganizationMembers.length = 0
    
    return Promise.resolve()
  }),
})

// Create and export the mock client
export const prisma = createMockPrismaClient()

// Export mock data for test access
export const mockData = {
  users: mockUsers,
  organizations: mockOrganizations,
  integrations: mockIntegrations,
  dataPoints: mockDataPoints,
  insights: mockInsights,
  organizationMembers: mockOrganizationMembers,
}

// Export helper functions
export const mockHelpers = {
  findById,
  findByField,
  findManyByField,
  applyWhere,
  applyInclude,
}