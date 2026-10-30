import jwt from 'jsonwebtoken'
import { HttpError } from './httpError.ts'

const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } = process.env
if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in backend/.env')
}

export const ACCESS_SECRET = JWT_ACCESS_SECRET
export const REFRESH_SECRET = JWT_REFRESH_SECRET

const ACCESS_TOKEN_EXPIRY = '15m'
export const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export const generateAccessToken = (userId: string) => jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY })

// jti keeps two refresh tokens issued in the same second unique
export const generateRefreshToken = (userId: string) =>
  jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY_MS / 1000, jwtid: crypto.randomUUID() })

const readUserId = (payload: string | jwt.JwtPayload): string => {
  if (typeof payload === 'object' && typeof payload.userId === 'string') return payload.userId
  throw new HttpError(401, 'Invalid token')
}

export const verifyAccessToken = (token: string) => readUserId(jwt.verify(token, ACCESS_SECRET))

export const verifyRefreshToken = (token: string) => readUserId(jwt.verify(token, REFRESH_SECRET))
