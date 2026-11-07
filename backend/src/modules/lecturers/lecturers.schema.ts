import { z } from 'zod'

export { lecturerSchema, listLecturersQuerySchema } from '@shigjetademy/shared/lecturers'

export const lecturerParamSchema = z.object({
  organizationId: z.uuid('Invalid organization id'),
  lecturerId: z.uuid('Invalid lecturer id'),
})
