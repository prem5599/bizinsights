// src/lib/auth.ts
import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

// Validation schemas
const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

// Environment variable validation
const requiredEnvVars = {
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
}

// Check for missing environment variables
const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key)

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`)
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`)
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt", // Use JWT strategy for better compatibility
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile"
        }
      }
    }),
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      type: "credentials",
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
          console.log("🔐 Credentials provider: Starting authorization")
          
          // Enhanced input validation
          if (!credentials) {
            console.error("❌ No credentials provided")
            return null
          }

          if (!credentials.email || !credentials.password) {
            console.error("❌ Missing email or password in credentials")
            return null
          }

          // Validate and sanitize input
          const validation = signInSchema.safeParse({
            email: credentials.email.trim(),
            password: credentials.password
          })

          if (!validation.success) {
            console.error("❌ Invalid credentials format:", validation.error.issues)
            return null
          }

          const { email, password } = validation.data

          console.log("🔍 Looking for user with email:", email)

          // Find user in database with detailed logging
          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              password: true,
              createdAt: true,
            }
          })

          if (!user) {
            console.error("❌ No user found with email:", email)
            return null
          }

          if (!user.password) {
            console.error("❌ User found but no password set (may be OAuth only):", email)
            return null
          }

          console.log("✅ User found, verifying password...")

          // Verify password with enhanced error handling
          let isPasswordValid = false
          try {
            isPasswordValid = await bcrypt.compare(password, user.password)
          } catch (bcryptError) {
            console.error("❌ Password comparison failed:", bcryptError)
            return null
          }

          if (!isPasswordValid) {
            console.error("❌ Invalid password for user:", email)
            return null
          }

          console.log("✅ Password verified successfully for user:", email)

          // Return user object for session (exclude password)
          const authenticatedUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          }

          console.log("✅ User authenticated successfully:", {
            id: authenticatedUser.id,
            email: authenticatedUser.email,
            name: authenticatedUser.name
          })

          return authenticatedUser

        } catch (error) {
          console.error("❌ Credentials authorization error:", error)
          
          // Handle specific database errors
          if (error instanceof Error) {
            if (error.message.includes('ECONNREFUSED') || error.message.includes('connect ECONNREFUSED')) {
              console.error("Database connection refused - check if database is running")
            } else if (error.message.includes('timeout')) {
              console.error("Database query timeout")
            } else if (error.message.includes('P2002')) {
              console.error("Database constraint violation")
            }
          }
          
          return null
        }
      }
    })
  ],
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    newUser: "/dashboard"
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        console.log(`🔄 Sign in callback - Provider: ${account?.provider}, User: ${user.email}`)
        
        // Enhanced logging for debugging
        if (account) {
          console.log("Account details:", {
            provider: account.provider,
            type: account.type,
            providerAccountId: account.providerAccountId
          })
        }

        // Allow OAuth sign-ins (Google)
        if (account?.provider === "google") {
          console.log("✅ Google OAuth sign-in allowed")
          return true
        }

        // Allow credentials sign-ins
        if (account?.provider === "credentials") {
          console.log("✅ Credentials sign-in allowed")
          return true
        }

        // Block unknown providers
        console.error("❌ Sign-in denied - unsupported provider:", account?.provider)
        return false

      } catch (error) {
        console.error("❌ SignIn callback error:", error)
        return false
      }
    },
    
    async redirect({ url, baseUrl }) {
      console.log(`🔄 Redirect callback - URL: ${url}, Base: ${baseUrl}`)
      
      try {
        // Handle relative URLs
        if (url.startsWith("/")) {
          const redirectUrl = `${baseUrl}${url}`
          console.log("✅ Relative redirect to:", redirectUrl)
          return redirectUrl
        }
        
        // Handle same-origin URLs
        if (new URL(url).origin === baseUrl) {
          console.log("✅ Same origin redirect to:", url)
          return url
        }
        
        // Default fallback
        const defaultUrl = `${baseUrl}/dashboard`
        console.log("✅ Default redirect to:", defaultUrl)
        return defaultUrl

      } catch (error) {
        console.error("❌ Redirect callback error:", error)
        const fallbackUrl = `${baseUrl}/dashboard`
        console.log("🔄 Fallback redirect to:", fallbackUrl)
        return fallbackUrl
      }
    },
    
    async jwt({ token, user, account }) {
      try {
        // Initial sign in
        if (account && user) {
          console.log("🎟️ Creating JWT token for user:", user.email)
          
          token.userId = user.id
          token.email = user.email
          token.name = user.name
          token.picture = user.image
          
          // Add account provider info
          token.provider = account.provider
          token.accountType = account.type
        }

        // Subsequent requests - token already exists
        if (token.userId) {
          // You can add additional user data fetching here if needed
          // For example, to get the latest user info or check if account is still active
        }

        return token

      } catch (error) {
        console.error("❌ JWT callback error:", error)
        return token
      }
    },
    
    async session({ session, token }) {
      try {
        // Send properties to the client
        if (token) {
          session.user.id = token.userId as string
          session.user.email = token.email as string
          session.user.name = token.name as string
          session.user.image = token.picture as string

          // Enhanced session with user organizations
          if (token.userId) {
            try {
              const userWithOrgs = await prisma.user.findUnique({
                where: { id: token.userId as string },
                include: {
                  organizations: {
                    include: {
                      organization: {
                        select: {
                          id: true,
                          name: true,
                          slug: true,
                          subscriptionTier: true
                        }
                      }
                    },
                    orderBy: {
                      createdAt: 'asc'
                    }
                  }
                }
              })

              if (userWithOrgs) {
                // Add organizations to session
                session.user.organizations = userWithOrgs.organizations.map(org => ({
                  id: org.organization.id,
                  name: org.organization.name,
                  slug: org.organization.slug,
                  role: org.role,
                  subscriptionTier: org.organization.subscriptionTier
                }))
                
                // Set default organization (first one or the one they last used)
                session.user.currentOrganization = session.user.organizations[0] || null
              }

            } catch (dbError) {
              console.error("❌ Error fetching user organizations in session:", dbError)
              // Don't fail the session, just continue without organizations
              session.user.organizations = []
              session.user.currentOrganization = null
            }
          }
        }

        console.log("✅ Session created/updated for user:", session.user.email)
        return session

      } catch (error) {
        console.error("❌ Session callback error:", error)
        return session
      }
    }
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      console.log(`📝 Sign-in event: ${user.email} via ${account?.provider}`, {
        isNewUser,
        userId: user.id,
        provider: account?.provider
      })
    },
    async signOut({ token }) {
      console.log("📝 Sign-out event for user:", token?.email)
    },
    async createUser({ user }) {
      console.log("📝 New user created:", user.email)
    },
    async updateUser({ user }) {
      console.log("📝 User updated:", user.email)
    },
    async linkAccount({ user, account }) {
      console.log(`📝 Account linked: ${user.email} with ${account.provider}`)
    },
    async session({ session, token }) {
      // This event is called whenever a session is checked
      // Can be used for logging or analytics
    }
  },
  debug: process.env.NODE_ENV === 'development', // Enable debug in development
  logger: {
    error(code, metadata) {
      console.error(`❌ NextAuth Error [${code}]:`, metadata)
    },
    warn(code) {
      console.warn(`⚠️ NextAuth Warning [${code}]`)
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🐛 NextAuth Debug [${code}]:`, metadata)
      }
    }
  }
}

// Type extensions for enhanced session
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      organizations?: Array<{
        id: string
        name: string
        slug: string
        role: string
        subscriptionTier: string
      }>
      currentOrganization?: {
        id: string
        name: string
        slug: string
        role: string
        subscriptionTier: string
      } | null
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string
    email: string
    name?: string | null
    picture?: string | null
    provider?: string
    accountType?: string
  }
}