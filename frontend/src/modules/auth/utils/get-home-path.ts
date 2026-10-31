import { ROLES } from '@shigjetademy/shared/auth'
import type { AuthUser } from '@shigjetademy/shared/auth'

export const isPlatformAdmin = (user: AuthUser) => user.user_roles.some((userRole) => userRole.role.name === ROLES.PLATFORM_ADMIN)

export const hasOrganization = (user: AuthUser) => user.memberships.length > 0

export const getOwnedOrganization = (user: AuthUser) => user.memberships.find((membership) => membership.role === 'OWNER')?.organization

/** Where a user lands after logging in: a new owner still has to create their organization */
export const getHomePath = (user: AuthUser) => (hasOrganization(user) || isPlatformAdmin(user) ? '/dashboard' : '/onboarding')
