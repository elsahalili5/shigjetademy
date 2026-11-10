import { useQuery } from '@tanstack/react-query'
import { myChildrenApi } from '../api/my-children-api'

/** The children linked to the signed-in guardian in this organization, by name */
export function useMyChildren(organizationId: string) {
  return useQuery({ queryKey: ['organizations', organizationId, 'me', 'children'], queryFn: () => myChildrenApi.list(organizationId) })
}
