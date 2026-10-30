import type { NextFunction, Response } from 'express'
import type { RoleType } from '@lib/roles.ts'
import type { AuthRequest } from '@lib/types.ts'

/** Lets the request through when the user has one of the given platform roles */
export const roleMiddleware = (roles: RoleType[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: no user found' })
  }

  const userRoles = req.user.user_roles.map((userRole) => userRole.role.name)
  const hasRole = roles.some((role) => userRoles.includes(role))
  if (!hasRole) {
    return res.status(403).json({ error: "Forbidden: You don't have permission" })
  }

  next()
}
