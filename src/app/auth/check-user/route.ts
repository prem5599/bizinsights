// src/app/api/auth/check-user/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

/**
 * Check user validation schema
 */
const checkUserSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .toLowerCase()
    .max(100, 'Email must be less than 100 characters'),
})

/**
 * POST /api/auth/check-user
 * Check if a user exists with the given email
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Starting user existence check')
    
    // Parse and validate request body
    const body = await request.json()
    console.log('📧 Checking user existence for email:', body.email)
    
    // Validate input data
    const validationResult = checkUserSchema.safeParse(body)
    
    if (!validationResult.success) {
      console.log('❌ Validation failed:', validationResult.error.errors)
      return NextResponse.json(
        { 
          error: 'Invalid input data',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    const { email } = validationResult.data

    // Check if user exists
    console.log('🔍 Checking if user exists in database...')
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { 
        id: true, 
        email: true, 
        name: true,
        password: true, // Check if password is set
        createdAt: true,
        // Get OAuth accounts to check signin methods
        accounts: {
          select: {
            provider: true,
            type: true
          }
        }
      }
    })

    if (!existingUser) {
      console.log('❌ User not found with email:', email)
      return NextResponse.json(
        { 
          exists: false,
          message: 'No account found with this email address',
          suggestedAction: 'signup'
        },
        { status: 404 }
      )
    }

    console.log('✅ User found:', {
      userId: existingUser.id,
      email: existingUser.email,
      hasPassword: !!existingUser.password,
      hasOAuthAccounts: existingUser.accounts.length > 0,
      oauthProviders: existingUser.accounts.map(acc => acc.provider)
    })

    // Determine available signin methods
    const signinMethods = []
    
    if (existingUser.password) {
      signinMethods.push('credentials')
    }
    
    if (existingUser.accounts.length > 0) {
      signinMethods.push(...existingUser.accounts.map(acc => acc.provider))
    }

    // Provide guidance based on account type
    let guidance = 'You can sign in with this email address.'
    let suggestedAction = 'signin'

    if (signinMethods.length === 0) {
      guidance = 'Account exists but no signin method is set up. Please contact support.'
      suggestedAction = 'contact_support'
    } else if (signinMethods.includes('google') && !existingUser.password) {
      guidance = 'This account is linked to Google. Please use "Continue with Google" to sign in.'
      suggestedAction = 'use_google'
    } else if (existingUser.password && !signinMethods.includes('google')) {
      guidance = 'Please sign in with your email and password.'
      suggestedAction = 'use_credentials'
    } else if (signinMethods.length > 1) {
      guidance = 'You can sign in using either your password or Google account.'
      suggestedAction = 'multiple_options'
    }

    return NextResponse.json(
      {
        exists: true,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          createdAt: existingUser.createdAt
        },
        signinMethods: signinMethods,
        guidance: guidance,
        suggestedAction: suggestedAction,
        hasPassword: !!existingUser.password,
        hasOAuthAccounts: existingUser.accounts.length > 0
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ Check user error:', error)

    // Handle database connection errors
    if (error instanceof Error) {
      if (error.message.includes('connect')) {
        console.error('Database connection failed:', error.message)
        return NextResponse.json(
          { error: 'Database connection failed. Please try again later.' },
          { status: 503 }
        )
      }

      if (error.message.includes('timeout')) {
        console.error('Database query timeout:', error.message)
        return NextResponse.json(
          { error: 'Request timeout. Please try again.' },
          { status: 408 }
        )
      }

      // Handle Prisma specific errors
      if (error.message.includes('P2002')) {
        console.error('Unique constraint violation:', error.message)
        return NextResponse.json(
          { error: 'Database constraint error.' },
          { status: 400 }
        )
      }

      // Handle validation errors
      if (error.message.includes('validation')) {
        console.error('Validation error:', error.message)
        return NextResponse.json(
          { error: 'Invalid data provided.' },
          { status: 400 }
        )
      }
    }

    // Generic server error
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/check-user
 * Not allowed - check user is POST only
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to check user existence.' },
    { status: 405 }
  )
}

/**
 * OPTIONS /api/auth/check-user
 * Handle preflight requests for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}