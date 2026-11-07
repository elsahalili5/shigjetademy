import type { OrganizationDepartment } from '@shigjetademy/shared/location'

/** What a course needs before one can be added; LOADING until the departments are in */
export type CourseSetup = 'LOADING' | 'NEEDS_DEPARTMENT' | 'READY'

/** A course needs a department */
export const getCourseSetup = (departments?: OrganizationDepartment[]): CourseSetup => {
  if (!departments) return 'LOADING'
  return departments.length === 0 ? 'NEEDS_DEPARTMENT' : 'READY'
}
