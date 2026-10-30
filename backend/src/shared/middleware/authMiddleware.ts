import type { NextFunction, Response } from 'express'
import { prisma } from '@lib/prisma.ts'
import { safeUserSelect } from '@lib/constants.ts'
import { verifyAccessToken } from '@lib/jwt.ts'
import type { AuthRequest } from '@lib/types.ts'

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const [scheme, token] = req.headers.authorization?.split(' ') ?? []
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' })
  }

  let userId: string
  try {
    userId = verifyAccessToken(token)
  } catch {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' })
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: safeUserSelect })
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: User not found' })
  }

  switch (user.status) {
    case 'ACTIVE':
      req.user = user
      return next()
    case 'LOCKED':
      return res.status(403).json({ error: 'Forbidden: Account is locked' })
    case 'DISABLED':
      return res.status(403).json({ error: 'Forbidden: Account is disabled' })
    case 'PENDING':
      return res.status(403).json({ error: 'Forbidden: Account not activated' })
    default: {
      const unhandled: never = user.status
      throw new Error(`Unhandled user status: ${String(unhandled)}`)
    }
  }
}
