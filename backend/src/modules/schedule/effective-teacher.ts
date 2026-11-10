import { toDay } from '@lib/calendar-day.ts'
import { getLecturerIdOn } from '@modules/groups/lecturer-timeline.ts'
import type { TimelineRow } from '@modules/groups/lecturer-timeline.ts'

type LecturerRef = {
  id: string
  first_name: string
  last_name: string
}

type StoredAssignment = {
  start_date: Date
  end_date: Date | null
  lecturer: LecturerRef
}

type StoredSubstitution = {
  start_date: Date
  end_date: Date
  cancelled_at: Date | null
  lecturer: LecturerRef
}

type GetEffectiveTeacherParams = {
  assignments: StoredAssignment[]
  substitutions: StoredSubstitution[]
  today: string
}

/** The lecturer who actually teaches this group today: a substitution covering today if one exists, else the permanent assignment covering today, reusing the lecturer timeline's resolution */
export const getEffectiveTeacher = ({ assignments, substitutions, today }: GetEffectiveTeacherParams): LecturerRef | null => {
  const covering = substitutions.find((substitution) => !substitution.cancelled_at && toDay(substitution.start_date) <= today && toDay(substitution.end_date) >= today)
  if (covering) return covering.lecturer

  const rows: TimelineRow[] = assignments.map((assignment) => ({ lecturer_id: assignment.lecturer.id, start_date: toDay(assignment.start_date), end_date: assignment.end_date && toDay(assignment.end_date) }))
  const lecturerId = getLecturerIdOn({ rows: rows.map((row, index) => ({ ...row, id: String(index) })), day: today })
  return assignments.find((assignment) => assignment.lecturer.id === lecturerId)?.lecturer ?? null
}
