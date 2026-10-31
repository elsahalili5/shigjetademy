import type { AcademicYear } from '@shigjetademy/shared/academic-periods'

// The same order as the server: the current year first, then the newest
const byCurrentThenNewest = (a: AcademicYear, b: AcademicYear) => Number(b.is_current) - Number(a.is_current) || b.start_date.localeCompare(a.start_date)

type WithSavedYearParams = {
  years: AcademicYear[]
  saved: AcademicYear
}

/** The cached list with a created or edited year in it; a new current year takes over from the old one */
export const withSavedYear = ({ years, saved }: WithSavedYearParams) => {
  const others = years.filter((year) => year.id !== saved.id).map((year) => (saved.is_current ? { ...year, is_current: false } : year))
  return [...others, saved].sort(byCurrentThenNewest)
}

type WithoutYearParams = {
  years: AcademicYear[]
  yearId: string
  newCurrentId?: string
}

/** The cached list once a year is deleted, with the replacement as the new current year */
export const withoutYear = ({ years, yearId, newCurrentId }: WithoutYearParams) =>
  years
    .filter((year) => year.id !== yearId)
    .map((year) => (year.id === newCurrentId ? { ...year, is_current: true } : year))
    .sort(byCurrentThenNewest)
