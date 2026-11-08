// A lecturer's running, append-only log about a student, written in the context of one shared group they currently teach together.
// Write access, and which groups count as "shared", come straight from the student roster's own access check: loadSharedGroups.
import type { StudentNoteEntry } from '@shigjetademy/shared/student-notes'
import { getStudentName } from '@shigjetademy/shared/students'
import { HttpError } from '@lib/httpError.ts'
import { lockOrganization } from '@lib/organization-lock.ts'
import { prisma } from '@lib/prisma.ts'
import type { StudentRosterViewer } from '@modules/student-roster/student-roster.service.ts'
import { loadSharedGroups } from '@modules/student-roster/student-roster.service.ts'

type ListNotesParams = {
  organizationId: string
  viewer: StudentRosterViewer
  studentId: string
}

type StoredNote = {
  id: string
  body: string
  created_at: Date
  group: { id: string; name: string }
  lecturer: { first_name: string; last_name: string } | null
}

// Shared with the student home service, which reads the same shape for My school's own "no staff-only data beyond the author's name" rule
export const toNoteEntry = (note: StoredNote): StudentNoteEntry => ({ id: note.id, body: note.body, group: note.group, lecturer: note.lecturer, created_at: note.created_at.toISOString() })

export const noteSelect = { id: true, body: true, created_at: true, group: { select: { id: true, name: true } }, lecturer: { select: { first_name: true, last_name: true } } } as const

type WriteNoteParams = ListNotesParams & {
  groupId: string
  body: string
}

export const StudentNoteService = {
  // Filtered to the groups this viewer currently shares with the student, the same scope as their attendance on this page
  listNotes: async ({ organizationId, viewer, studentId }: ListNotesParams): Promise<StudentNoteEntry[]> => {
    const { sharedGroups } = await loadSharedGroups({ db: prisma, organizationId, viewer, studentId })
    const notes = await prisma.studentNote.findMany({
      where: { student_id: studentId, group_id: { in: sharedGroups.map((group) => group.id) } },
      orderBy: { created_at: 'desc' },
      select: noteSelect,
    })
    return notes.map(toNoteEntry)
  },

  // 404/403 come from loadSharedGroups; 400 when the group isn't one the viewer currently shares with this student
  writeNote: ({ organizationId, viewer, studentId, groupId, body }: WriteNoteParams): Promise<StudentNoteEntry> =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const { student, sharedGroups } = await loadSharedGroups({ db: tx, organizationId, viewer, studentId })
      const group = sharedGroups.find((item) => item.id === groupId)
      if (!group) {
        throw new HttpError(400, 'Choose one of your shared groups with this student.')
      }
      const note = await tx.studentNote.create({ data: { student_id: studentId, group_id: group.id, lecturer_id: viewer.userId, body }, select: noteSelect })
      await tx.activityLog.create({
        data: { actor_id: viewer.userId, action: 'STUDENT_NOTE_ADDED', organization_id: organizationId, subject_name: `${getStudentName(student)} in ${group.name}` },
      })
      return toNoteEntry(note)
    }),
}
