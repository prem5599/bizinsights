// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { generateSlug } from '@/lib/utils'

// Validation schema for registration
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters'),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  organizationName: z.string().optional()
})

// Generate a unique organization slug
async function generateUniqueSlug(baseName: string): Promise<string> {
  let slug = generateSlug(baseName)
  let counter = 1
  
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${generateSlug(baseName)}-${counter}`
    counter++
  }
  
  return slug
}

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Registration attempt started')
    
    // Parse and validate request body
    const body = await request.json()
    console.log('📋 Registration data received for:', body.email)
    
    const validation = registerSchema.safeParse(body)
    if (!validation.success) {
      console.log('❌ Validation failed:', validation.error.errors)
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    const { name, email, password, organizationName } = validation.data

    // Check if user already exists
    console.log('🔍 Checking if user exists:', email)
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.log('❌ User already exists:', email)
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    console.log('🔐 Hashing password...')
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user and organization in a transaction
    console.log('💾 Creating user and organization...')
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password: hashedPassword
        }
      })

      // Create default organization
      const orgName = organizationName?.trim() || `${name.trim()}'s Organization`
      const orgSlug = await generateUniqueSlug(orgName)
      
      const organization = await tx.organization.create({
        data: {
          name: orgName,
          slug: orgSlug,
          subscriptionTier: 'free'
        }
      })

      // Add user as owner of the organization
      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: 'owner'
        }
      })

      return { user, organization }
    })

    console.log('✅ User and organization created successfully')
    console.log(`👤 User ID: ${result.user.id}`)
    console.log(`🏢 Organization: ${result.organization.name} (${result.organization.slug})`)

    // Log registration event
    await logRegistrationEvent(result.user.id, {
      email: result.user.email,
      organizationSlug: result.organization.slug,
      registrationMethod: 'email',
      userAgent: request.headers.get('user-agent') || 'unknown',
      ipAddress: getClientIP(request)
    })

    // Return success response (don't include sensitive data)
    return NextResponse.json({
      success: true,
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
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Registration error:', error)

    // Handle specific database errors
    if (error instanceof Error) {
      // Duplicate key error (should not happen due to our check, but just in case)
      if (error.message.includes('Unique constraint failed on the fields: (`email`)')) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        )
      }

      // Database connection errors
      if (error.message.includes('database') || error.message.includes('connection')) {
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
    console.log('📊 User registration event:', {
      userId,
      ...metadata,
      timestamp: new Date().toISOString()
    })
    
    // You can extend this to log to external services like PostHog, Mixpanel, etc.
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