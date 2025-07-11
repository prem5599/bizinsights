// jest.setup.js
import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'
import { setLogger } from 'react-query'

// Configure React Testing Library
configure({
  // Increase timeout for async operations
  asyncUtilTimeout: 5000,
  
  // Custom test ID attribute
  testIdAttribute: 'data-testid',
  
  // Disable automatic cleanup (we'll handle it manually)
  asyncWrapper: async (cb) => {
    let result
    await cb(() => {
      result = cb()
    })
    return result
  }
})

// Suppress React Query errors in tests
setLogger({
  log: console.log,
  warn: console.warn,
  error: () => {}, // Suppress error logs
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(cb) {
    this.cb = cb
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    hostname: 'localhost',
    port: '3000',
    protocol: 'http:',
    pathname: '/',
    search: '',
    hash: '',
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
  },
  writable: true,
})

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true,
})

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Headers(),
    url: '',
    redirected: false,
    type: 'basic',
    clone: jest.fn(),
  })
)

// Mock crypto for Node.js environment
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    subtle: {
      digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
    },
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }),
  },
})

// Mock Environment Variables
process.env.NODE_ENV = 'test'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.SHOPIFY_WEBHOOK_SECRET = 'test-shopify-secret'
process.env.STRIPE_WEBHOOK_SECRET = 'test-stripe-secret'

// Global test utilities
global.testUtils = {
  // Helper to create mock user session
  createMockSession: (overrides = {}) => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
      ...overrides.user,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  }),

  // Helper to create mock organization
  createMockOrganization: (overrides = {}) => ({
    id: 'test-org-id',
    name: 'Test Organization',
    slug: 'test-org',
    subscriptionTier: 'free',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  // Helper to create mock integration
  createMockIntegration: (overrides = {}) => ({
    id: 'test-integration-id',
    organizationId: 'test-org-id',
    platform: 'shopify',
    platformAccountId: 'test-shop',
    status: 'active',
    lastSyncAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  // Helper to create mock dashboard data
  createMockDashboardData: (overrides = {}) => ({
    metrics: {
      revenue: { current: 10000, previous: 8000, change: 25, trend: 'up' },
      orders: { current: 150, previous: 120, change: 25, trend: 'up' },
      sessions: { current: 5000, previous: 4500, change: 11.1, trend: 'up' },
      customers: { current: 75, previous: 60, change: 25, trend: 'up' },
      conversion: { current: 3.0, previous: 2.7, change: 11.1, trend: 'up' },
      aov: { current: 66.67, previous: 66.67, change: 0, trend: 'neutral' },
    },
    charts: {
      revenue_trend: [
        { date: '2024-01-01', total_revenue: 1000 },
        { date: '2024-01-02', total_revenue: 1200 },
        { date: '2024-01-03', total_revenue: 1100 },
      ],
      traffic_sources: [
        { source: 'Direct', sessions: 2000, percentage: 40 },
        { source: 'Google', sessions: 1500, percentage: 30 },
        { source: 'Social', sessions: 1000, percentage: 20 },
        { source: 'Email', sessions: 500, percentage: 10 },
      ],
    },
    insights: [
      {
        id: 'test-insight-1',
        type: 'trend',
        title: 'Revenue Growth',
        description: 'Revenue increased by 25% this month',
        impactScore: 85,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ],
    integrations: [
      {
        id: 'test-integration-1',
        platform: 'shopify',
        status: 'connected',
        lastSyncAt: new Date().toISOString(),
      },
    ],
    hasRealData: false,
    ...overrides,
  }),

  // Helper to wait for async operations
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to simulate user events
  fireEvent: async (element, event, options = {}) => {
    const { fireEvent } = await import('@testing-library/react')
    return fireEvent[event](element, options)
  },

  // Helper to render components with providers
  renderWithProviders: async (ui, options = {}) => {
    const { render } = await import('@testing-library/react')
    const { SessionProvider } = await import('next-auth/react')
    const { QueryClient, QueryClientProvider } = await import('react-query')
    
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    const AllTheProviders = ({ children }) => {
      return (
        <QueryClientProvider client={queryClient}>
          <SessionProvider session={options.session}>
            {children}
          </SessionProvider>
        </QueryClientProvider>
      )
    }

    return render(ui, { wrapper: AllTheProviders, ...options })
  },
}

// Custom Jest matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      }
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      }
    }
  },

  toHaveValidMetrics(received) {
    const requiredMetrics = ['revenue', 'orders', 'sessions', 'customers', 'conversion', 'aov']
    const hasAllMetrics = requiredMetrics.every(metric => 
      received.metrics && 
      received.metrics[metric] && 
      typeof received.metrics[metric].current === 'number'
    )

    if (hasAllMetrics) {
      return {
        message: () => `expected metrics to be invalid`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected metrics to have all required fields: ${requiredMetrics.join(', ')}`,
        pass: false,
      }
    }
  },

  toBeValidApiResponse(received) {
    const isValid = received && 
      typeof received === 'object' && 
      !received.error &&
      received.success !== false

    if (isValid) {
      return {
        message: () => `expected API response to be invalid`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected valid API response, got: ${JSON.stringify(received)}`,
        pass: false,
      }
    }
  },
})

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// Suppress specific console warnings in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
       args[0].includes('Warning: Each child in a list should have a unique "key" prop') ||
       args[0].includes('Warning: Failed prop type'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks()
  
  // Reset fetch mock
  if (global.fetch && global.fetch.mockClear) {
    global.fetch.mockClear()
  }
  
  // Clean up DOM
  document.body.innerHTML = ''
  
  // Reset any global state
  delete window.location
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000',
      hostname: 'localhost',
      port: '3000',
      protocol: 'http:',
      pathname: '/',
      search: '',
      hash: '',
      assign: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
    },
    writable: true,
  })
})

// Global setup for all tests
beforeAll(() => {
  // Set up global test environment
  console.log('🧪 Jest test environment initialized')
})