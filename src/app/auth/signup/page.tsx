// src/app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { generateSlug } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, companyName } = body

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hash(password, 12)

    // Create user and organization in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password: hashedPassword,
        }
      })

      // Create default organization
      const orgName = companyName?.trim() || `${name.trim()}'s Company`
      const orgSlug = generateSlug(orgName)
      
      // Ensure unique slug
      let finalSlug = orgSlug
      let counter = 1
      while (true) {
        const existingOrg = await tx.organization.findUnique({
          where: { slug: finalSlug }
        })
        if (!existingOrg) break
        finalSlug = `${orgSlug}-${counter}`
        counter++
      }

      const organization = await tx.organization.create({
        data: {
          name: orgName,
          slug: finalSlug,
          subscriptionTier: 'free',
          members: {
            create: {
              userId: user.id,
              role: 'owner'
            }
          }
        }
      })

      return { user, organization }
    })

    // Return success response (don't include sensitive data)
    return NextResponse.json({
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
    })

  } catch (error) {
    console.error('Signup error:', error)
    
    return NextResponse.json(
      { 
        message: 'An error occurred while creating your account. Please try again.' 
      },
      { status: 500 }
    )
  }
}