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

// Environment variable validation (only check critical ones)
const criticalEnvVars = {
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
}

// Check for missing critical environment variables
const missingCriticalVars = Object.entries(criticalEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key)

if (missingCriticalVars.length > 0) {
  console.error(`❌ Missing critical environment variables: ${missingCriticalVars.join(', ')}`)
  // Don't throw in development - just warn
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing critical environment variables: ${missingCriticalVars.join(', ')}`)
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt", // Use JWT strategy for better stability
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile"
        }
      }
    })] : []),
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
          type: "password",
          placeholder: "Your password"
        }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("❌ Missing credentials")
            return null
          }

          // Validate input
          const validatedFields = signInSchema.safeParse({
            email: credentials.email,
            password: credentials.password,
          })

          if (!validatedFields.success) {
            console.log("❌ Invalid credentials format")
            return null
          }

          const { email, password } = validatedFields.data

          // Find user in database
          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              password: true,
            },
          })

          if (!user || !user.password) {
            console.log("❌ User not found or no password set")
            return null
          }

          // Verify password
          const passwordMatch = await bcrypt.compare(password, user.password)
          if (!passwordMatch) {
            console.log("❌ Invalid password")
            return null
          }

          console.log("✅ Credentials authentication successful for:", user.email)
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          }
        } catch (error) {
          console.error("❌ Credentials authentication error:", error)
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    newUser: "/dashboard" // Redirect new users to dashboard after signup
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log(`🔐 Sign-in attempt: ${user.email} via ${account?.provider}`)
      
      try {
        // For OAuth providers, ensure user exists in database
        if (account?.provider === 'google') {
          console.log('👤 Google OAuth sign-in, ensuring user exists in database...')
          
          // The PrismaAdapter will handle user creation automatically
          // So we just need to ensure the sign-in is allowed
          return true
        }

        // For credentials provider, user should already be validated
        if (account?.provider === 'credentials') {
          console.log('✅ Credentials sign-in validated')
          return true
        }

        console.log('✅ Sign-in allowed for provider:', account?.provider)
        return true
      } catch (error) {
        console.error('❌ Sign-in callback error:', error)
        return false
      }
    },
    async redirect({ url, baseUrl }) {
      console.log(`🔄 Redirect callback - URL: ${url}, Base: ${baseUrl}`)
      
      // Allows relative callback URLs
      if (url.startsWith("/")) {
        console.log(`✅ Relative redirect to: ${baseUrl}${url}`)
        return `${baseUrl}${url}`
      }
      
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) {
        console.log(`✅ Same origin redirect to: ${url}`)
        return url
      }
      
      // Default redirect
      console.log(`✅ Default redirect to: ${baseUrl}/dashboard`)
      return `${baseUrl}/dashboard`
    },
    async jwt({ token, user, account, profile, isNewUser }) {
      // Initial sign in
      if (account && user) {
        console.log('🎫 Creating JWT token for user:', user.email)
        return {
          ...token,
          userId: user.id,
          email: user.email,
          name: user.name,
          picture: user.image,
          provider: account.provider,
          accountType: account.type,
        }
      }

      // Return previous token if user hasn't changed
      return token
    },
    async session({ session, user, token }) {
      try {
        console.log("🎭 Session callback triggered for:", session.user?.email)

        // For JWT strategy, use the token data
        if (token) {
          session.user.id = token.userId as string
          console.log("✅ Session updated with user ID from token:", token.userId)
        }
        
        // Try to fetch user organizations (but don't fail if it doesn't work)
        if (session.user?.id) {
          try {
            const memberships = await prisma.organizationMember.findMany({
              where: { userId: session.user.id },
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
              orderBy: { createdAt: 'asc' }
            })

            if (memberships.length > 0) {
              session.user.organizations = memberships.map(m => ({
                id: m.organization.id,
                name: m.organization.name,
                slug: m.organization.slug,
                role: m.role,
                subscriptionTier: m.organization.subscriptionTier
              }))

              // Set current organization to the first one (usually the primary)
              session.user.currentOrganization = session.user.organizations[0] || null
            } else {
              session.user.organizations = []
              session.user.currentOrganization = null
            }

          } catch (dbError) {
            console.error("❌ Error fetching user organizations in session:", dbError)
            // Don't fail the session, just continue without organizations
            session.user.organizations = []
            session.user.currentOrganization = null
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
      
      // For new Google users, we might want to trigger organization creation
      if (isNewUser && account?.provider === 'google') {
        console.log('🆕 New Google user signed up:', user.email)
        // Organization will be created when they access the organizations API
      }
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