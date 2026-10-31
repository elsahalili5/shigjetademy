import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import type { Permission } from '@shigjetademy/shared/auth'
import { requireOrganizationAccess } from './membershipMiddleware.ts'

/** Lets the request through when the user holds the permission in the organization in `:organizationId` (the owner always does) */
export const requirePermission = (permission: Permission) => requireOrganizationAccess({ isAllowed: (membership) => hasOrganizationPermission({ membership, permission }) })
