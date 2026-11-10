import { useQuery } from '@tanstack/react-query'
import { platformSettingsApi } from '../api/platform-settings-api'

export const platformSettingsQueryKey = ['platform', 'settings'] as const

export function usePlatformSettings() {
  return useQuery({ queryKey: platformSettingsQueryKey, queryFn: platformSettingsApi.get })
}
