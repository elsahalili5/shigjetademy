import { useQuery } from '@tanstack/react-query'
import { organizationSettingsApi } from '../api/organization-settings-api'

export const organizationSettingsQueryKey = (organizationId: string) => ['organizations', organizationId, 'settings'] as const

export function useOrganizationSettings(organizationId: string) {
  return useQuery({ queryKey: organizationSettingsQueryKey(organizationId), queryFn: () => organizationSettingsApi.get(organizationId) })
}
