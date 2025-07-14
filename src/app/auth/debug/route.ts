// src/app/api/auth/debug/route.ts
import { NextRequest, NextResponse } from 'next/server'

/**
 * Minimal debug API that just returns basic info
 */
export async function GET(req: NextRequest) {
  console.log('🔧 Debug API called')
  
  try {
    // Super simple response that should always work
    const response = {
      status: 'working',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      message: 'Debug API is responding'
    }

    console.log('✅ Returning response:', response)
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('❌ Debug API error:', error)
    
    return NextResponse.json({
      status: 'error',
      message: 'Debug API failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}