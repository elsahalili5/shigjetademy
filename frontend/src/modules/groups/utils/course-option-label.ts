import type { CourseOption } from '@shigjetademy/shared/courses'

/** "Mathematics", or "Old Latin (archived)" */
export const getCourseOptionLabel = (course: CourseOption) => (course.status === 'ARCHIVED' ? `${course.name} (archived)` : course.name)
