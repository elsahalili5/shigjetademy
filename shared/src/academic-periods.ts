// The academic year, term and holiday forms and the endpoints that store them share these schemas.
// Dates are calendar days as 'YYYY-MM-DD', so they compare correctly as strings.
import { z } from 'zod'

const NAME_MAX = 80

const periodName = (requiredMessage: string) => z.string().trim().min(1, requiredMessage).max(NAME_MAX, `Keep the name under ${NAME_MAX} characters.`)

const periodFields = (requiredMessage: string) => ({
  name: periodName(requiredMessage),
  start_date: z.iso.date('Enter the start date.'),
  end_date: z.iso.date('Enter the end date.'),
})

/** Two calendar days as 'YYYY-MM-DD', both included */
export type DayRange = {
  start_date: string
  end_date: string
}

const endsAfterStart = ({ start_date, end_date }: DayRange) => end_date > start_date

export const academicYearSchema = z
  .object({ ...periodFields('Enter the year’s name.'), is_current: z.boolean() })
  .refine(endsAfterStart, { path: ['end_date'], message: 'End the year after it starts.' })

export type AcademicYearInput = z.infer<typeof academicYearSchema>

/** Deleting the current year while others remain names the one that takes over */
export const removeAcademicYearQuerySchema = z.object({
  newCurrentId: z.uuid('Choose the new current year.').optional(),
})

export type RemoveAcademicYearQuery = z.infer<typeof removeAcademicYearQuerySchema>

export const academicTermSchema = z
  .object(periodFields('Enter the term’s name.'))
  .refine(endsAfterStart, { path: ['end_date'], message: 'End the term after it starts.' })

export type AcademicTermInput = z.infer<typeof academicTermSchema>

/** A holiday may last one day, so it may end on the day it starts */
export const academicHolidaySchema = z
  .object(periodFields('Enter the holiday’s name.'))
  .refine(({ start_date, end_date }) => end_date >= start_date, { path: ['end_date'], message: 'A holiday can’t end before it starts.' })

export type AcademicHolidayInput = z.infer<typeof academicHolidaySchema>

/** A named range of calendar days: a year, a term or a holiday */
export type AcademicPeriod = DayRange & {
  id: string
  name: string
}

export type AcademicTerm = AcademicPeriod

export type AcademicHoliday = AcademicPeriod

/** A year with its terms and holidays, each in date order */
export type AcademicYear = AcademicPeriod & {
  is_current: boolean
  terms: AcademicTerm[]
  holidays: AcademicHoliday[]
}
