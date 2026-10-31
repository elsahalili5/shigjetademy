import type { AcademicHoliday, AcademicHolidayInput, AcademicTerm, AcademicTermInput } from '@shigjetademy/shared/academic-periods'

/** Terms and holidays: named date ranges inside one school year */
export type YearPeriodKind = 'term' | 'holiday'

export type YearPeriod = AcademicTerm | AcademicHoliday

export type YearPeriodInput = AcademicTermInput | AcademicHolidayInput

/** Where each kind lives in the API path and on the year */
export const YEAR_PERIOD_KINDS = {
  term: { path: 'terms', field: 'terms', noun: 'term' },
  holiday: { path: 'holidays', field: 'holidays', noun: 'holiday' },
} as const satisfies Record<YearPeriodKind, { path: string; field: 'terms' | 'holidays'; noun: string }>
