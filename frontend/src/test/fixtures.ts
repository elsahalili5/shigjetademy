import { http, HttpResponse } from 'msw'
import type { AuthUser } from '@shigjetademy/shared/auth'
import type { OrganizationSettings } from '@shigjetademy/shared/organization-settings'
import { storeTokens } from '#/modules/auth/utils/auth-storage'
import { server } from './server'

export const buildUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 'user-1',
  first_name: 'Elsa',
  last_name: 'Halili',
  email: 'elsa@school.test',
  status: 'ACTIVE',
  email_confirmed: true,
  created_at: '2026-10-01T09:00:00.000Z',
  user_roles: [],
  memberships: [],
  ...overrides,
})

/** What an organization's settings are until its owner saves their own */
export const DEFAULT_SETTINGS: OrganizationSettings = { time_zone: 'Europe/Belgrade', week_start: 'MONDAY', date_format: 'DAY_MONTH_YEAR' }

export const PLATFORM_ADMIN_ROLES: AuthUser['user_roles'] = [{ role: { name: 'PLATFORM_ADMIN' } }]

export const OWNER_MEMBERSHIPS: AuthUser['memberships'] = [
  {
    id: 'membership-1',
    role: 'OWNER',
    permissions: [],
    organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS },
  },
]

/** Starts the test signed in as this user: stored tokens plus /auth/me answering with them */
export const signInAs = (user: AuthUser) => {
  storeTokens({ accessToken: 'access-token', refreshToken: 'refresh-token' })
  server.use(http.get('*/api/auth/me', () => HttpResponse.json({ data: user })))
}

/** A second organization where the same user is a school admin, for multi-organization tests */
export const YLLKA_ADMIN_MEMBERSHIP: AuthUser['memberships'][number] = {
  id: 'membership-2',
  role: 'ADMIN',
  permissions: [],
  organization: { id: 'org-2', name: 'Yllka Kindergarten', type: 'KINDERGARTEN', status: 'ACTIVE', ...DEFAULT_SETTINGS },
}
