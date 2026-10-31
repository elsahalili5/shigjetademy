import bcrypt from 'bcrypt'
import type { Prisma } from '@generated/prisma/client.ts'
import { prisma } from '@lib/prisma.ts'
import { HttpError } from '@lib/httpError.ts'
import { PERMISSIONS } from '@shigjetademy/shared/auth'
import { resolveOrganizationSettings } from '@shigjetademy/shared/organization-settings'
import type { DeactivateOrganizationInput, ReactivateOrganizationInput, TransferOwnershipInput, UpdateOrganizationSettingsInput } from './organization-settings.types.ts'

const settingsSelect = { time_zone: true, week_start: true, date_format: true } as const

type UpdateSettingsParams = {
  organizationId: string
  actorId: string
  data: UpdateOrganizationSettingsInput
}

type OrganizationActionParams = {
  organizationId: string
  actorId: string
}

type TransferOwnershipParams = OrganizationActionParams & {
  data: TransferOwnershipInput
}

type DeactivateOrganizationParams = OrganizationActionParams & {
  data: DeactivateOrganizationInput
}

type ReactivateOrganizationParams = OrganizationActionParams & {
  data: ReactivateOrganizationInput
}

type CheckPasswordParams = {
  userId: string
  password: string
}

// A wrong password is a mistake in the form, not a failed login, so it doesn't count toward a lockout
const checkPassword = async ({ userId, password }: CheckPasswordParams) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password_hash: true } })
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(400, 'Your password isn’t right')
  }
}

type OrganizationScope = {
  tx: Prisma.TransactionClient
  organizationId: string
}

/** Ownership changes for one organization run one at a time, so two transfers can't both go through */
const lockOrganization = ({ tx, organizationId }: OrganizationScope) =>
  tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId}::uuid FOR UPDATE`

export const OrganizationSettingsService = {
  // An organization without a row, like one from before settings existed, reads the defaults; the row is written on the first save
  getSettings: async (organizationId: string) => {
    const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { country: true, settings: { select: settingsSelect } } })
    if (!organization) {
      throw new HttpError(404, 'Organization not found')
    }
    return resolveOrganizationSettings({ stored: organization.settings, country: organization.country })
  },

  updateSettings: ({ organizationId, actorId, data }: UpdateSettingsParams) =>
    prisma.$transaction(async (tx) => {
      const settings = await tx.organizationSettings.upsert({
        where: { organization_id: organizationId },
        update: data,
        create: { organization_id: organizationId, ...data },
        select: settingsSelect,
      })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'ORGANIZATION_SETTINGS_UPDATED', organization_id: organizationId } })
      return settings
    }),

  // The old owner stays on as a school admin who may do everything
  transferOwnership: async ({ organizationId, actorId, data }: TransferOwnershipParams) => {
    await checkPassword({ userId: actorId, password: data.password })
    await prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const target = await tx.membership.findFirst({
        where: { id: data.membership_id, organization_id: organizationId, status: 'ACTIVE' },
        select: { role: true, user_id: true, user: { select: { status: true } } },
      })
      if (!target) {
        throw new HttpError(404, 'Member not found')
      }
      if (target.role !== 'ADMIN') {
        throw new HttpError(400, 'Ownership can only go to a school admin')
      }
      if (target.user.status !== 'ACTIVE') {
        throw new HttpError(400, 'Ownership can only go to a school admin whose account is active')
      }
      const { count } = await tx.membership.updateMany({
        where: { organization_id: organizationId, user_id: actorId, role: 'OWNER', status: 'ACTIVE' },
        data: { role: 'ADMIN', permissions: [...PERMISSIONS] },
      })
      if (count === 0) {
        throw new HttpError(409, 'You are no longer the owner of this organization')
      }
      await tx.membership.update({ where: { id: data.membership_id }, data: { role: 'OWNER', permissions: [] } })
      await tx.activityLog.create({
        data: { actor_id: actorId, action: 'OWNERSHIP_TRANSFERRED', organization_id: organizationId, target_user_id: target.user_id },
      })
    })
  },

  // Guarded on the current status, so a suspension landing at the same moment isn't overwritten
  deactivateOrganization: async ({ organizationId, actorId, data }: DeactivateOrganizationParams) => {
    await checkPassword({ userId: actorId, password: data.password })
    const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } })
    if (!organization) {
      throw new HttpError(404, 'Organization not found')
    }
    if (data.confirm_name !== organization.name) {
      throw new HttpError(400, 'Type the organization’s name exactly as it is shown')
    }
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.organization.updateMany({ where: { id: organizationId, status: 'ACTIVE' }, data: { status: 'DEACTIVATED' } })
      if (count === 0) {
        throw new HttpError(409, 'Only an active organization can be deactivated')
      }
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'ORGANIZATION_DEACTIVATED_BY_OWNER', organization_id: organizationId } })
    })
  },

  // Only undoes the owner's own deactivation; a suspension by Shigjetademy is never lifted here
  reactivateOrganization: async ({ organizationId, actorId, data }: ReactivateOrganizationParams) => {
    await checkPassword({ userId: actorId, password: data.password })
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.organization.updateMany({ where: { id: organizationId, status: 'DEACTIVATED' }, data: { status: 'ACTIVE' } })
      if (count === 0) {
        throw new HttpError(409, 'This organization isn’t deactivated')
      }
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'ORGANIZATION_REACTIVATED_BY_OWNER', organization_id: organizationId } })
    })
  },
}
