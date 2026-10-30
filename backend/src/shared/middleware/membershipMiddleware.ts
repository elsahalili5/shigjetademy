import type { NextFunction, Response } from 'express'
import type { MemberRole } from '@shigjetademy/shared/auth'
import type { AuthRequest } from '@lib/types.ts'

/**
 * Lets the request through when the user is an active member of the organization in `:organizationId`
 * with one of the given roles. A suspended organization is refused for everyone in it.
 */
export const requireMembership = (roles: MemberRole[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: no user found' })
  }

  const membership = req.user.memberships.find((item) => item.organization.id === req.params.organizationId)
  if (!membership || !roles.includes(membership.role)) {
    return res.status(403).json({ error: "Forbidden: You don't have permission" })
  }
  if (membership.organization.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'This organization is suspended' })
  }

  next()
}
