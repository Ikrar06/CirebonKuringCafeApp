import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('⚠️ CRITICAL: JWT_SECRET environment variable is required but not defined. Please set JWT_SECRET in your .env file.')
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

export function signToken(payload: any, expiresIn: string = '7d'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

export { JWT_SECRET }
