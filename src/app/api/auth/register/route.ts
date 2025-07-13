// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

/**
 * User registration validation schema
 */
const registerSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  
  email: z.string()
    .email('Please enter a valid email address')
    .toLowerCase()
    .max(100, 'Email must be less than 100 characters'),
  
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  organizationName: z.string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters')
    .optional(),
  
  acceptTerms: z.boolean()
    .refine(val => val === true, 'You must accept the terms and conditions')
    .optional()
})

/**
 * POST /api/auth/register
 * Create a new user account with organization
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Starting user registration process')
    
    // Parse and validate request body
    const body = await request.json()
    console.log('📧 Registration attempt for email:', body.email)
    
    // Validate input data
    const validationResult = registerSchema.safeParse(body)
    
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

    const { name, email, password, organizationName } = validationResult.data

    // Check if user already exists
    console.log('🔍 Checking if user already exists...')
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true }
    })

    if (existingUser) {
      console.log('❌ User already exists with email:', email)
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    console.log('🔒 Hashing password...')
    const saltRounds = 12
    const hashedPassword = await hash(password, saltRounds)

    // Generate organization slug from name or email
    const generateSlug = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50)
    }

    const baseOrgName = organizationName || name.split(' ')[0] + "'s Business"
    let orgSlug = generateSlug(baseOrgName)
    
    // Ensure unique organization slug
    console.log('🏢 Generating unique organization slug...')
    let slugCounter = 1
    let finalOrgSlug = orgSlug
    
    while (await prisma.organization.findUnique({ where: { slug: finalOrgSlug } })) {
      finalOrgSlug = `${orgSlug}-${slugCounter}`
      slugCounter++
    }

    // Create user and organization in transaction
    console.log('💾 Creating user and organization in database...')
    const result = await prisma.$transaction(async (tx) => {
      // Create the user
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true
        }
      })

      // Create default organization
      const organization = await tx.organization.create({
        data: {
          name: organizationName || baseOrgName,
          slug: finalOrgSlug,
          subscriptionTier: 'free'
        },
        select: {
          id: true,
          name: true,
          slug: true,
          subscriptionTier: true
        }
      })

      // Add user as owner of the organization
      await tx.organizationMember.create({
        data: {
          userId: newUser.id,
          organizationId: organization.id,
          role: 'owner'
        }
      })

      return { user: newUser, organization }
    })

    console.log('✅ User registration successful:', {
      userId: result.user.id,
      email: result.user.email,
      organizationId: result.organization.id,
      organizationSlug: result.organization.slug
    })

    // Log registration event (for analytics/monitoring)
    await logRegistrationEvent(result.user.id, {
      email,
      organizationSlug: result.organization.slug,
      registrationMethod: 'email',
      userAgent: request.headers.get('user-agent') || 'unknown',
      ipAddress: getClientIP(request)
    })

    // Return success response (excluding sensitive data)
    return NextResponse.json(
      {
        message: 'Account created successfully',
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email
        },
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          slug: result.organization.slug
        },
        nextStep: 'signin'
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('💥 Registration error:', error)
    
    // Handle specific database errors
    if (error instanceof Error) {
      // Prisma unique constraint error
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      }
      
      // Database connection error
      if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { error: 'Database connection error. Please try again later.' },
          { status: 503 }
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
 * Helper function to log registration events
 */
async function logRegistrationEvent(userId: string, metadata: {
  email: string
  organizationSlug: string
  registrationMethod: string
  userAgent: string
  ipAddress: string
}) {
  try {
    // You can extend this to log to external services like PostHog, Mixpanel, etc.
    console.log('📊 User registration event:', {
      userId,
      ...metadata,
      timestamp: new Date().toISOString()
    })
    
    // Example: Send to analytics service
    // await analytics.track('User Registered', {
    //   userId,
    //   ...metadata
    // })
    
  } catch (error) {
    console.error('Failed to log registration event:', error)
    // Don't throw - logging failures shouldn't break registration
  }
}

/**
 * Helper function to get client IP address
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  // Fallback to a default value
  return 'unknown'
}

/**
 * GET /api/auth/register
 * Not allowed - registration is POST only
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to register.' },
    { status: 405 }
  )
}

/**
 * OPTIONS /api/auth/register
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