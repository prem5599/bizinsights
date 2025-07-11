// src/lib/auth.ts - Fixed Authentication Configuration
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
            authorization: {
              params: {
                prompt: "select_account",
                access_type: "offline",
                response_type: "code"
              }
            }
          })
        ] 
      : []
    ),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }

      // Handle account linking
      if (account) {
        token.provider = account.provider
      }

      return token
    },

    async session({ session, token }) {
      // Send properties to the client
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string
      }

      return session
    },

    async signIn({ user, account, profile }) {
      try {
        // Allow credentials sign in
        if (account?.provider === "credentials") {
          return true
        }

        // Handle OAuth sign in
        if (account?.provider === "google" && profile?.email) {
          // Check if user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: profile.email }
          })

          // If user exists but doesn't have this account linked, link it
          if (existingUser) {
            const existingAccount = await prisma.account.findUnique({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId
                }
              }
            })

            if (!existingAccount) {
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  id_token: account.id_token,
                  refresh_token: account.refresh_token,
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