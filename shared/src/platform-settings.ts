// The platform settings form and the endpoints that store it share these schemas.
import { z } from 'zod'

const DEFAULT_PLATFORM_NAME = 'Shigjetademy'
const DEFAULT_TRIAL_DAYS = 14

/** The platform's settings until an admin saves their own */
const getDefaultPlatformSettings = (): PlatformSettings => ({
  platform_name: DEFAULT_PLATFORM_NAME,
  logo_url: null,
  maintenance_mode: false,
  maintenance_message: null,
  default_trial_days: DEFAULT_TRIAL_DAYS,
})

/** A settings row as the database holds it */
type StoredPlatformSettings = {
  platform_name: string
  logo_url: string | null
  maintenance_mode: boolean
  maintenance_message: string | null
  default_trial_days: number
}

type ResolvePlatformSettingsParams = {
  stored: StoredPlatformSettings | null
}

/** The platform's saved settings, or the defaults when it has none yet */
export const resolvePlatformSettings = ({ stored }: ResolvePlatformSettingsParams): PlatformSettings => stored ?? getDefaultPlatformSettings()

export const updatePlatformSettingsSchema = z.object({
  platform_name: z.string().trim().min(1, 'Enter a platform name.'),
  logo_url: z.union([z.literal(''), z.url({ protocol: /^https?$/, error: 'Enter a full web address, like https://school.org/logo.png.' })]).optional(),
  maintenance_mode: z.boolean(),
  maintenance_message: z.string().trim().optional(),
  default_trial_days: z.int('Enter a whole number of days.').min(0, 'Enter zero or more days.'),
})

export type UpdatePlatformSettingsInput = z.infer<typeof updatePlatformSettingsSchema>

/** How the whole platform runs: its name, logo, maintenance mode and new organizations' default trial */
export type PlatformSettings = {
  platform_name: string
  logo_url: string | null
  maintenance_mode: boolean
  maintenance_message: string | null
  default_trial_days: number
}
