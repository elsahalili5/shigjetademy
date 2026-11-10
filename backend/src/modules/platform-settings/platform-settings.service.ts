import { prisma } from '@lib/prisma.ts'
import { resolvePlatformSettings } from '@shigjetademy/shared/platform-settings'
import type { UpdatePlatformSettingsInput } from './platform-settings.types.ts'

// One row for the whole platform
const PLATFORM_SETTINGS_ID = 1

const settingsSelect = { platform_name: true, logo_url: true, maintenance_mode: true, maintenance_message: true, default_trial_days: true } as const

// authMiddleware reads these settings on every authenticated request to check maintenance mode,
// so a short-lived cache keeps that from hitting the database each time; a save clears it at once
const CACHE_TTL_MS = 5000
let cached: { settings: ReturnType<typeof resolvePlatformSettings>; expires_at: number } | null = null

type UpdateSettingsParams = {
  actorId: string
  data: UpdatePlatformSettingsInput
}

/** Tests truncate the table directly, bypassing updateSettings, so they clear this too to start from a clean cache */
export const clearPlatformSettingsCache = () => {
  cached = null
}

export const PlatformSettingsService = {
  // The platform without a row yet reads the defaults; the row is written on the first save
  getSettings: async () => {
    if (cached && cached.expires_at > Date.now()) {
      return cached.settings
    }
    const stored = await prisma.platformSettings.findUnique({ where: { id: PLATFORM_SETTINGS_ID }, select: settingsSelect })
    const settings = resolvePlatformSettings({ stored })
    cached = { settings, expires_at: Date.now() + CACHE_TTL_MS }
    return settings
  },

  updateSettings: async ({ actorId, data }: UpdateSettingsParams) => {
    const settings = await prisma.$transaction(async (tx) => {
      const settings = await tx.platformSettings.upsert({
        where: { id: PLATFORM_SETTINGS_ID },
        update: { ...data, logo_url: data.logo_url || null, maintenance_message: data.maintenance_message || null },
        create: { id: PLATFORM_SETTINGS_ID, ...data, logo_url: data.logo_url || null, maintenance_message: data.maintenance_message || null },
        select: settingsSelect,
      })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'PLATFORM_SETTINGS_UPDATED', organization_id: null } })
      return settings
    })
    cached = null
    return settings
  },
}
