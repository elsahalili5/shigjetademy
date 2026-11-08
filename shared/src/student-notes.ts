// A lecturer's running, append-only log about a student, written in the context of one shared group.
// A new, separate concept from Student.notes (students.ts): that field stays the admin-only record note, untouched here.
import { z } from 'zod'

// Same limit as the student record's own notes field, for the same free-text note shape
export const STUDENT_NOTE_BODY_MAX = 500

export const createStudentNoteSchema = z.object({
  group_id: z.uuid('Choose a group.'),
  body: z.string().trim().min(1, 'Enter a note.').max(STUDENT_NOTE_BODY_MAX, `Keep it under ${STUDENT_NOTE_BODY_MAX} characters.`),
})

export type CreateStudentNoteInput = z.infer<typeof createStudentNoteSchema>

/** One note, newest first in the list: who wrote it, about which group, and when */
export type StudentNoteEntry = {
  id: string
  body: string
  group: { id: string; name: string }
  /** Null once the lecturer who wrote it is deleted; the note stays */
  lecturer: { first_name: string; last_name: string } | null
  created_at: string
}
