import { createHash } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { HttpError } from './httpError.ts'

const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } = process.env
if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in backend/.env')
}

export const ACCESS_SECRET = JWT_ACCESS_SECRET
export const REFRESH_SECRET = JWT_REFRESH_SECRET

const ACCESS_TOKEN_EXPIRY = '15m'
const DAY_MS = 24 * 60 * 60 * 1000
export const REFRESH_TOKEN_EXPIRY_MS = 7 * DAY_MS
// A session ends this long after the original login, however often its refresh token rotates
export const SESSION_MAX_MS = 30 * DAY_MS
// A revoked token replayed this soon after its revoking is a tab race, not theft
export const REUSE_GRACE_MS = 10_000
const SECOND_MS = 1000

type RefreshExpiryParams = {
  now: Date
  sessionStartedAt: Date
}

// Whole seconds, so the stored expiry equals the token's exp claim
export const getRefreshExpiry = ({ now, sessionStartedAt }: RefreshExpiryParams) => {
  const expiresAt = Math.min(now.getTime() + REFRESH_TOKEN_EXPIRY_MS, sessionStartedAt.getTime() + SESSION_MAX_MS)
  return new Date(Math.floor(expiresAt / SECOND_MS) * SECOND_MS)
}

export const generateAccessToken = (userId: string) => jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY })

// jti keeps two refresh tokens issued in the same second unique
export const generateRefreshToken = ({ userId, expires }: { userId: string; expires: Date }) =>
  jwt.sign({ userId, exp: expires.getTime() / SECOND_MS }, REFRESH_SECRET, { jwtid: crypto.randomUUID() })

const readUserId = (payload: string | jwt.JwtPayload): string => {
  if (typeof payload === 'object' && typeof payload.userId === 'string') return payload.userId
  throw new HttpError(401, 'Invalid token')
}

export const verifyAccessToken = (token: string) => readUserId(jwt.verify(token, ACCESS_SECRET))

export const verifyRefreshToken = (token: string) => readUserId(jwt.verify(token, REFRESH_SECRET))

// Refresh tokens are high-entropy JWTs with a random jti, so a plain SHA-256 is enough; the database never holds a usable token
export const hashRefreshToken = (token: string) => createHash('sha256').update(token).digest('hex')
