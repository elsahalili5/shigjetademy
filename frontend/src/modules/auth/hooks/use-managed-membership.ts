import { getManagedMembership } from '../utils/get-home-path'
import { useAuth } from './use-auth'

/** The organization the signed-in user helps run, and whether they own it; undefined when they run none */
export function useManagedMembership() {
  const auth = useAuth()
  const membership = auth.user ? getManagedMembership(auth.user) : undefined
  return membership && { membership, isOwner: membership.role === 'OWNER' }
}
