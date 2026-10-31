import type { Prisma } from '@generated/prisma/client.ts'
import type { ActivityAction } from '@generated/prisma/enums.ts'
import { prisma } from '@lib/prisma.ts'
import { HttpError } from '@lib/httpError.ts'
import { toDate } from '@lib/calendar-day.ts'
import { lockOrganization } from '@lib/organization-lock.ts'
import type { AcademicTermInput } from './academic-periods.types.ts'
import { findYear, overlapping, periodSelect, refuseOutsideYear, toPeriodJson } from './academic-periods.utils.ts'

/** Terms and holidays: named date ranges inside one school year */
export type YearPeriodKind = 'term' | 'holiday'

// Terms and holidays take the same fields
type YearPeriodInput = AcademicTermInput

type StoredPeriod = { id: string; name: string; start_date: Date; end_date: Date }

type PeriodWhere = {
  id?: string | { not: string }
  academic_year_id: string
  start_date?: { lte: Date }
  end_date?: { gte: Date }
}

type PeriodData = { name: string; start_date: Date; end_date: Date }

/** What the service needs from the term and holiday tables, which share one shape */
type PeriodTable = {
  findFirst: (args: { where: PeriodWhere; select: { name: true } }) => Promise<{ name: string } | null>
  create: (args: { data: PeriodData & { academic_year_id: string }; select: typeof periodSelect }) => Promise<StoredPeriod>
  update: (args: { where: { id: string }; data: PeriodData; select: typeof periodSelect }) => Promise<StoredPeriod>
  delete: (args: { where: { id: string } }) => Promise<unknown>
}

type YearPeriodKindConfig = {
  noun: YearPeriodKind
  notFound: string
  /** Terms of one year can't overlap each other; holidays may */
  mayOverlap: boolean
  actions: { created: ActivityAction; updated: ActivityAction; removed: ActivityAction }
  table: (tx: Prisma.TransactionClient) => PeriodTable
}

const KINDS = {
  term: {
    noun: 'term',
    notFound: 'Term not found',
    mayOverlap: false,
    actions: { created: 'ACADEMIC_TERM_CREATED', updated: 'ACADEMIC_TERM_UPDATED', removed: 'ACADEMIC_TERM_REMOVED' },
    table: (tx) => tx.academicTerm,
  },
  holiday: {
    noun: 'holiday',
    notFound: 'Holiday not found',
    mayOverlap: true,
    actions: { created: 'ACADEMIC_HOLIDAY_CREATED', updated: 'ACADEMIC_HOLIDAY_UPDATED', removed: 'ACADEMIC_HOLIDAY_REMOVED' },
    table: (tx) => tx.academicHoliday,
  },
} as const satisfies Record<YearPeriodKind, YearPeriodKindConfig>

type YearScope = {
  organizationId: string
  yearId: string
  actorId: string
}

type CreatePeriodParams = YearScope & {
  data: YearPeriodInput
}

type PeriodChangeParams = YearScope & {
  periodId: string
}

type UpdatePeriodParams = PeriodChangeParams & {
  data: YearPeriodInput
}

/** Adds, edits and deletes the terms or the holidays of a year; each change goes to the activity log in the same transaction */
export const yearPeriodService = (kind: YearPeriodKind) => {
  const config: YearPeriodKindConfig = KINDS[kind]

  type CheckPeriodParams = {
    tx: Prisma.TransactionClient
    organizationId: string
    yearId: string
    data: YearPeriodInput
    /** The period being edited, which can't overlap itself */
    periodId?: string
  }

  /** The dates as stored, once they fall inside the year and, for terms, clear the year's other terms */
  const checkPeriod = async ({ tx, organizationId, yearId, data, periodId }: CheckPeriodParams) => {
    const year = await findYear({ tx, organizationId, yearId })
    const range = { start: toDate(data.start_date), end: toDate(data.end_date) }
    refuseOutsideYear({ year, range, noun: config.noun })
    if (!config.mayOverlap) {
      const clash = await config.table(tx).findFirst({
        where: { academic_year_id: yearId, id: periodId ? { not: periodId } : undefined, ...overlapping(range) },
        select: { name: true },
      })
      if (clash) {
        throw new HttpError(409, `These dates overlap ${clash.name}`)
      }
    }
    return { name: data.name, start_date: range.start, end_date: range.end }
  }

  type FindPeriodParams = {
    tx: Prisma.TransactionClient
    yearId: string
    periodId: string
  }

  const findPeriod = async ({ tx, yearId, periodId }: FindPeriodParams) => {
    const period = await config.table(tx).findFirst({ where: { id: periodId, academic_year_id: yearId }, select: { name: true } })
    if (!period) {
      throw new HttpError(404, config.notFound)
    }
    return period
  }

  return {
    create: ({ organizationId, yearId, actorId, data }: CreatePeriodParams) =>
      prisma.$transaction(async (tx) => {
        await lockOrganization({ tx, organizationId })
        const periodData = await checkPeriod({ tx, organizationId, yearId, data })
        const period = await config.table(tx).create({ data: { academic_year_id: yearId, ...periodData }, select: periodSelect })
        await tx.activityLog.create({ data: { actor_id: actorId, action: config.actions.created, organization_id: organizationId, subject_name: period.name } })
        return toPeriodJson(period)
      }),

    update: ({ organizationId, yearId, periodId, actorId, data }: UpdatePeriodParams) =>
      prisma.$transaction(async (tx) => {
        await lockOrganization({ tx, organizationId })
        await findPeriod({ tx, yearId, periodId })
        const periodData = await checkPeriod({ tx, organizationId, yearId, data, periodId })
        const period = await config.table(tx).update({ where: { id: periodId }, data: periodData, select: periodSelect })
        await tx.activityLog.create({ data: { actor_id: actorId, action: config.actions.updated, organization_id: organizationId, subject_name: period.name } })
        return toPeriodJson(period)
      }),

    remove: ({ organizationId, yearId, periodId, actorId }: PeriodChangeParams) =>
      prisma.$transaction(async (tx) => {
        await lockOrganization({ tx, organizationId })
        await findYear({ tx, organizationId, yearId })
        const period = await findPeriod({ tx, yearId, periodId })
        await config.table(tx).delete({ where: { id: periodId } })
        await tx.activityLog.create({ data: { actor_id: actorId, action: config.actions.removed, organization_id: organizationId, subject_name: period.name } })
      }),
  }
}
