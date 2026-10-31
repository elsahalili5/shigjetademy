import { z } from 'zod'

export { academicHolidaySchema, academicTermSchema, academicYearSchema, removeAcademicYearQuerySchema } from '@shigjetademy/shared/academic-periods'

export const organizationParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
})

export const yearParamSchema = organizationParamSchema.extend({
  yearId: z.uuid('Invalid year id'),
})

export const termParamSchema = yearParamSchema.extend({
  termId: z.uuid('Invalid term id'),
})

export const holidayParamSchema = yearParamSchema.extend({
  holidayId: z.uuid('Invalid holiday id'),
})
