// The create-organization form and the endpoint that stores it share this schema.
import { z } from 'zod'
import type { MemberRole } from './auth.ts'

export const ORGANIZATION_TYPES = ['School', 'Kindergarten', 'Academy', 'Training centre', 'Independent lecturer', 'Other'] as const

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number]

export const STUDENT_COUNTS = ['Under 50 students', '50–250 students', '250–1,000 students', 'Over 1,000 students'] as const

export const CURRENCIES = ['EUR', 'ALL', 'MKD', 'CHF', 'GBP', 'USD'] as const

export type Currency = (typeof CURRENCIES)[number]

/** Countries an organization can register in, each with the currency it bills in by default */
export const COUNTRIES = [
  { code: 'XK', currency: 'EUR' },
  { code: 'AL', currency: 'ALL' },
  { code: 'MK', currency: 'MKD' },
  { code: 'ME', currency: 'EUR' },
  { code: 'DE', currency: 'EUR' },
  { code: 'AT', currency: 'EUR' },
  { code: 'CH', currency: 'CHF' },
  { code: 'IT', currency: 'EUR' },
  { code: 'GB', currency: 'GBP' },
  { code: 'US', currency: 'USD' },
] as const satisfies ReadonlyArray<{ code: string; currency: Currency }>

export type CountryCode = (typeof COUNTRIES)[number]['code']

const COUNTRY_CODES = COUNTRIES.map((country) => country.code)

export const ORGANIZATION_NAME_MAX = 80

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter your organization’s name.')
    .max(ORGANIZATION_NAME_MAX, `Keep the name under ${ORGANIZATION_NAME_MAX} characters.`),
  type: z.enum(ORGANIZATION_TYPES, 'Choose what kind of organization you run.'),
  country: z.enum(COUNTRY_CODES, 'Choose a country.'),
  currency: z.enum(CURRENCIES, 'Choose a currency.'),
  size: z.enum(STUDENT_COUNTS).optional(),
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>

export const getDefaultCurrency = (country: CountryCode): Currency =>
  COUNTRIES.find((entry) => entry.code === country)?.currency ?? 'EUR'

// ─── Platform admin: clients and statistics (JSON shapes, dates as ISO strings) ───

export type OrganizationStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'

export type OrganizationTypeValue = 'SCHOOL' | 'KINDERGARTEN' | 'ACADEMY' | 'TRAINING_CENTRE' | 'INDEPENDENT_LECTURER' | 'OTHER'

export type MemberCounts = Record<MemberRole, number>

export type ClientOrganization = {
  id: string
  name: string
  type: OrganizationTypeValue
  country: string
  status: OrganizationStatus
  created_at: string
  owner: { id: string; first_name: string; last_name: string; email: string } | null
  member_counts: MemberCounts
}

export type PlatformStats = {
  organizations: { total: number; active: number; suspended: number }
  new_organizations_this_month: number
  users_total: number
  members_by_role: MemberCounts
  /** New organizations per week, oldest first, the current week last */
  organizations_per_week: { week_start: string; count: number }[]
  organizations_by_type: { type: OrganizationTypeValue; count: number }[]
}

export type ClientOrganizationDetail = Omit<ClientOrganization, 'owner'> & {
  currency: string
  size: string | null
  members: {
    membership_id: string
    id: string
    first_name: string
    last_name: string
    email: string
    role: MemberRole
    joined_at: string
  }[]
  pending_invitations: { id: string; email: string; role: MemberRole; created_at: string; expires_at: string }[]
}

/** The platform admin only suspends and restores; deactivation is the owner's call */
export const updateOrganizationStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED'], { error: 'Choose active or suspended.' }),
})

export type UpdateOrganizationStatusInput = z.infer<typeof updateOrganizationStatusSchema>
