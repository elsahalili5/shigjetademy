import type { NextFunction, Response } from 'express'
import type { MemberRole } from '@shigjetademy/shared/auth'
import type { AuthRequest, SafeUser } from '@lib/types.ts'

type ActiveMembership = SafeUser['memberships'][number]

/**
 * Lets the request through when the user is an active member of the organization in `:organizationId`
 * and `isAllowed` accepts their membership. A suspended or deactivated organization is refused for everyone in it.
 */
export const requireOrganizationAccess = (isAllowed: (membership: ActiveMembership) => boolean) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: no user found' })
  }

  const membership = req.user.memberships.find((item) => item.organization.id === req.params.organizationId)
  if (!membership || !isAllowed(membership)) {
    return res.status(403).json({ error: "Forbidden: You don't have permission" })
  }
  switch (membership.organization.status) {
    case 'ACTIVE':
      break
    case 'SUSPENDED':
      return res.status(403).json({ error: 'This organization is suspended' })
    case 'DEACTIVATED':
      return res.status(403).json({ error: 'This organization is deactivated' })
    default: {
      const unhandled: never = membership.organization.status
      throw new Error(`Unhandled organization status: ${String(unhandled)}`)
    }
  }

  next()
}

/** Lets the request through when the user is an active member of the organization in `:organizationId` with one of the given roles */
export const requireMembership = (roles: MemberRole[]) => requireOrganizationAccess((membership) => roles.includes(membership.role))
