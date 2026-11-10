import { apiClient } from '#/api/client'
import type { PlatformSettings, UpdatePlatformSettingsInput } from '@shigjetademy/shared/platform-settings'

export const platformSettingsApi = {
  get: () => apiClient.get<PlatformSettings>('/platform/settings'),
  update: (input: UpdatePlatformSettingsInput) => apiClient.put<PlatformSettings, UpdatePlatformSettingsInput>('/platform/settings', input),
}
