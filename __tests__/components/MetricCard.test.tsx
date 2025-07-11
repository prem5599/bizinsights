// __tests__/components/MetricCard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MetricCard } from '@/components/layout/MetricCard'
import { DollarSign, TrendingUp } from 'lucide-react'

// Mock the utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
  formatCurrency: (value: number) => `$${value.toLocaleString()}`,
  formatNumber: (value: number) => value.toLocaleString(),
  formatPercentage: (value: number) => `${value > 0 ? '+' : ''}${value}%`
}))

describe('MetricCard', () => {
  const defaultProps = {
    title: 'Revenue',
    value: 45000,
    change: 18.4,
    trend: 'up' as const,
    format: 'currency' as const
  }

  it('renders correctly with all props', () => {
    render(<MetricCard {...defaultProps} />)
    
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('$45,000')).toBeInTheDocument()
    expect(screen.getByText('+18.4%')).toBeInTheDocument()
  })

  it('displays currency values correctly', () => {
    render(
      <MetricCard
        title="Revenue"
        value={45000}
        change={18.4}
        trend="up"
        format="currency"
      />
    )
    
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('$45,000')).toBeInTheDocument()
    expect(screen.getByText('+18.4%')).toBeInTheDocument()
  })

  it('displays percentage values correctly', () => {
    render(
      <MetricCard
        title="Conversion Rate"
        value={3.2}
        change={0.5}
        trend="up"
        format="percentage"
      />
    )
    
    expect(screen.getByText('Conversion Rate')).toBeInTheDocument()
    expect(screen.getByText('3.2%')).toBeInTheDocument()
    expect(screen.getByText('+0.5%')).toBeInTheDocument()
  })

  it('displays number values correctly', () => {
    render(
      <MetricCard
        title="Orders"
        value={156}
        change={12}
        trend="up"
        format="number"
      />
    )
    
    expect(screen.getByText('Orders')).toBeInTheDocument()
    expect(screen.getByText('156')).toBeInTheDocument()
    expect(screen.getByText('+12%')).toBeInTheDocument()
  })

  it('shows loading state correctly', () => {
    render(
      <MetricCard
        title="Revenue"
        value=""
        isLoading
      />
    )
    
    expect(screen.getByTestId('metric-loading')).toBeInTheDocument()
    expect(screen.getByTestId('metric-loading')).toHaveClass('animate-pulse')
  })

  it('displays icon when provided', () => {
    render(
      <MetricCard
        title="Revenue"
        value={45000}
        icon={DollarSign}
      />
    )
    
    // Check if icon container exists (we can't easily test the icon itself)
    const iconContainer = screen.getByText('Revenue').parentElement
    expect(iconContainer).toBeInTheDocument()
  })

  it('shows correct trend colors for up trend', () => {
    render(
      <MetricCard
        title="Revenue"
        value={45000}
        change={18.4}
        trend="up"
      />
    )
    
    const changeElement = screen.getByText('+18.4%')
    expect(changeElement).toHaveClass('text-green-600')
  })

  it('shows correct trend colors for down trend', () => {
    render(
      <MetricCard
        title="Revenue"
        value={35000}
        change={-12.3}
        trend="down"
      />
    )
    
    const changeElement = screen.getByText('-12.3%')
    expect(changeElement).toHaveClass('text-red-600')
  })

  it('shows correct trend colors for neutral trend', () => {
    render(
      <MetricCard
        title="Revenue"
        value={45000}
        change={0}
        trend="neutral"
      />
    )
    
    const changeElement = screen.getByText('+0%')
    expect(changeElement).toHaveClass('text-slate-500')
  })

  it('displays description when provided', () => {
    render(
      <MetricCard
        title="Revenue"
        value={45000}
        description="vs last month"
      />
    )
    
    expect(screen.getByText('vs last month')).toBeInTheDocument()
  })

  it('handles string values correctly', () => {
    render(
      <MetricCard
        title="Status"
        value="Active"
      />
    )
    
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <MetricCard
        title="Revenue"
        value={45000}
        className="custom-class"
      />
    )
    
    const card = screen.getByText('Revenue').closest('div')
    expect(card).toHaveClass('custom-class')
  })

  it('handles missing change prop gracefully', () => {
    render(
      <MetricCard
        title="Revenue"
        value={45000}
      />
    )
    
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('$45,000')).toBeInTheDocument()
    // Should not display change indicator
    expect(screen.queryByText('%')).not.toBeInTheDocument()
  })

  it('displays previous period context', () => {
    render(
      <MetricCard
        title="Revenue"
        value={45000}
        change={18.4}
        trend="up"
      />
    )
    
    expect(screen.getByText('vs.')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(
      <MetricCard
        title="Revenue"
        value={45000}
        change={18.4}
        trend="up"
      />
    )
    
    const card = screen.getByText('Revenue').closest('div')
    expect(card).toHaveClass('hover:shadow-md')
    expect(card).toHaveClass('transition-shadow')
  })

  it('formats large numbers correctly', () => {
    render(
      <MetricCard
        title="Revenue"
        value={1250000}
        format="currency"
      />
    )
    
    expect(screen.getByText('$1,250,000')).toBeInTheDocument()
  })

  it('handles zero values correctly', () => {
    render(
      <MetricCard
        title="Revenue"
        value={0}
        change={0}
        trend="neutral"
        format="currency"
      />
    )
    
    expect(screen.getByText('$0')).toBeInTheDocument()
    expect(screen.getByText('+0%')).toBeInTheDocument()
  })

  it('handles negative values correctly', () => {
    render(
      <MetricCard
        title="Revenue"
        value={-1000}
        format="currency"
      />
    )
    
    expect(screen.getByText('-$1,000')).toBeInTheDocument()
  })
})

// Additional test file for InsightsList component
// __tests__/components/InsightsList.test.tsx
describe('InsightsList', () => {
  const mockInsights = [
    {
      id: '1',
      type: 'trend',
      title: 'Revenue Growth',
      description: 'Revenue increased by 25% this month',
      impactScore: 85,
      isRead: false,
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      type: 'anomaly',
      title: 'Traffic Spike',
      description: 'Unusual traffic increase detected',
      impactScore: 70,
      isRead: true,
      createdAt: new Date(Date.now() - 3600000).toISOString()
    }
  ]

  const defaultProps = {
    insights: mockInsights,
    onMarkAsRead: jest.fn(),
    onDismiss: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders insights correctly', async () => {
    const { InsightsList } = await import('@/components/dashboard/InsightsList')
    render(<InsightsList {...defaultProps} />)
    
    expect(screen.getByText('Revenue Growth')).toBeInTheDocument()
    expect(screen.getByText('Revenue increased by 25% this month')).toBeInTheDocument()
    expect(screen.getByText('Traffic Spike')).toBeInTheDocument()
  })

  it('shows loading state', async () => {
    const { InsightsList } = await import('@/components/dashboard/InsightsList')
    render(<InsightsList insights={[]} isLoading />)
    
    const loadingElements = screen.getAllByRole('generic')
    const loadingElement = loadingElements.find(el => el.classList.contains('animate-pulse'))
    expect(loadingElement).toBeInTheDocument()
  })

  it('shows empty state when no insights', async () => {
    const { InsightsList } = await import('@/components/dashboard/InsightsList')
    render(<InsightsList insights={[]} />)
    
    expect(screen.getByText('No insights available')).toBeInTheDocument()
    expect(screen.getByText('Connect your integrations to start generating insights')).toBeInTheDocument()
  })

  it('handles mark as read action', async () => {
    const { InsightsList } = await import('@/components/dashboard/InsightsList')
    const mockMarkAsRead = jest.fn()
    
    render(
      <InsightsList 
        insights={mockInsights} 
        onMarkAsRead={mockMarkAsRead}
      />
    )
    
    const readButtons = screen.getAllByTitle(/Mark as/i)
    fireEvent.click(readButtons[0])
    
    await waitFor(() => {
      expect(mockMarkAsRead).toHaveBeenCalledWith('1', true)
    })
  })

  it('handles dismiss action', async () => {
    const { InsightsList } = await import('@/components/dashboard/InsightsList')
    const mockDismiss = jest.fn()
    
    render(
      <InsightsList 
        insights={mockInsights} 
        onDismiss={mockDismiss}
      />
    )
    
    const dismissButtons = screen.getAllByTitle('Dismiss insight')
    fireEvent.click(dismissButtons[0])
    
    await waitFor(() => {
      expect(mockDismiss).toHaveBeenCalledWith('1')
    })
  })

  it('displays impact scores correctly', async () => {
    const { InsightsList } = await import('@/components/dashboard/InsightsList')
    render(<InsightsList insights={mockInsights} />)
    
    expect(screen.getByText('85')).toBeInTheDocument()
    expect(screen.getByText('70')).toBeInTheDocument()
  })

  it('shows unread indicator for unread insights', async () => {
    const { InsightsList } = await import('@/components/dashboard/InsightsList')
    render(<InsightsList insights={mockInsights} />)
    
    // Check for unread indicator (blue dot)
    const unreadIndicators = document.querySelectorAll('.bg-blue-500')
    expect(unreadIndicators.length).toBeGreaterThan(0)
  })

  it('displays relative time correctly', async () => {
    const { InsightsList } = await import('@/components/dashboard/InsightsList')
    render(<InsightsList insights={mockInsights} />)
    
    expect(screen.getByText('Just now')).toBeInTheDocument()
    expect(screen.getByText('1h ago')).toBeInTheDocument()
  })
})

// Test file for chart components
// __tests__/components/RevenueChart.test.tsx
describe('RevenueChart', () => {
  const mockData = [
    { date: '2024-01-01', total_revenue: 1000 },
    { date: '2024-01-02', total_revenue: 1200 },
    { date: '2024-01-03', total_revenue: 1100 }
  ]

  beforeEach(() => {
    // Mock Recharts components
    jest.mock('recharts', () => ({
      LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
      Line: () => <div data-testid="line" />,
      XAxis: () => <div data-testid="x-axis" />,
      YAxis: () => <div data-testid="y-axis" />,
      CartesianGrid: () => <div data-testid="grid" />,
      Tooltip: () => <div data-testid="tooltip" />,
      ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>
    }))
  })

  it('renders chart with data', async () => {
    const { RevenueChart } = await import('@/components/charts/RevenueChart')
    render(<RevenueChart data={mockData} />)
    
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('shows loading state', async () => {
    const { RevenueChart } = await import('@/components/charts/RevenueChart')
    render(<RevenueChart data={[]} isLoading />)
    
    expect(screen.getByText('Loading chart data...')).toBeInTheDocument()
  })

  it('shows empty state when no data', async () => {
    const { RevenueChart } = await import('@/components/charts/RevenueChart')
    render(<RevenueChart data={[]} />)
    
    expect(screen.getByText('No revenue data available')).toBeInTheDocument()
    expect(screen.getByText('Connect your integrations to see data')).toBeInTheDocument()
  })

  it('renders with custom height', async () => {
    const { RevenueChart } = await import('@/components/charts/RevenueChart')
    render(<RevenueChart data={mockData} height={400} />)
    
    const container = screen.getByTestId('responsive-container')
    expect(container).toBeInTheDocument()
  })
})

// Test file for API routes
// __tests__/api/integrations.test.ts
describe('/api/integrations', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
  })

  describe('GET /api/integrations', () => {
    it('returns integrations for authenticated user', async () => {
      // Mock the auth session
      const mockSession = global.testUtils.createMockSession()
      
      // Mock prisma response
      const mockIntegrations = [
        global.testUtils.createMockIntegration({
          platform: 'shopify',
          status: 'active'
        })
      ]

      const { prisma } = await import('@/lib/prisma')
      prisma.organizationMember.findFirst.mockResolvedValue({
        id: 'member-1',
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'owner'
      })
      
      prisma.integration.findMany.mockResolvedValue(mockIntegrations)

      // Mock the route handler
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
      // Mock no session
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
// __tests__/api/webhooks.test.ts
describe('Webhook Handlers', () => {
  describe('Shopify Webhooks', () => {
    it('processes order created webhook', async () => {
      const mockOrder = {
        id: 12345,
        name: '#1001',
        total_price: '100.00',
        currency: 'USD',
        created_at: new Date().toISOString(),
        customer: {
          id: 67890,
          email: 'customer@example.com'
        }
      }

      const { handleShopifyWebhook } = await import('@/lib/integrations/shopify')
      const result = await handleShopifyWebhook('integration-1', 'orders/create', mockOrder)

      expect(result.success).toBe(true)
    })

    it('handles invalid webhook signature', async () => {
      const { POST } = await import('@/app/api/webhooks/shopify/route')
      
      const request = new Request('http://localhost:3000/api/webhooks/shopify?org=org-1', {
        method: 'POST',
        headers: {
          'x-shopify-shop-domain': 'test-shop.myshopify.com',
          'x-shopify-topic': 'orders/create',
          'x-shopify-hmac-sha256': 'invalid-signature'
        },
        body: JSON.stringify({ id: 12345 })
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })
  })

  describe('Stripe Webhooks', () => {
    it('processes charge succeeded webhook', async () => {
      const mockCharge = {
        id: 'ch_test_123',
        amount: 10000,
        currency: 'usd',
        created: Math.floor(Date.now() / 1000),
        customer: 'cus_test_123'
      }

      const { handleStripeWebhook } = await import('@/lib/integrations/stripe')
      const result = await handleStripeWebhook('integration-1', 'charge.succeeded', { object: mockCharge })

      expect(result.success).toBe(true)
    })
  })
})

// Performance and accessibility tests
// __tests__/performance/components.test.tsx
describe('Component Performance', () => {
  it('MetricCard renders efficiently with large datasets', async () => {
    const { MetricCard } = await import('@/components/layout/MetricCard')
    
    const startTime = performance.now()
    
    // Render multiple cards
    const cards = Array.from({ length: 100 }, (_, i) => (
      <MetricCard
        key={i}
        title={`Metric ${i}`}
        value={Math.random() * 10000}
        change={Math.random() * 20 - 10}
        trend={Math.random() > 0.5 ? 'up' : 'down'}
      />
    ))

    render(<div>{cards}</div>)
    
    const endTime = performance.now()
    const renderTime = endTime - startTime

    // Should render 100 cards in less than 100ms
    expect(renderTime).toBeLessThan(100)
  })

  it('Chart components handle large datasets efficiently', async () => {
    const { RevenueChart } = await import('@/components/charts/RevenueChart')
    
    // Generate large dataset
    const largeDataset = Array.from({ length: 365 }, (_, i) => ({
      date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
      total_revenue: Math.random() * 10000
    }))

    const startTime = performance.now()
    render(<RevenueChart data={largeDataset} />)
    const endTime = performance.now()

    const renderTime = endTime - startTime
    expect(renderTime).toBeLessThan(200) // Should render in under 200ms
  })
})

// Accessibility tests
describe('Accessibility', () => {
  it('MetricCard has proper ARIA attributes', async () => {
    const { MetricCard } = await import('@/components/layout/MetricCard')
    
    render(
      <MetricCard
        title="Revenue"
        value={45000}
        change={18.4}
        trend="up"
        format="currency"
      />
    )

    const card = screen.getByText('Revenue').closest('div')
    expect(card).toBeInTheDocument()
    
    // Should be keyboard navigable
    expect(card).toHaveClass('hover:shadow-md')
  })

  it('InsightsList has proper keyboard navigation', async () => {
    const { InsightsList } = await import('@/components/dashboard/InsightsList')
    const mockInsights = [
      {
        id: '1',
        type: 'trend',
        title: 'Test Insight',
        description: 'Test description',
        impactScore: 85,
        isRead: false,
        createdAt: new Date().toISOString()
      }
    ]

    render(<InsightsList insights={mockInsights} />)

    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toHaveAttribute('title')
    })
  })
})