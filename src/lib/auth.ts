// src/lib/auth.ts - Complete Authentication Configuration
import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  
  providers: [
    // Email/Password Authentication (Primary)
    CredentialsProvider({
      id: "credentials",
      name: "Email",
      credentials: {
        email: { 
          label: "Email", 
          type: "email", 
          placeholder: "your@email.com" 
        },
        password: { 
          label: "Password", 
          type: "password" 
        }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("Missing credentials")
            return null
          }

          // Find user by email
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email.toLowerCase()
            }
          })

          if (!user) {
            console.log("User not found:", credentials.email)
            return null
          }

          // Check if user has a password (might be OAuth only)
          if (!user.password) {
            console.log("User has no password set:", credentials.email)
            return null
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(
            credentials.password, 
            user.password
          )

          if (!isPasswordValid) {
            console.log("Invalid password for:", credentials.email)
            return null
          }

          console.log("Authentication successful for:", credentials.email)
          
          // Return user object (this will be stored in JWT)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          }
        } catch (error) {
          console.error("Authentication error:", error)
          return null
        }
      }
    }),

    // Google OAuth (Conditional)
    ...(process.env.GOOGLE_CLIENT_ID && 
       process.env.GOOGLE_CLIENT_SECRET && 
       process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true" 
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true
          })
        ] 
      : []
    )
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user, account, profile, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.image = user.image
      }

      // Handle account linking for OAuth providers
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.provider = account.provider
      }

      return token
    },

    async session({ session, token, user }) {
      // Send properties to the client
      if (token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.image as string
        session.accessToken = token.accessToken as string
      }

      return session
    },

    async signIn({ user, account, profile, email, credentials }) {
      try {
        if (account?.provider === "credentials") {
          // For credentials provider, user is already validated
          return true
        }

        if (account?.provider === "google") {
          // Check if this is a new user
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! }
          })

          if (existingUser) {
            // Update existing user with OAuth account info if needed
            if (!existingUser.image && user.image) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { 
                  image: user.image,
                  name: user.name || existingUser.name
                }
              })
            }

            // Store OAuth account details
            if (account) {
              await prisma.account.upsert({
                where: {
                  provider_providerAccountId: {
                    provider: account.provider,
                    providerAccountId: account.providerAccountId
                  }
                },
                update: {
                  access_token: account.access_token,
                  refresh_token: account.refresh_token,
                  expires_at: account.expires_at,
                  scope: account.scope,
                  session_state: account.session_state,
                  token_type: account.token_type,
                },
                create: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  refresh_token: account.refresh_token,
                  expires_at: account.expires_at,
                  scope: account.scope,
                  session_state: account.session_state,
                  token_type: account.token_type,
                }
              })
            }
          }

          return true
        }

        return true
      } catch (error) {
        console.error("SignIn callback error:", error)
        return false
      }
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url
      
      return baseUrl
    }
  },

  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
  },

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log("User signed in:", {
        userId: user.id,
        email: user.email,
        provider: account?.provider,
        isNewUser
      })

      // Auto-create organization for new users
      if (isNewUser && user.id) {
        try {
          await createDefaultOrganization(user.id, user.name || user.email!)
        } catch (error) {
          console.error("Failed to create default organization:", error)
        }
      }
    },
    
    async signOut({ session, token }) {
      console.log("User signed out:", {
        userId: token?.id || session?.user?.id
      })
    }
  },

  debug: process.env.NODE_ENV === "development",
  
  secret: process.env.NEXTAUTH_SECRET,
}

/**
 * Create default organization for new users
 */
async function createDefaultOrganization(userId: string, userName: string) {
  try {
    // Generate a unique slug
    const baseSlug = userName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 20)
      
    let slug = baseSlug
    let counter = 1
    
    // Ensure slug is unique
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name: `${userName}'s Organization`,
        slug,
        subscriptionTier: 'free',
        members: {
          create: {
            userId,
            role: 'owner'
          }
        }
      }
    })

    console.log(`Created default organization for user ${userId}:`, organization.id)
    return organization
  } catch (error) {
    console.error("Error creating default organization:", error)
    throw error
  }
}

/**
 * Hash password for credentials signup
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

/**
 * Verify password for credentials signin
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * Create user with credentials
 */
export async function createUser(email: string, password: string, name?: string) {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      throw new Error('User already exists')
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        password: hashedPassword
      }
    })

    // Create default organization
    await createDefaultOrganization(user.id, user.name || user.email)

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image
    }
  } catch (error) {
    console.error("Error creating user:", error)
    throw error
  }
}

/**
 * Get user with organizations
 */
export async function getUserWithOrganizations(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      organizations: {
        include: {
          organization: {
            include: {
              _count: {
                select: {
                  members: true,
                  integrations: true
                }
              }
            }
          }
        }
      }
    }
  })
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string, 
  data: { name?: string; image?: string }
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...data,
      updatedAt: new Date()
    }
  })
}

/**
 * Delete user account
 */
export async function deleteUserAccount(userId: string) {
  try {
    // Get user's organizations where they are the sole owner
    const userOrgs = await prisma.organizationMember.findMany({
      where: {
        userId,
        role: 'owner'
      },
      include: {
        organization: {
          include: {
            members: true
          }
        }
      }
    })

    // Delete organizations where user is the sole owner
    for (const orgMember of userOrgs) {
      if (orgMember.organization.members.length === 1) {
        await prisma.organization.delete({
          where: { id: orgMember.organization.id }
        })
      }
    }

    // Delete user (cascade will handle remaining relations)
    await prisma.user.delete({
      where: { id: userId }
    })

    return true
  } catch (error) {
    console.error("Error deleting user account:", error)
    throw error
  }
}