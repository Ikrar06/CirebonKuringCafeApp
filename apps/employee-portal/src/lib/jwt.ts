import jwt from 'jsonwebtoken'

const JWT_SECRET_ENV = process.env.JWT_SECRET

if (!JWT_SECRET_ENV) {
  throw new Error('⚠️ CRITICAL: JWT_SECRET environment variable is required but not defined. Please set JWT_SECRET in your .env file.')
}

// Type assertion after validation to ensure JWT_SECRET is always a string
const JWT_SECRET = JWT_SECRET_ENV as string

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

export function signToken(payload: object, expiresIn: string | number = '7d'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any })
}

export { JWT_SECRET }
