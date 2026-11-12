// A lecturer writes notes about a student to their guardians. The lecturer reads the conversations they started, a guardian reads the notes about their child.
import { z } from 'zod'
import type { GuardianRelationship } from './guardians.ts'

export const PARENT_NOTE_MAX = 2000

/** A note to send: trimmed, never empty */
export const parentNoteSchema = z.object({
  body: z.string().trim().min(1, 'Write a note first.').max(PARENT_NOTE_MAX, `Keep the note under ${PARENT_NOTE_MAX} characters.`),
})

export type ParentNoteInput = z.infer<typeof parentNoteSchema>

type NoteStudent = {
  id: string
  first_name: string
  last_name: string
}

/** A group the lecturer currently teaches, with its active students */
export type ParentNoteGroup = {
  id: string
  name: string
  students: NoteStudent[]
}

/** One note the lecturer sent; created_at is an ISO timestamp in UTC */
export type ParentNote = {
  id: string
  body: string
  created_at: string
}

/** A student the lecturer has written to, with the latest note, for the conversation list: most recently written first */
export type ParentNoteConversation = {
  student: NoteStudent
  last_note: ParentNote
}

/** A guardian as the lecturer sees them next to the conversation */
export type ParentNoteGuardian = {
  id: string
  first_name: string
  last_name: string
  relationship: GuardianRelationship
  email: string | null
  phone: string | null
}

/** The whole conversation with one student's guardians: every note the lecturer sent, oldest first */
export type ParentNoteThread = {
  student: NoteStudent
  guardians: ParentNoteGuardian[]
  notes: ParentNote[]
}

/** A note as a guardian reads it on their child's page, with who wrote it */
export type MyChildNote = ParentNote & {
  author: { first_name: string; last_name: string }
}

/** A note on the guardian's Notes page, which spans all their children: the note, plus which child it is about */
export type MyNote = MyChildNote & {
  student: NoteStudent
}
