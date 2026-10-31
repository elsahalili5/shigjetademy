import { useSyncExternalStore } from 'react'
import { readActiveOrganizationId, subscribeToActiveOrganization } from '../utils/active-organization-storage'
import { getActiveMembership } from '../utils/session-user'
import { useAuth } from './use-auth'

/** The signed-in user's membership in the active organization; undefined when they belong to none */
export function useActiveMembership() {
  const auth = useAuth()
  const activeOrganizationId = useSyncExternalStore(subscribeToActiveOrganization, readActiveOrganizationId)
  return auth.user ? getActiveMembership({ user: auth.user, activeOrganizationId }) : undefined
}
