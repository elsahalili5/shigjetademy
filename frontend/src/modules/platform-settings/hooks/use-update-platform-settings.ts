import { useMutation, useQueryClient } from '@tanstack/react-query'
import { platformSettingsApi } from '../api/platform-settings-api'
import { platformSettingsQueryKey } from './use-platform-settings'

// The saved settings replace the cached ones, so the page shows them at once
export function useUpdatePlatformSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: platformSettingsApi.update,
    onSuccess: (saved) => {
      queryClient.setQueryData(platformSettingsQueryKey, saved)
    },
  })
}
