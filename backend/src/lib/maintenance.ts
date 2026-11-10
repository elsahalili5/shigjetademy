import { ROLES } from '@lib/roles.ts'
import type { SafeUser } from '@lib/types.ts'
import { PlatformSettingsService } from '@modules/platform-settings/platform-settings.service.ts'

export const DEFAULT_MAINTENANCE_MESSAGE = 'Shigjetademy is down for maintenance. Please check back soon.'

export const isPlatformAdmin = (user: SafeUser) => user.user_roles.some((userRole) => userRole.role.name === ROLES.PLATFORM_ADMIN)

/** The message to refuse a non-admin with while maintenance mode is on, or null when it is off */
export const getMaintenanceRefusal = async (user: SafeUser): Promise<string | null> => {
  if (isPlatformAdmin(user)) return null
  const { maintenance_mode, maintenance_message } = await PlatformSettingsService.getSettings()
  return maintenance_mode ? maintenance_message ?? DEFAULT_MAINTENANCE_MESSAGE : null
}
