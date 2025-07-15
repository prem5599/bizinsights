// src/app/api/auth/check-user/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema
const checkUserSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const validation = checkUserSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    const { email } = validation.data

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      exists: true,
      user: {
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Check user API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}