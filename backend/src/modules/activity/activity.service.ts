import type { Prisma } from '@generated/prisma/client.ts'
import { prisma } from '@lib/prisma.ts'
import type { ListActivityQuery } from './activity.types.ts'

const activityUserSelect = { id: true, first_name: true, last_name: true, email: true } as const

const activityEntrySelect = {
  id: true,
  action: true,
  created_at: true,
  actor: { select: activityUserSelect },
  organization: { select: { id: true, name: true } },
  target_user: { select: activityUserSelect },
  subject_name: true,
} as const

const newestFirst = [{ created_at: 'desc' }, { id: 'desc' }] as const satisfies Prisma.ActivityLogOrderByWithRelationInput[]

type ListOrganizationActivityParams = {
  organizationId: string
  limit: number
}

// Password changes and lockouts carry no organization, so a client's own entries also include those of its members
const forOrganization = (organizationId: string): Prisma.ActivityLogWhereInput => ({
  OR: [
    { organization_id: organizationId },
    { organization_id: null, target_user: { memberships: { some: { organization_id: organizationId } } } },
  ],
})

type Cursor = {
  before: string
  beforeId: string
}

// Strictly older than the cursor in (created_at, id) order
const olderThan = ({ before, beforeId }: Cursor): Prisma.ActivityLogWhereInput => ({
  OR: [{ created_at: { lt: new Date(before) } }, { created_at: new Date(before), id: { lt: beforeId } }],
})

export const ActivityService = {
  listActivity: ({ organizationId, action, limit, before, beforeId }: ListActivityQuery) =>
    prisma.activityLog.findMany({
      where: {
        action,
        AND: [organizationId ? forOrganization(organizationId) : {}, before && beforeId ? olderThan({ before, beforeId }) : {}],
      },
      orderBy: newestFirst,
      take: limit,
      select: activityEntrySelect,
    }),

  // An owner sees only what happened in their organization, not its members' personal security events
  listOrganizationActivity: ({ organizationId, limit }: ListOrganizationActivityParams) =>
    prisma.activityLog.findMany({ where: { organization_id: organizationId }, orderBy: newestFirst, take: limit, select: activityEntrySelect }),
}
