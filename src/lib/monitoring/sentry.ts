// src/lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs'

export function initSentry() {
  if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      
      // Performance monitoring
      tracesSampleRate: 0.1,
      
      // Error filtering
      beforeSend(event, hint) {
        // Filter out common non-critical errors
        if (event.exception) {
          const error = hint.originalException
          if (error instanceof Error) {
            // Skip network errors
            if (error.message.includes('NetworkError') || 
                error.message.includes('fetch')) {
              return null
            }
            // Skip auth errors
            if (error.message.includes('Unauthorized') ||
                error.message.includes('403')) {
              return null
            }
          }
        }
        return event
      },
      
      // Additional context
      initialScope: {
        tags: {
          component: 'bizinsights-backend'
        }
      }
    })
  }
}

// Custom error capture
export function captureError(error: Error, context: Record<string, any> = {}) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.withScope(scope => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value)
      })
      Sentry.captureException(error)
    })
  } else {
    console.error('Error captured:', error, context)
  }
}

