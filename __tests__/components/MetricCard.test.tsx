// __tests__/components/MetricCard.test.tsx
import { render, screen } from '@testing-library/react'
import { MetricCard } from '@/components/dashboard/MetricsCards'

// Test data factory - create only what we need for each test
const createMockMetric = (overrides = {}) => ({
  id: 'test-metric',
  title: 'Test Metric',
  value: 100,
  format: 'number',
  trend: { direction: 'up', percentage: 10 },
  ...overrides,
})

describe('MetricCard', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
  })

  it('renders metric title and value', () => {
    const metric = createMockMetric({
      title: 'Revenue',
      value: 1500,
      format: 'currency'
    })

    render(<MetricCard metric={metric} />)
    
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('$1,500')).toBeInTheDocument()
  })

  it('displays trend indicator when trend is provided', () => {
    const metric = createMockMetric({
      trend: { direction: 'up', percentage: 25 }
    })

    render(<MetricCard metric={metric} />)
    
    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.getByTestId('trend-up-icon')).toBeInTheDocument()
  })

  it('handles loading state', () => {
    render(<MetricCard loading={true} />)
    
    expect(screen.getByTestId('metric-skeleton')).toBeInTheDocument()
  })

  it('handles error state', () => {
    render(<MetricCard error="Failed to load" />)
    
    expect(screen.getByText('Failed to load')).toBeInTheDocument()
  })
})

// Test file for API routes
describe('/api/integrations', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
  })

  describe('GET /api/integrations', () => {
    it('returns integrations for authenticated user', async () => {
      // Create test data only for this specific test
      const mockSession = global.testUtils.createMockSession()
      const mockIntegration = global.testUtils.createMockIntegration({
        platform: 'shopify',
        status: 'active'
      })

      const { prisma } = await import('@/lib/prisma')
      prisma.organizationMember.findFirst.mockResolvedValue({
        id: 'member-1',
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'owner'
      })
      
      prisma.integration.findMany.mockResolvedValue([mockIntegration])

      const { GET } = await import('@/app/api/integrations/route')
      const request = new Request('http://localhost:3000/api/integrations?orgId=org-1')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('integrations')
      expect(data.integrations).toHaveLength(1)
      expect(data.integrations[0].platform).toBe('shopify')
    })

    it('returns 401 for unauthenticated user', async () => {
      // Mock no session for this test
      jest.doMock('next-auth', () => ({
        getServerSession: jest.fn().mockResolvedValue(null)
      }))

      const { GET } = await import('@/app/api/integrations/route')
      const request = new Request('http://localhost:3000/api/integrations?orgId=org-1')
      
      const response = await GET(request)
      
      expect(response.status).toBe(401)
    })

    it('returns 400 when orgId is missing', async () => {
      const { GET } = await import('@/app/api/integrations/route')
      const request = new Request('http://localhost:3000/api/integrations')
      
      const response = await GET(request)
      
      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/integrations', () => {
    it('creates new integration successfully', async () => {
      const mockSession = global.testUtils.createMockSession()
      
      const { prisma } = await import('@/lib/prisma')
      prisma.organizationMember.findFirst.mockResolvedValue({
        id: 'member-1',
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'admin'
      })
      
      prisma.integration.findUnique.mockResolvedValue(null) // No existing integration
      
      const newIntegration = global.testUtils.createMockIntegration()
      prisma.integration.create.mockResolvedValue(newIntegration)

      const { POST } = await import('@/app/api/integrations/route')
      const request = new Request('http://localhost:3000/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: 'org-1',
          platform: 'shopify',
          accessToken: 'test-token',
          platformAccountId: 'test-shop'
        })
      })
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toHaveProperty('integration')
      expect(data.message).toBe('Integration created successfully')
    })

    it('returns 409 when integration already exists', async () => {
      const { prisma } = await import('@/lib/prisma')
      const existingIntegration = global.testUtils.createMockIntegration()
      prisma.integration.findUnique.mockResolvedValue(existingIntegration)

      const { POST } = await import('@/app/api/integrations/route')
      const request = new Request('http://localhost:3000/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: 'org-1',
          platform: 'shopify',
          accessToken: 'test-token'
        })
      })
      
      const response = await POST(request)

      expect(response.status).toBe(409)
    })
  })
})

// Test file for webhook handlers  
describe('Webhook Handlers', () => {
  describe('Shopify Webhooks', () => {
    it('processes order creation webhook', async () => {
      const mockOrder = {
        id: 12345,
        total_price: '100.00',
        currency: 'USD',
        created_at: '2024-01-01T00:00:00Z'
      }

      const { prisma } = await import('@/lib/prisma')
      prisma.integration.findFirst.mockResolvedValue(
        global.testUtils.createMockIntegration({ platform: 'shopify' })
      )
      
      prisma.dataPoint.create.mockResolvedValue(
        global.testUtils.createMockDataPoint({ 
          metricType: 'revenue',
          value: 100.00 
        })
      )

      const { POST } = await import('@/app/api/webhooks/shopify/route')
      const request = new Request('http://localhost:3000/api/webhooks/shopify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Shopify-Topic': 'orders/create',
          'X-Shopify-Hmac-Sha256': 'test-hmac'
        },
        body: JSON.stringify(mockOrder)
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(prisma.dataPoint.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metricType: 'revenue',
          value: 100.00
        })
      })
    })
  })
})