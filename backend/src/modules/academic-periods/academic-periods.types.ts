import type { z } from 'zod'
import type { holidayParamSchema, organizationParamSchema, termParamSchema, yearParamSchema } from './academic-periods.schema.ts'

export type {
  AcademicHolidayInput,
  AcademicTermInput,
  AcademicYearInput,
  RemoveAcademicYearQuery,
} from '@shigjetademy/shared/academic-periods'

export type OrganizationParam = z.infer<typeof organizationParamSchema>
export type YearParam = z.infer<typeof yearParamSchema>
export type TermParam = z.infer<typeof termParamSchema>
export type HolidayParam = z.infer<typeof holidayParamSchema>
