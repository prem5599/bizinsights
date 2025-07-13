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

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
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
          // Validate input
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Email and password are required")
          }

          const validation = signInSchema.safeParse(credentials)
          if (!validation.success) {
            throw new Error("Invalid email or password format")
          }

          const { email, password } = validation.data

          // Find user in database
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

          if (!user || !user.password) {
            throw new Error("Invalid email or password")
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(password, user.password)
          if (!isPasswordValid) {
            throw new Error("Invalid email or password")
          }

          // Return user object (without password)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          }
        } catch (error) {
          console.error("Credentials authorization error:", error)
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
    async signIn({ user, account, profile, email, credentials }) {
      try {
        // Allow OAuth sign-ins
        if (account?.provider === "google") {
          return true
        }

        // Allow credentials sign-ins
        if (account?.provider === "credentials") {
          return true
        }

        return false
      } catch (error) {
        console.error("SignIn callback error:", error)
        return false
      }
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl + "/dashboard"
    },
    async session({ session, token, user }) {
      try {
        // Send properties to the client
        if (session.user && token.sub) {
          session.user.id = token.sub

          // Get user's organizations
          const userWithOrgs = await prisma.user.findUnique({
            where: { id: token.sub },
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
            session.user.organizations = userWithOrgs.organizations.map(member => ({
              id: member.organization.id,
              name: member.organization.name,
              slug: member.organization.slug,
              role: member.role,
              subscriptionTier: member.organization.subscriptionTier,
              joinedAt: member.createdAt
            }))

            // Set current organization (first one or most recently used)
            session.user.currentOrganization = session.user.organizations[0] || null
          }
        }

        return session
      } catch (error) {
        console.error("Session callback error:", error)
        return session
      }
    },
    async jwt({ token, user, account, profile, trigger, session }) {
      try {
        // Initial sign in
        if (account && user) {
          token.accessToken = account.access_token
          token.refreshToken = account.refresh_token
          token.accessTokenExpires = account.expires_at
        }

        // Return previous token if the access token has not expired yet
        if (token.accessTokenExpires && Date.now() < token.accessTokenExpires * 1000) {
          return token
        }

        // Access token has expired, try to update it
        if (token.refreshToken) {
          return await refreshAccessToken(token)
        }

        return token
      } catch (error) {
        console.error("JWT callback error:", error)
        return token
      }
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`User signed in: ${user.email} via ${account?.provider}`)
      
      // Create default organization for new users
      if (isNewUser && user.id) {
        try {
          const organization = await prisma.organization.create({
            data: {
              name: `${user.name}'s Organization` || `${user.email}'s Organization`,
              slug: generateSlug(user.name || user.email || ''),
              members: {
                create: {
                  userId: user.id,
                  role: 'owner'
                }
              }
            }
          })
          console.log(`Created default organization for new user: ${organization.id}`)
        } catch (error) {
          console.error("Error creating default organization:", error)
        }
      }
    },
    async signOut({ session, token }) {
      console.log(`User signed out: ${session?.user?.email || 'unknown'}`)
    },
    async createUser({ user }) {
      console.log(`New user created: ${user.email}`)
    }
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
}

/**
 * Refresh access token for OAuth providers
 */
async function refreshAccessToken(token: any) {
  try {
    // Google OAuth token refresh
    if (token.provider === "google") {
      const url = "https://oauth2.googleapis.com/token"
      
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          grant_type: "refresh_token",
          refresh_token: token.refreshToken,
        }),
        method: "POST",
      })

      const refreshedTokens = await response.json()

      if (!response.ok) {
        throw refreshedTokens
      }

      return {
        ...token,
        accessToken: refreshedTokens.access_token,
        accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
        refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      }
    }

    return token
  } catch (error) {
    console.error("Error refreshing access token:", error)

    return {
      ...token,
      error: "RefreshAccessTokenError",
    }
  }
}

/**
 * Generate a slug from a string
 */
function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50) + '-' + Math.random().toString(36).substring(2, 8)
}

/**
 * Type declarations for extended session
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      organizations?: {
        id: string
        name: string
        slug: string
        role: string
        subscriptionTier: string
        joinedAt: Date
      }[]
      currentOrganization?: {
        id: string
        name: string
        slug: string
        role: string
        subscriptionTier: string
        joinedAt: Date
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
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: string
  }
}