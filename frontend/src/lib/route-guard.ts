import { redirect } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import type { AuthUser } from '@shigjetademy/shared/auth'
import { ME_QUERY_KEY } from '#/modules/auth/hooks/use-me-query'
import { readActiveOrganizationId } from '#/modules/auth/utils/active-organization-storage'
import { readStoredTokens } from '#/modules/auth/utils/auth-storage'
import { getActiveMembership, getHomePath, hasOrganization, isOrganizationGuardian, isOrganizationLecturer, isOrganizationManager, isOrganizationOwner, isOrganizationStudent, isPlatformAdmin } from '#/modules/auth/utils/session-user'

// Guards read the query cache, not React state, so a navigate right after login already sees the new session
export const getSessionUser = (queryClient: QueryClient) =>
  readStoredTokens() ? (queryClient.getQueryData<AuthUser | null>(ME_QUERY_KEY) ?? null) : null

/** The session user's membership in the active organization, read the same way as useActiveMembership */
export const getSessionMembership = (queryClient: QueryClient) => {
  const user = getSessionUser(queryClient)
  return user ? getActiveMembership({ user, activeOrganizationId: readActiveOrganizationId() }) : undefined
}

export function requireAuthenticated(queryClient: QueryClient) {
  const user = getSessionUser(queryClient)
  if (!user) {
    throw redirect({ to: '/login' })
  }
  return user
}

/** Login and sign-up are for signed-out visitors; signed-in users go to their home */
export function requireGuest(queryClient: QueryClient) {
  const user = getSessionUser(queryClient)
  if (user) {
    throw redirect({ to: getHomePath(user) })
  }
}

/** Pages only the platform admin may open; anyone else goes back to their dashboard */
export function requirePlatformAdmin(queryClient: QueryClient) {
  const user = requireAuthenticated(queryClient)
  if (!isPlatformAdmin(user)) {
    throw redirect({ to: '/dashboard' })
  }
}

/** The dashboard needs an organization; a new owner creates one first */
export function requireOrganization(queryClient: QueryClient) {
  const user = requireAuthenticated(queryClient)
  if (!hasOrganization(user) && !isPlatformAdmin(user)) {
    throw redirect({ to: '/onboarding' })
  }
}

/** Pages for the people who run the active organization, its owner and school admins; anyone else goes back to their dashboard */
export function requireOrganizationManager(queryClient: QueryClient) {
  if (!isOrganizationManager(getSessionMembership(queryClient))) {
    throw redirect({ to: '/dashboard' })
  }
}

/** Pages only the active organization's owner may open; anyone else goes back to their dashboard */
export function requireOrganizationOwner(queryClient: QueryClient) {
  if (!isOrganizationOwner(getSessionMembership(queryClient))) {
    throw redirect({ to: '/dashboard' })
  }
}

/** My school is for the active organization's students; anyone else goes back to their dashboard */
export function requireOrganizationStudent(queryClient: QueryClient) {
  if (!isOrganizationStudent(getSessionMembership(queryClient))) {
    throw redirect({ to: '/dashboard' })
  }
}

/** My teaching is for the active organization's lecturers; anyone else goes back to their dashboard */
export function requireOrganizationLecturer(queryClient: QueryClient) {
  if (!isOrganizationLecturer(getSessionMembership(queryClient))) {
    throw redirect({ to: '/dashboard' })
  }
}

/** My children is for the active organization's guardians; anyone else goes back to their dashboard */
export function requireOrganizationGuardian(queryClient: QueryClient) {
  if (!isOrganizationGuardian(getSessionMembership(queryClient))) {
    throw redirect({ to: '/dashboard' })
  }
}

/** The school module pages, which students, lecturers and guardians can't use yet; they go to My school, My teaching or My children instead */
export function refuseHomeOnlyMember(queryClient: QueryClient) {
  const membership = getSessionMembership(queryClient)
  if (isOrganizationStudent(membership)) {
    throw redirect({ to: '/dashboard/my-school' })
  }
  if (isOrganizationLecturer(membership)) {
    throw redirect({ to: '/dashboard/my-teaching' })
  }
  if (isOrganizationGuardian(membership)) {
    throw redirect({ to: '/dashboard/my-children' })
  }
}
