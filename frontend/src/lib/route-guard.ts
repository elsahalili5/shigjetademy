import { redirect } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import type { AuthUser } from '@shigjetademy/shared/auth'
import { ME_QUERY_KEY } from '#/modules/auth/hooks/use-me-query'
import { readStoredTokens } from '#/modules/auth/utils/auth-storage'
import { getHomePath, getManagedMembership, hasOrganization, isPlatformAdmin } from '#/modules/auth/utils/session-user'

// Guards read the query cache, not React state, so a navigate right after login already sees the new session
export const getSessionUser = (queryClient: QueryClient) =>
  readStoredTokens() ? (queryClient.getQueryData<AuthUser | null>(ME_QUERY_KEY) ?? null) : null

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

/** Pages for the people who run an organization, its owner and school admins; anyone else goes back to their dashboard */
export function requireOrganizationManager(queryClient: QueryClient) {
  const user = getSessionUser(queryClient)
  if (!user || !getManagedMembership(user)) {
    throw redirect({ to: '/dashboard' })
  }
}
