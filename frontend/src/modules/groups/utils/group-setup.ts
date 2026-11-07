import type { AcademicYear } from '@shigjetademy/shared/academic-periods'
import type { CourseOption } from '@shigjetademy/shared/courses'

/** What a group needs before one can be added; LOADING until both lists are in */
export type GroupSetup = 'LOADING' | 'NEEDS_YEAR' | 'NEEDS_COURSE' | 'READY'

type GetGroupSetupParams = {
  years?: AcademicYear[]
  courses?: CourseOption[]
}

/** A group needs a school year and a course that isn't archived */
export const getGroupSetup = ({ years, courses }: GetGroupSetupParams): GroupSetup => {
  if (!years || !courses) return 'LOADING'
  if (years.length === 0) return 'NEEDS_YEAR'
  return courses.some((course) => course.status === 'ACTIVE') ? 'READY' : 'NEEDS_COURSE'
}
