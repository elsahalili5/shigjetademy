import { getStudentName } from '@shigjetademy/shared/students'
import type { GroupStudentOption } from '@shigjetademy/shared/groups'

/** "Arta Gashi · STU-0007" */
export const getStudentOptionLabel = (student: GroupStudentOption) => `${getStudentName(student)} · ${student.student_number}`
