import type { Prisma } from '@generated/prisma/client.ts'
import { prisma } from '@lib/prisma.ts'
import { HttpError } from '@lib/httpError.ts'
import type { LocationInput } from './location.types.ts'

const locationSelect = { id: true, name: true, address: true, city: true, phone: true, is_main: true, created_at: true } as const

type OrganizationScope = {
  tx: Prisma.TransactionClient
  organizationId: string
}

/** Location writes for one organization run one at a time, so two of them can't both leave it with no main location or two */
export const lockOrganization = ({ tx, organizationId }: OrganizationScope) =>
  tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId}::uuid FOR UPDATE`

const unsetMain = ({ tx, organizationId }: OrganizationScope) =>
  tx.location.updateMany({ where: { organization_id: organizationId, is_main: true }, data: { is_main: false } })

// Optional fields come in as '' when left empty and are stored as null
const toLocationData = (data: LocationInput) => ({
  name: data.name,
  address: data.address || null,
  city: data.city || null,
  phone: data.phone || null,
})

type CreateLocationParams = {
  organizationId: string
  actorId: string
  data: LocationInput
}

type LocationChangeParams = {
  organizationId: string
  locationId: string
  actorId: string
}

type UpdateLocationParams = LocationChangeParams & {
  data: LocationInput
}

type RemoveLocationParams = LocationChangeParams & {
  newMainId?: string
}

export const LocationService = {
  listLocations: (organizationId: string) =>
    prisma.location.findMany({
      where: { organization_id: organizationId },
      orderBy: [{ is_main: 'desc' }, { created_at: 'asc' }],
      select: locationSelect,
    }),

  createLocation: ({ organizationId, actorId, data }: CreateLocationParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const hasMain = (await tx.location.count({ where: { organization_id: organizationId, is_main: true } })) > 0
      if (hasMain && data.is_main) {
        await unsetMain({ tx, organizationId })
      }
      const location = await tx.location.create({
        data: { organization_id: organizationId, ...toLocationData(data), is_main: data.is_main || !hasMain },
        select: locationSelect,
      })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'LOCATION_CREATED', organization_id: organizationId, subject_name: location.name } })
      return location
    }),

  // The main location only stops being main when another one takes over
  updateLocation: ({ organizationId, locationId, actorId, data }: UpdateLocationParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const current = await tx.location.findFirst({ where: { id: locationId, organization_id: organizationId }, select: { is_main: true } })
      if (!current) {
        throw new HttpError(404, 'Location not found')
      }
      if (current.is_main && !data.is_main) {
        throw new HttpError(409, 'Make another location the main one instead')
      }
      if (data.is_main && !current.is_main) {
        await unsetMain({ tx, organizationId })
      }
      const location = await tx.location.update({ where: { id: locationId }, data: { ...toLocationData(data), is_main: data.is_main }, select: locationSelect })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'LOCATION_UPDATED', organization_id: organizationId, subject_name: location.name } })
      return location
    }),

  // Removing the main location while others remain needs the one that takes over; its departments stay, without a location
  removeLocation: ({ organizationId, locationId, actorId, newMainId }: RemoveLocationParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const current = await tx.location.findFirst({ where: { id: locationId, organization_id: organizationId }, select: { name: true, is_main: true } })
      if (!current) {
        throw new HttpError(404, 'Location not found')
      }
      const otherLocations = { organization_id: organizationId, id: { not: locationId } }
      if (current.is_main && (await tx.location.count({ where: otherLocations })) > 0) {
        if (!newMainId) {
          throw new HttpError(409, 'Choose the new main location first')
        }
        const { count } = await tx.location.updateMany({ where: { ...otherLocations, id: { equals: newMainId, not: locationId } }, data: { is_main: true } })
        if (count === 0) {
          throw new HttpError(400, 'The new main location must be another location of this organization')
        }
      }
      await tx.location.delete({ where: { id: locationId } })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'LOCATION_REMOVED', organization_id: organizationId, subject_name: current.name } })
    }),
}
