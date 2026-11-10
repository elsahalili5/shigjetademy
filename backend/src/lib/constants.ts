import type { Prisma } from '@generated/prisma/client.ts'

export const SALT_ROUNDS = 10

export const DAY_MS = 24 * 60 * 60 * 1000

/** Everything the app may send about a user: never the password hash or lockout counters */
export const safeUserSelect = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  status: true,
  email_confirmed: true,
  avatar_url: true,
  created_at: true,
  user_roles: { select: { role: { select: { name: true } } } },
  memberships: {
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      role: true,
      permissions: true,
      organization: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          country: true,
          settings: { select: { time_zone: true, week_start: true, date_format: true } },
        },
      },
    },
  },
} satisfies Prisma.UserSelect
