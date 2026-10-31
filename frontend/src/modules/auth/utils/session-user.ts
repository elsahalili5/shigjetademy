import { ROLES } from '@shigjetademy/shared/auth'
import type { AuthUser } from '@shigjetademy/shared/auth'

export type SessionMembership = AuthUser['memberships'][number]

type GetActiveMembershipParams = {
  user: AuthUser
  activeOrganizationId: string | null
}

export const isPlatformAdmin = (user: AuthUser) => user.user_roles.some((userRole) => userRole.role.name === ROLES.PLATFORM_ADMIN)

export const hasOrganization = (user: AuthUser) => user.memberships.length > 0

/** Where a user lands after logging in: a new owner still has to create their organization */
export const getHomePath = (user: AuthUser) => (hasOrganization(user) || isPlatformAdmin(user) ? '/dashboard' : '/onboarding')

/**
 * The organization the user works in right now: the one they picked, if they still belong to it,
 * else the first one they own, else any of their organizations
 */
export const getActiveMembership = ({ user, activeOrganizationId }: GetActiveMembershipParams): SessionMembership | undefined =>
  user.memberships.find((membership) => membership.organization.id === activeOrganizationId) ??
  user.memberships.find((membership) => membership.role === 'OWNER') ??
  user.memberships[0]

export const isOrganizationOwner = (membership: SessionMembership | undefined) => membership?.role === 'OWNER'

/** The owner and school admins run the organization; everyone else only uses it */
export const isOrganizationManager = (membership: SessionMembership | undefined) => isOrganizationOwner(membership) || membership?.role === 'ADMIN'

/** Students only have My school; staff and owner pages aren't theirs */
export const isOrganizationStudent = (membership: SessionMembership | undefined) => membership?.role === 'STUDENT'
