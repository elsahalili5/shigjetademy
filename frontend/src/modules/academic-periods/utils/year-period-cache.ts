import type { AcademicYear } from '@shigjetademy/shared/academic-periods'
import { YEAR_PERIOD_KINDS } from './year-periods'
import type { YearPeriod, YearPeriodKind } from './year-periods'

// The same order as the server: by start date
const byStartDate = (a: YearPeriod, b: YearPeriod) => a.start_date.localeCompare(b.start_date)

type WithSavedYearPeriodParams = {
  years: AcademicYear[]
  yearId: string
  periodKind: YearPeriodKind
  saved: YearPeriod
}

/** The cached years with a created or edited term or holiday in its year */
export const withSavedYearPeriod = ({ years, yearId, periodKind, saved }: WithSavedYearPeriodParams) => {
  const { field } = YEAR_PERIOD_KINDS[periodKind]
  return years.map((year) => (year.id === yearId ? { ...year, [field]: [...year[field].filter((period) => period.id !== saved.id), saved].sort(byStartDate) } : year))
}

type WithoutYearPeriodParams = {
  years: AcademicYear[]
  yearId: string
  periodKind: YearPeriodKind
  periodId: string
}

/** The cached years once a term or holiday is deleted */
export const withoutYearPeriod = ({ years, yearId, periodKind, periodId }: WithoutYearPeriodParams) => {
  const { field } = YEAR_PERIOD_KINDS[periodKind]
  return years.map((year) => (year.id === yearId ? { ...year, [field]: year[field].filter((period) => period.id !== periodId) } : year))
}
