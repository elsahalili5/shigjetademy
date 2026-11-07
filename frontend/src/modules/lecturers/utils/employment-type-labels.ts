import type { EmploymentType } from '@shigjetademy/shared/lecturers'

export const EMPLOYMENT_TYPE_LABELS = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
} as const satisfies Record<EmploymentType, string>
