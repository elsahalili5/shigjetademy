import { useQuery } from '@tanstack/react-query'
import { inboxApi } from '../api/inbox-api'
import { inboxQueryKeys } from '../utils/query-keys'

/** The members the signed-in member may start a conversation with */
export function useInboxContacts(organizationId: string) {
  return useQuery({ queryKey: inboxQueryKeys.contacts(organizationId), queryFn: () => inboxApi.listContacts(organizationId) })
}
