import { COUNTRIES, CURRENCIES, STUDENT_COUNTS } from '@shigjetademy/shared/organization'
import type { CountryCode, Currency, OrganizationProfile, UpdateOrganizationProfileInput } from '@shigjetademy/shared/organization'
import { ORGANIZATION_TYPE_LABELS } from './labels'

const isCountryCode = (value: string): value is CountryCode => COUNTRIES.some((entry) => entry.code === value)

const isCurrency = (value: string): value is Currency => CURRENCIES.some((code) => code === value)

const toStudentCount = (value: string | null) => STUDENT_COUNTS.find((count) => count === value)

/** The profile as the edit form's starting values; empty optional fields become '' */
export const toProfileFormValues = (profile: OrganizationProfile): Partial<UpdateOrganizationProfileInput> => ({
  name: profile.name,
  type: ORGANIZATION_TYPE_LABELS[profile.type],
  country: isCountryCode(profile.country) ? profile.country : undefined,
  currency: isCurrency(profile.currency) ? profile.currency : undefined,
  size: toStudentCount(profile.size),
  email: profile.email ?? '',
  phone: profile.phone ?? '',
  website: profile.website ?? '',
})
