// The organization settings forms and the endpoints that store them share these schemas.
import { z } from 'zod'
import { COUNTRIES } from './organization.ts'

export const WEEK_STARTS = ['MONDAY', 'SUNDAY'] as const

export type WeekStart = (typeof WEEK_STARTS)[number]

export const DATE_FORMATS = ['DAY_MONTH_YEAR', 'MONTH_DAY_YEAR'] as const

export type DateFormat = (typeof DATE_FORMATS)[number]

const DEFAULT_WEEK_START: WeekStart = 'MONDAY'

const DEFAULT_DATE_FORMAT: DateFormat = 'DAY_MONTH_YEAR'

/** The time zones an organization can pick from: every country's default plus common European and US ones */
export const TIME_ZONES = [
  'Europe/Belgrade',
  'Europe/Tirane',
  'Europe/Skopje',
  'Europe/Podgorica',
  'Europe/Sarajevo',
  'Europe/Zagreb',
  'Europe/Ljubljana',
  'Europe/Sofia',
  'Europe/Athens',
  'Europe/Bucharest',
  'Europe/Budapest',
  'Europe/Vienna',
  'Europe/Berlin',
  'Europe/Zurich',
  'Europe/Rome',
  'Europe/Paris',
  'Europe/Brussels',
  'Europe/Amsterdam',
  'Europe/Luxembourg',
  'Europe/Copenhagen',
  'Europe/Stockholm',
  'Europe/Oslo',
  'Europe/Helsinki',
  'Europe/Warsaw',
  'Europe/Prague',
  'Europe/Madrid',
  'Europe/Lisbon',
  'Europe/Dublin',
  'Europe/London',
  'Europe/Istanbul',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Toronto',
  'Pacific/Honolulu',
  'UTC',
] as const

export type TimeZone = (typeof TIME_ZONES)[number]

const FALLBACK_TIME_ZONE: TimeZone = 'Europe/Belgrade'

/** The settings an organization has until its owner saves their own: the time zone from its country, Monday and day-month-year */
const getDefaultOrganizationSettings = (country: string): OrganizationSettings => ({
  time_zone: COUNTRIES.find((entry) => entry.code === country)?.time_zone ?? FALLBACK_TIME_ZONE,
  week_start: DEFAULT_WEEK_START,
  date_format: DEFAULT_DATE_FORMAT,
})

const isTimeZone = (value: string): value is TimeZone => TIME_ZONES.some((zone) => zone === value)

/** A settings row as the database holds it, where the time zone is any text */
type StoredOrganizationSettings = {
  time_zone: string
  week_start: WeekStart
  date_format: DateFormat
}

type ResolveOrganizationSettingsParams = {
  stored: StoredOrganizationSettings | null
  country: string
}

/** The organization's saved settings, or the defaults when it has none yet */
export const resolveOrganizationSettings = ({ stored, country }: ResolveOrganizationSettingsParams): OrganizationSettings => {
  const defaults = getDefaultOrganizationSettings(country)
  if (!stored) return defaults
  return { ...stored, time_zone: isTimeZone(stored.time_zone) ? stored.time_zone : defaults.time_zone }
}

export const updateOrganizationSettingsSchema = z.object({
  time_zone: z.enum(TIME_ZONES, 'Choose a time zone from the list.'),
  week_start: z.enum(WEEK_STARTS, 'Choose Monday or Sunday.'),
  date_format: z.enum(DATE_FORMATS, 'Choose how dates are written.'),
})

export type UpdateOrganizationSettingsInput = z.infer<typeof updateOrganizationSettingsSchema>

/** The owner's own password, asked again before a change that can't be undone by mistake */
const confirmPasswordSchema = z.string().min(1, 'Enter your password.').max(72)

/** Who becomes the owner: one of the organization's active school admins */
export const transferOwnershipSchema = z.object({
  membership_id: z.uuid('Choose a school admin.'),
  password: confirmPasswordSchema,
})

export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>

/** Deactivating asks for the organization's name, typed exactly, and the owner's password */
export const deactivateOrganizationSchema = z.object({
  confirm_name: z.string().trim().min(1, 'Type the organization’s name.'),
  password: confirmPasswordSchema,
})

export type DeactivateOrganizationInput = z.infer<typeof deactivateOrganizationSchema>

export const reactivateOrganizationSchema = z.object({
  password: confirmPasswordSchema,
})

export type ReactivateOrganizationInput = z.infer<typeof reactivateOrganizationSchema>

/** How the whole organization runs: when its week starts, its time zone and how its dates are written */
export type OrganizationSettings = {
  time_zone: TimeZone
  week_start: WeekStart
  date_format: DateFormat
}
