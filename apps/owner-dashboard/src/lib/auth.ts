import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseServiceKey) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required')
        }

        try {
          // Check if user exists in our users table
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', credentials.email)
            .eq('role', 'owner')
            .single()

          if (userError || !user) {
            throw new Error('Invalid credentials')
          }

          // Verify password hash
          const bcrypt = require('bcryptjs')
          const isValidPassword = await bcrypt.compare(credentials.password, user.password_hash)

          if (!isValidPassword) {
            throw new Error('Invalid credentials')
          }

          return {
            id: user.id,
            email: user.email!,
            name: user.email,
            role: user.role,
            cafe_id: 'default-cafe' // Default cafe ID
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.cafe_id = user.cafe_id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.cafe_id = token.cafe_id as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// Helper functions for server-side auth checks
export async function getServerSession() {
  const { getServerSession } = await import("next-auth/next")
  return await getServerSession(authOptions)
}

export async function requireAuth() {
  const session = await getServerSession()
  if (!session) {
    throw new Error('Authentication required')
  }
  return session
}

export async function requireOwnerRole() {
  const session = await requireAuth()
  if (session.user.role !== 'owner') {
    throw new Error('Owner access required')
  }
  return session
}