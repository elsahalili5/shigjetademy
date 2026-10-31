import type { Prisma } from '@generated/prisma/client.ts'
import { HttpError } from '@lib/httpError.ts'

/** A 'YYYY-MM-DD' calendar day as the Date Prisma stores in a @db.Date column */
export const toDate = (day: string) => new Date(`${day}T00:00:00.000Z`)

/** A @db.Date column back as its 'YYYY-MM-DD' calendar day */
export const toDay = (date: Date) => date.toISOString().slice(0, 10)

type Period = {
  start_date: Date
  end_date: Date
}

/** A stored period with its dates as calendar days */
export const toPeriodJson = <T extends Period>(period: T) => ({ ...period, start_date: toDay(period.start_date), end_date: toDay(period.end_date) })

export const periodSelect = { id: true, name: true, start_date: true, end_date: true } as const

export type OrganizationScope = {
  tx: Prisma.TransactionClient
  organizationId: string
}

/** Academic period writes for one organization run one at a time, so overlap and current-year checks can't race */
export const lockOrganization = ({ tx, organizationId }: OrganizationScope) =>
  tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId}::uuid FOR UPDATE`

type FindYearParams = OrganizationScope & {
  yearId: string
}

/** The organization's year, or a 404 when the id belongs to no year of this organization */
export const findYear = async ({ tx, organizationId, yearId }: FindYearParams) => {
  const year = await tx.academicYear.findFirst({ where: { id: yearId, organization_id: organizationId }, select: { ...periodSelect, is_current: true } })
  if (!year) {
    throw new HttpError(404, 'Academic year not found')
  }
  return year
}

type DateRange = {
  start: Date
  end: Date
}

type RefuseOutsideYearParams = {
  year: { start_date: Date; end_date: Date }
  range: DateRange
  noun: 'term' | 'holiday'
}

/** Terms and holidays fall inside their year */
export const refuseOutsideYear = ({ year, range, noun }: RefuseOutsideYearParams) => {
  if (range.start < year.start_date || range.end > year.end_date) {
    throw new HttpError(400, `The ${noun} must fall inside the year (${toDay(year.start_date)} to ${toDay(year.end_date)})`)
  }
}

/** Periods that share at least one day with the range, counting both ends */
export const overlapping = ({ start, end }: DateRange) => ({ start_date: { lte: end }, end_date: { gte: start } })

/** Periods that reach outside the range */
export const outside = ({ start, end }: DateRange) => ({ OR: [{ start_date: { lt: start } }, { end_date: { gt: end } }] })
