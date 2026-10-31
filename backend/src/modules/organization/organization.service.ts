import type { Prisma } from '@generated/prisma/client.ts'
import type { ActivityAction, MemberRole, OrganizationType } from '@generated/prisma/enums.ts'
import { prisma } from '@lib/prisma.ts'
import { HttpError } from '@lib/httpError.ts'
import { ActivityService } from '@modules/activity/activity.service.ts'
import type { CreateOrganizationInput, UpdateMemberInput, UpdateOrganizationStatusInput } from './organization.types.ts'

// The form sends readable labels; the database stores enum values
const ORGANIZATION_TYPE_VALUES = {
  School: 'SCHOOL',
  Kindergarten: 'KINDERGARTEN',
  Academy: 'ACADEMY',
  'Training centre': 'TRAINING_CENTRE',
  'Independent lecturer': 'INDEPENDENT_LECTURER',
  Other: 'OTHER',
} as const satisfies Record<CreateOrganizationInput['type'], OrganizationType>

const STATS_WEEKS = 12
const HOUR_MS = 60 * 60 * 1000
const WEEK_MS = 7 * 24 * HOUR_MS
const EXPIRING_SOON_MS = 48 * HOUR_MS
const OVERVIEW_ACTIVITY_LIMIT = 10

const emptyMemberCounts = (): Record<MemberRole, number> => ({ OWNER: 0, ADMIN: 0, LECTURER: 0, STUDENT: 0, GUARDIAN: 0 })

/** Monday 00:00 UTC of the week the date falls in */
const startOfWeek = (date: Date) => {
  const daysSinceMonday = (date.getUTCDay() + 6) % 7
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - daysSinceMonday))
}

type UpdateOrganizationStatusParams = {
  organizationId: string
  actorId: string
  data: UpdateOrganizationStatusInput
}

const STATUS_ACTIVITY = {
  ACTIVE: 'ORGANIZATION_REACTIVATED',
  SUSPENDED: 'ORGANIZATION_SUSPENDED',
} as const satisfies Record<UpdateOrganizationStatusInput['status'], ActivityAction>

type MembershipParams = {
  organizationId: string
  membershipId: string
}

type MemberChangeParams = MembershipParams & {
  actorId: string
}

type UpdateMemberParams = MemberChangeParams & {
  data: UpdateMemberInput
}

const memberSelect = {
  id: true,
  role: true,
  permissions: true,
  created_at: true,
  user: { select: { id: true, first_name: true, last_name: true, email: true } },
} as const

type MemberRecord = {
  id: string
  role: MemberRole
  permissions: UpdateMemberInput['permissions']
  created_at: Date
  user: { id: string; first_name: string; last_name: string; email: string }
}

const toMember = ({ id, role, permissions, created_at, user }: MemberRecord) => ({ ...user, membership_id: id, role, permissions, joined_at: created_at })

/** Only an active School Admin in this organization can have their access changed or be removed */
const editableAdmin = ({ organizationId, membershipId }: MembershipParams) =>
  ({ id: membershipId, organization_id: organizationId, status: 'ACTIVE', role: 'ADMIN' }) as const

type RefuseMemberChangeParams = MembershipParams & {
  tx: Prisma.TransactionClient
}

/** Explains why a guarded member write changed nothing */
const refuseMemberChange = async ({ tx, organizationId, membershipId }: RefuseMemberChangeParams): Promise<never> => {
  const membership = await tx.membership.findFirst({ where: { id: membershipId, organization_id: organizationId, status: 'ACTIVE' }, select: { id: true } })
  if (!membership) {
    throw new HttpError(404, 'Member not found')
  }
  throw new HttpError(400, 'Only school admins can be changed here')
}

type CreateOrganizationParams = {
  userId: string
  data: CreateOrganizationInput
}

export const OrganizationService = {
  // The creator becomes the owner in the same transaction, so an organization never exists without one
  createOrganization: ({ userId, data }: CreateOrganizationParams) =>
    prisma.organization.create({
      data: {
        name: data.name,
        type: ORGANIZATION_TYPE_VALUES[data.type],
        country: data.country,
        currency: data.currency,
        size: data.size ?? null,
        memberships: { create: { user_id: userId, role: 'OWNER' } },
      },
      select: { id: true, name: true, type: true, country: true, currency: true, status: true, created_at: true },
    }),

  // Platform admin: every client with its owner and how many active members it has per role
  listOrganizations: async () => {
    const [organizations, memberGroups] = await Promise.all([
      prisma.organization.findMany({
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          type: true,
          country: true,
          status: true,
          created_at: true,
          memberships: {
            where: { role: 'OWNER', status: 'ACTIVE' },
            take: 1,
            select: { user: { select: { id: true, first_name: true, last_name: true, email: true } } },
          },
        },
      }),
      prisma.membership.groupBy({ by: ['organization_id', 'role'], where: { status: 'ACTIVE' }, _count: { _all: true } }),
    ])

    const countsByOrganization = new Map<string, Record<MemberRole, number>>()
    for (const group of memberGroups) {
      const counts = countsByOrganization.get(group.organization_id) ?? emptyMemberCounts()
      counts[group.role] = group._count._all
      countsByOrganization.set(group.organization_id, counts)
    }

    return organizations.map(({ memberships, ...organization }) => ({
      ...organization,
      owner: memberships[0]?.user ?? null,
      member_counts: countsByOrganization.get(organization.id) ?? emptyMemberCounts(),
    }))
  },

  // Platform admin: the numbers on the Statistics page
  getPlatformStats: async (now = new Date()) => {
    const firstWeek = new Date(startOfWeek(now).getTime() - (STATS_WEEKS - 1) * WEEK_MS)
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

    const [statusGroups, newThisMonth, usersTotal, roleGroups, recentOrganizations, typeGroups] = await Promise.all([
      prisma.organization.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.organization.count({ where: { created_at: { gte: monthStart } } }),
      prisma.user.count(),
      prisma.membership.groupBy({ by: ['role'], where: { status: 'ACTIVE' }, _count: { _all: true } }),
      prisma.organization.findMany({ where: { created_at: { gte: firstWeek } }, select: { created_at: true } }),
      prisma.organization.groupBy({ by: ['type'], _count: { _all: true }, orderBy: { _count: { type: 'desc' } } }),
    ])

    const countForStatus = (status: 'ACTIVE' | 'SUSPENDED') => statusGroups.find((group) => group.status === status)?._count._all ?? 0
    const membersByRole = emptyMemberCounts()
    for (const group of roleGroups) membersByRole[group.role] = group._count._all

    const weeks = Array.from({ length: STATS_WEEKS }, (_, index) => ({ week_start: new Date(firstWeek.getTime() + index * WEEK_MS), count: 0 }))
    for (const organization of recentOrganizations) {
      const week = weeks[Math.floor((startOfWeek(organization.created_at).getTime() - firstWeek.getTime()) / WEEK_MS)]
      if (week) week.count += 1
    }

    return {
      organizations: {
        total: statusGroups.reduce((sum, group) => sum + group._count._all, 0),
        active: countForStatus('ACTIVE'),
        suspended: countForStatus('SUSPENDED'),
      },
      new_organizations_this_month: newThisMonth,
      users_total: usersTotal,
      members_by_role: membersByRole,
      organizations_per_week: weeks,
      organizations_by_type: typeGroups.map((group) => ({ type: group.type, count: group._count._all })),
    }
  },

  getOrganization: async (organizationId: string) => {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        type: true,
        country: true,
        currency: true,
        size: true,
        status: true,
        created_at: true,
        memberships: {
          where: { status: 'ACTIVE' },
          orderBy: { created_at: 'asc' },
          select: { id: true, role: true, created_at: true, user: { select: { id: true, first_name: true, last_name: true, email: true } } },
        },
        invitations: {
          where: { status: 'PENDING' },
          orderBy: { created_at: 'desc' },
          select: { id: true, email: true, role: true, created_at: true, expires_at: true },
        },
      },
    })
    if (!organization) {
      throw new HttpError(404, 'Client not found')
    }

    const { memberships, invitations, ...profile } = organization
    const memberCounts = emptyMemberCounts()
    for (const membership of memberships) memberCounts[membership.role] += 1

    return {
      ...profile,
      member_counts: memberCounts,
      members: memberships.map(({ id, role, created_at, user }) => ({ ...user, membership_id: id, role, joined_at: created_at })),
      pending_invitations: invitations,
    }
  },

  // One guarded write, so an owner deactivating at the same moment can't be overwritten; only a real change is logged
  updateOrganizationStatus: ({ organizationId, actorId, data }: UpdateOrganizationStatusParams) =>
    prisma.$transaction(async (tx) => {
      const { count } = await tx.organization.updateMany({
        where: { id: organizationId, status: { notIn: ['DEACTIVATED', data.status] } },
        data: { status: data.status },
      })
      if (count > 0) {
        await tx.activityLog.create({ data: { actor_id: actorId, action: STATUS_ACTIVITY[data.status], organization_id: organizationId } })
        return { id: organizationId, status: data.status }
      }

      const current = await tx.organization.findUnique({ where: { id: organizationId }, select: { status: true } })
      if (!current) {
        throw new HttpError(404, 'Client not found')
      }
      if (current.status === 'DEACTIVATED') {
        throw new HttpError(409, 'The owner deactivated this organization')
      }
      return { id: organizationId, status: data.status }
    }),

  // The owner's Members page: active members, owner first, then by when they joined
  listMembers: async (organizationId: string) => {
    const memberships = await prisma.membership.findMany({
      where: { organization_id: organizationId, status: 'ACTIVE' },
      orderBy: [{ role: 'asc' }, { created_at: 'asc' }],
      select: memberSelect,
    })
    return memberships.map(toMember)
  },

  getOverview: async (organizationId: string) => {
    const now = new Date()
    const openInvitation = { organization_id: organizationId, status: 'PENDING', expires_at: { gt: now } } as const
    const [members, admins, pendingInvitations, adminInvitations, activity] = await Promise.all([
      prisma.membership.count({ where: { organization_id: organizationId, status: 'ACTIVE' } }),
      prisma.membership.count({ where: { organization_id: organizationId, status: 'ACTIVE', role: 'ADMIN' } }),
      prisma.invitation.count({ where: openInvitation }),
      prisma.invitation.findMany({
        where: { ...openInvitation, role: 'ADMIN' },
        orderBy: { expires_at: 'asc' },
        select: { id: true, email: true, expires_at: true },
      }),
      ActivityService.listOrganizationActivity({ organizationId, limit: OVERVIEW_ACTIVITY_LIMIT }),
    ])

    return {
      counts: { members, admins, pending_invitations: pendingInvitations },
      pending_invitations: adminInvitations.map((invitation) => ({
        ...invitation,
        is_expiring_soon: invitation.expires_at.getTime() - now.getTime() <= EXPIRING_SOON_MS,
      })),
      activity,
    }
  },

  listPendingInvitations: (organizationId: string) =>
    prisma.invitation.findMany({
      where: { organization_id: organizationId, status: 'PENDING', expires_at: { gt: new Date() } },
      orderBy: { created_at: 'desc' },
      select: { id: true, email: true, role: true, permissions: true, created_at: true, expires_at: true },
    }),

  // Guarded writes, so a removal at the same moment can't be overwritten or logged twice
  updateMember: ({ organizationId, membershipId, actorId, data }: UpdateMemberParams) =>
    prisma.$transaction(async (tx) => {
      const { count } = await tx.membership.updateMany({ where: editableAdmin({ organizationId, membershipId }), data: { permissions: data.permissions } })
      if (count === 0) {
        return refuseMemberChange({ tx, organizationId, membershipId })
      }
      const membership = await tx.membership.findUniqueOrThrow({ where: { id: membershipId }, select: { user_id: true } })
      await tx.user.update({ where: { id: membership.user_id }, data: { first_name: data.first_name, last_name: data.last_name } })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'MEMBER_UPDATED', organization_id: organizationId, target_user_id: membership.user_id } })
      return toMember(await tx.membership.findUniqueOrThrow({ where: { id: membershipId }, select: memberSelect }))
    }),

  // Removing keeps the membership row as REMOVED, so history (and the activity log) still points at it
  removeMember: ({ organizationId, membershipId, actorId }: MemberChangeParams) =>
    prisma.$transaction(async (tx) => {
      const { count } = await tx.membership.updateMany({ where: editableAdmin({ organizationId, membershipId }), data: { status: 'REMOVED' } })
      if (count === 0) {
        return refuseMemberChange({ tx, organizationId, membershipId })
      }
      const membership = await tx.membership.findUniqueOrThrow({ where: { id: membershipId }, select: { user_id: true } })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'MEMBER_REMOVED', organization_id: organizationId, target_user_id: membership.user_id } })
    }),
}
