// lib/dashboard/settings.ts
import { prisma } from '@/lib/prisma'

export interface DashboardWidget {
  id: string
  type: 'metric' | 'chart' | 'insight' | 'custom'
  title: string
  size: 'small' | 'medium' | 'large' | 'full'
  position: { x: number; y: number; w: number; h: number }
  config: Record<string, any>
  visible: boolean
}

export interface DashboardLayout {
  id: string
  organizationId: string
  userId: string
  name: string
  isDefault: boolean
  widgets: DashboardWidget[]
  settings: {
    theme: 'light' | 'dark' | 'auto'
    refreshInterval: number // minutes
    timezone: string
    currency: string
    dateFormat: string
    notifications: {
      email: boolean
      browser: boolean
      insights: boolean
      reports: boolean
    }
  }
  createdAt: Date
  updatedAt: Date
}

export interface DashboardPreferences {
  defaultMetrics: string[]
  hiddenMetrics: string[]
  chartTypes: Record<string, 'line' | 'bar' | 'pie' | 'area'>
  colorScheme: 'blue' | 'green' | 'purple' | 'orange' | 'custom'
  compactMode: boolean
  showTrends: boolean
  showComparisons: boolean
  autoRefresh: boolean
}

export class DashboardSettings {
  /**
   * Get user's dashboard layout
   */
  static async getUserDashboard(
    organizationId: string,
    userId: string
  ): Promise<DashboardLayout | null> {
    try {
      // Try to get user's custom layout first
      let layout = await prisma.$queryRaw`
        SELECT * FROM "DashboardLayout" 
        WHERE "organizationId" = ${organizationId} 
        AND "userId" = ${userId}
        ORDER BY "isDefault" DESC, "updatedAt" DESC
        LIMIT 1
      ` as DashboardLayout[]

      if (layout.length === 0) {
        // Create default layout for user
        return this.createDefaultDashboard(organizationId, userId)
      }

      return layout[0]
    } catch (error) {
      console.error('Failed to get user dashboard:', error)
      return null
    }
  }

  /**
   * Create default dashboard layout
   */
  static async createDefaultDashboard(
    organizationId: string,
    userId: string
  ): Promise<DashboardLayout> {
    const defaultWidgets: DashboardWidget[] = [
      {
        id: 'revenue-metric',
        type: 'metric',
        title: 'Total Revenue',
        size: 'medium',
        position: { x: 0, y: 0, w: 3, h: 2 },
        config: { metricType: 'revenue', format: 'currency' },
        visible: true
      },
      {
        id: 'orders-metric',
        type: 'metric',
        title: 'Orders',
        size: 'medium',
        position: { x: 3, y: 0, w: 3, h: 2 },
        config: { metricType: 'orders', format: 'number' },
        visible: true
      },
      {
        id: 'sessions-metric',
        type: 'metric',
        title: 'Sessions',
        size: 'medium',
        position: { x: 6, y: 0, w: 3, h: 2 },
        config: { metricType: 'sessions', format: 'number' },
        visible: true
      },
      {
        id: 'conversion-metric',
        type: 'metric',
        title: 'Conversion Rate',
        size: 'medium',
        position: { x: 9, y: 0, w: 3, h: 2 },
        config: { metricType: 'conversion', format: 'percentage' },
        visible: true
      },
      {
        id: 'revenue-chart',
        type: 'chart',
        title: 'Revenue Trend',
        size: 'large',
        position: { x: 0, y: 2, w: 6, h: 4 },
        config: { chartType: 'line', metricType: 'revenue', period: '30d' },
        visible: true
      },
      {
        id: 'insights-widget',
        type: 'insight',
        title: 'AI Insights',
        size: 'large',
        position: { x: 6, y: 2, w: 6, h: 4 },
        config: { maxInsights: 5, showUnreadOnly: false },
        visible: true
      }
    ]

    const defaultLayout: DashboardLayout = {
      id: crypto.randomUUID(),
      organizationId,
      userId,
      name: 'Default Dashboard',
      isDefault: true,
      widgets: defaultWidgets,
      settings: {
        theme: 'light',
        refreshInterval: 5,
        timezone: 'UTC',
        currency: 'USD',
        dateFormat: 'MM/dd/yyyy',
        notifications: {
          email: true,
          browser: true,
          insights: true,
          reports: false
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // In a real implementation, this would be stored in a DashboardLayout table
    // For now, we'll return the default layout
    return defaultLayout
  }

  /**
   * Update dashboard layout
   */
  static async updateDashboardLayout(
    layoutId: string,
    updates: Partial<DashboardLayout>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // In a real implementation, update the database
      console.log('Updating dashboard layout:', layoutId, updates)
      return { success: true }
    } catch (error) {
      console.error('Failed to update dashboard layout:', error)
      return { success: false, error: 'Failed to update dashboard' }
    }
  }

  /**
   * Add widget to dashboard
   */
  static async addWidget(
    layoutId: string,
    widget: Omit<DashboardWidget, 'id'>
  ): Promise<{ success: boolean; widget?: DashboardWidget; error?: string }> {
    try {
      const newWidget: DashboardWidget = {
        id: crypto.randomUUID(),
        ...widget
      }

      // In real implementation, add to database
      console.log('Adding widget to dashboard:', layoutId, newWidget)
      
      return { success: true, widget: newWidget }
    } catch (error) {
      console.error('Failed to add widget:', error)
      return { success: false, error: 'Failed to add widget' }
    }
  }

  /**
   * Remove widget from dashboard
   */
  static async removeWidget(
    layoutId: string,
    widgetId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // In real implementation, remove from database
      console.log('Removing widget from dashboard:', layoutId, widgetId)
      return { success: true }
    } catch (error) {
      console.error('Failed to remove widget:', error)
      return { success: false, error: 'Failed to remove widget' }
    }
  }

  /**
   * Update widget configuration
   */
  static async updateWidget(
    layoutId: string,
    widgetId: string,
    updates: Partial<DashboardWidget>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // In real implementation, update in database
      console.log('Updating widget:', layoutId, widgetId, updates)
      return { success: true }
    } catch (error) {
      console.error('Failed to update widget:', error)
      return { success: false, error: 'Failed to update widget' }
    }
  }

  /**
   * Get dashboard preferences
   */
  static async getDashboardPreferences(
    organizationId: string,
    userId: string
  ): Promise<DashboardPreferences> {
    // Default preferences
    return {
      defaultMetrics: ['revenue', 'orders', 'sessions', 'conversion'],
      hiddenMetrics: [],
      chartTypes: {
        revenue: 'line',
        orders: 'bar',
        sessions: 'area',
        conversion: 'line'
      },
      colorScheme: 'blue',
      compactMode: false,
      showTrends: true,
      showComparisons: true,
      autoRefresh: true
    }
  }

  /**
   * Update dashboard preferences
   */
  static async updateDashboardPreferences(
    organizationId: string,
    userId: string,
    preferences: Partial<DashboardPreferences>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // In real implementation, store in database
      console.log('Updating dashboard preferences:', organizationId, userId, preferences)
      return { success: true }
    } catch (error) {
      console.error('Failed to update preferences:', error)
      return { success: false, error: 'Failed to update preferences' }
    }
  }

  /**
   * Export dashboard configuration
   */
  static async exportDashboard(layoutId: string): Promise<string> {
    try {
      // Get dashboard layout
      const layout = { /* fetch from database */ }
      return JSON.stringify(layout, null, 2)
    } catch (error) {
      console.error('Failed to export dashboard:', error)
      throw new Error('Failed to export dashboard')
    }
  }

  /**
   * Import dashboard configuration
   */
  static async importDashboard(
    organizationId: string,
    userId: string,
    configJson: string
  ): Promise<{ success: boolean; layout?: DashboardLayout; error?: string }> {
    try {
      const config = JSON.parse(configJson)
      
      // Validate configuration
      if (!config.widgets || !Array.isArray(config.widgets)) {
        return { success: false, error: 'Invalid dashboard configuration' }
      }

      // Create new layout with imported config
      const layout: DashboardLayout = {
        id: crypto.randomUUID(),
        organizationId,
        userId,
        name: config.name || 'Imported Dashboard',
        isDefault: false,
        widgets: config.widgets,
        settings: config.settings || {},
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // In real implementation, save to database
      console.log('Importing dashboard:', layout)
      
      return { success: true, layout }
    } catch (error) {
      console.error('Failed to import dashboard:', error)
      return { success: false, error: 'Failed to import dashboard configuration' }
    }
  }

  /**
   * Get available widget types
   */
  static getAvailableWidgets(): Array<{
    type: string
    name: string
    description: string
    defaultSize: string
    configOptions: Record<string, any>
  }> {
    return [
      {
        type: 'metric',
        name: 'Metric Card',
        description: 'Display a single key metric with trend information',
        defaultSize: 'medium',
        configOptions: {
          metricType: ['revenue', 'orders', 'sessions', 'customers', 'conversion', 'aov'],
          format: ['currency', 'number', 'percentage'],
          showTrend: [true, false],
          showChange: [true, false]
        }
      },
      {
        type: 'chart',
        name: 'Chart Widget',
        description: 'Visualize data trends with various chart types',
        defaultSize: 'large',
        configOptions: {
          chartType: ['line', 'bar', 'area', 'pie'],
          metricType: ['revenue', 'orders', 'sessions', 'customers'],
          period: ['7d', '30d', '90d', '1y'],
          showGrid: [true, false],
          showLabels: [true, false]
        }
      },
      {
        type: 'insight',
        name: 'AI Insights',
        description: 'Display AI-generated business insights and recommendations',
        defaultSize: 'large',
        configOptions: {
          maxInsights: [3, 5, 10],
          showUnreadOnly: [true, false],
          categories: ['all', 'revenue', 'customers', 'performance', 'growth']
        }
      },
      {
        type: 'custom',
        name: 'Custom Widget',
        description: 'Create a custom widget with your own content',
        defaultSize: 'medium',
        configOptions: {
          content: 'html',
          refreshInterval: [0, 5, 15, 30, 60]
        }
      }
    ]
  }
}