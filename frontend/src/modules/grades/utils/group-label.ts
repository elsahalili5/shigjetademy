import type { GradeGroup } from '@shigjetademy/shared/grades'

/** A group with its course, and whether it is archived, as a picker lists it */
export const getGroupLabel = (group: GradeGroup) => `${group.name} · ${group.course_name}${group.is_archived ? ' (archived)' : ''}`
