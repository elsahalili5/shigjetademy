import type { Prisma } from '@generated/prisma/client.ts'
import { prisma } from '@lib/prisma.ts'
import { HttpError } from '@lib/httpError.ts'
import type { AcademicYearInput } from './academic-periods.types.ts'
import { toDate } from '@lib/calendar-day.ts'
import { lockOrganization } from '@lib/organization-lock.ts'
import type { OrganizationScope } from '@lib/organization-lock.ts'
import { findYear, outside, overlapping, periodSelect, toPeriodJson } from './academic-periods.utils.ts'

const byDate = { start_date: 'asc' } as const

const yearSelect = {
  ...periodSelect,
  is_current: true,
  terms: { select: periodSelect, orderBy: byDate },
  holidays: { select: periodSelect, orderBy: byDate },
} as const

type StoredYear = Prisma.AcademicYearGetPayload<{ select: typeof yearSelect }>

const toYearJson = (year: StoredYear) => ({ ...toPeriodJson(year), terms: year.terms.map(toPeriodJson), holidays: year.holidays.map(toPeriodJson) })

const unsetCurrent = ({ tx, organizationId }: OrganizationScope) =>
  tx.academicYear.updateMany({ where: { organization_id: organizationId, is_current: true }, data: { is_current: false } })

type RefuseOverlapParams = OrganizationScope & {
  data: AcademicYearInput
  /** The year being edited, which can't overlap itself */
  yearId?: string
}

const refuseOverlap = async ({ tx, organizationId, data, yearId }: RefuseOverlapParams) => {
  const clash = await tx.academicYear.findFirst({
    where: { organization_id: organizationId, id: yearId ? { not: yearId } : undefined, ...overlapping({ start: toDate(data.start_date), end: toDate(data.end_date) }) },
    select: { name: true },
  })
  if (clash) {
    throw new HttpError(409, `These dates overlap ${clash.name}`)
  }
}

const toYearData = (data: AcademicYearInput) => ({ name: data.name, start_date: toDate(data.start_date), end_date: toDate(data.end_date) })

type CreateYearParams = {
  organizationId: string
  actorId: string
  data: AcademicYearInput
}

type YearChangeParams = {
  organizationId: string
  yearId: string
  actorId: string
}

type UpdateYearParams = YearChangeParams & {
  data: AcademicYearInput
}

type RemoveYearParams = YearChangeParams & {
  newCurrentId?: string
}

export const AcademicYearService = {
  listYears: async (organizationId: string) => {
    const years = await prisma.academicYear.findMany({
      where: { organization_id: organizationId },
      orderBy: [{ is_current: 'desc' }, { start_date: 'desc' }],
      select: yearSelect,
    })
    return years.map(toYearJson)
  },

  // The first year is always current
  createYear: ({ organizationId, actorId, data }: CreateYearParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      await refuseOverlap({ tx, organizationId, data })
      const hasCurrent = (await tx.academicYear.count({ where: { organization_id: organizationId, is_current: true } })) > 0
      if (hasCurrent && data.is_current) {
        await unsetCurrent({ tx, organizationId })
      }
      const year = await tx.academicYear.create({
        data: { organization_id: organizationId, ...toYearData(data), is_current: data.is_current || !hasCurrent },
        select: yearSelect,
      })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'ACADEMIC_YEAR_CREATED', organization_id: organizationId, subject_name: year.name } })
      return toYearJson(year)
    }),

  // The current year only stops being current when another one takes over; new dates must still hold its terms and holidays
  updateYear: ({ organizationId, yearId, actorId, data }: UpdateYearParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const current = await findYear({ tx, organizationId, yearId })
      if (current.is_current && !data.is_current) {
        throw new HttpError(409, 'Make another year current instead')
      }
      await refuseOverlap({ tx, organizationId, data, yearId })
      const range = { start: toDate(data.start_date), end: toDate(data.end_date) }
      const outsideCount =
        (await tx.academicTerm.count({ where: { academic_year_id: yearId, ...outside(range) } })) +
        (await tx.academicHoliday.count({ where: { academic_year_id: yearId, ...outside(range) } }))
      if (outsideCount > 0) {
        throw new HttpError(409, 'Some terms or holidays fall outside these dates')
      }
      if (data.is_current && !current.is_current) {
        await unsetCurrent({ tx, organizationId })
      }
      const year = await tx.academicYear.update({ where: { id: yearId }, data: { ...toYearData(data), is_current: data.is_current }, select: yearSelect })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'ACADEMIC_YEAR_UPDATED', organization_id: organizationId, subject_name: year.name } })
      return toYearJson(year)
    }),

  // Deleting the current year while others remain needs the one that takes over; its terms and holidays go with it
  removeYear: ({ organizationId, yearId, actorId, newCurrentId }: RemoveYearParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const current = await findYear({ tx, organizationId, yearId })
      const otherYears = { organization_id: organizationId, id: { not: yearId } }
      if (current.is_current && (await tx.academicYear.count({ where: otherYears })) > 0) {
        if (!newCurrentId) {
          throw new HttpError(409, 'Choose the new current year first')
        }
        const { count } = await tx.academicYear.updateMany({ where: { ...otherYears, id: { equals: newCurrentId, not: yearId } }, data: { is_current: true } })
        if (count === 0) {
          throw new HttpError(400, 'The new current year must be another year of this organization')
        }
      }
      await tx.academicYear.delete({ where: { id: yearId } })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'ACADEMIC_YEAR_REMOVED', organization_id: organizationId, subject_name: current.name } })
    }),
}
