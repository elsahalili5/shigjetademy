import { getLecturerName } from '@shigjetademy/shared/lecturers'
import type { Group, GroupLecturer, GroupLecturerOption } from '@shigjetademy/shared/groups'

/** "Arben Hoxha · Mathematics, Physics", or just the name without subjects */
const getLecturerOptionLabel = (option: GroupLecturerOption) => [getLecturerName(option), option.subjects.join(', ')].filter(Boolean).join(' · ')

/** "Arben Hoxha", or "Arben Hoxha (archived)" */
export const getGroupLecturerName = (lecturer: GroupLecturer) => (lecturer.status === 'ARCHIVED' ? `${getLecturerName(lecturer)} (archived)` : getLecturerName(lecturer))

/** Who the group is heading to: the change to come when there is one, else the current lecturer */
export const getPlannedLecturer = (group: Group) => (group.lecturer_change ? group.lecturer_change.lecturer : group.lecturer)

type GetLecturerChoicesParams = {
  options: GroupLecturerOption[]
  /** Lecturers already on the record, who stay choosable even when archived, so the form doesn't lose them */
  kept: (GroupLecturer | null | undefined)[]
}

/** The active lecturers with their subjects, then anyone kept who isn't one of them */
export const getLecturerChoices = ({ options, kept }: GetLecturerChoicesParams) => {
  const choices = new Map(options.map((option) => [option.id, getLecturerOptionLabel(option)]))
  for (const lecturer of kept) {
    if (lecturer && !choices.has(lecturer.id)) choices.set(lecturer.id, getGroupLecturerName(lecturer))
  }
  return [...choices].map(([id, label]) => ({ id, label }))
}
