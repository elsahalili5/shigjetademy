import { resolveOrganizationSettings } from '@shigjetademy/shared/organization-settings'
import type { SafeUser } from './types.ts'

/** The user as the app sends it: each membership's organization carries its settings, or their defaults */
export const toSessionUser = ({ memberships, ...user }: SafeUser) => ({
  ...user,
  memberships: memberships.map(({ organization: { country, settings, ...organization }, ...membership }) => ({
    ...membership,
    organization: { ...organization, ...resolveOrganizationSettings({ stored: settings, country }) },
  })),
})

export type SessionUser = ReturnType<typeof toSessionUser>
