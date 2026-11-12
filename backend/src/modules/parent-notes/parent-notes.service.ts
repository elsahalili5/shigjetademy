// A lecturer's notes to the guardians of their students. The groups they may write from follow the roster's rule: the active groups where
// they are the permanent lecturer today. Notes are append-only, and each lecturer reads only the ones they sent.
import type { Prisma } from '@generated/prisma/client.ts'
import type { ParentNote, ParentNoteConversation, ParentNoteGroup, ParentNoteThread } from '@shigjetademy/shared/parent-notes'
import { toDate } from '@lib/calendar-day.ts'
import { getOrganizationToday } from '@lib/current-period.ts'
import { HttpError } from '@lib/httpError.ts'
import { prisma } from '@lib/prisma.ts'
import { findLecturerId } from '@modules/attendance/lecturer-lookup.ts'
import { activeEnrolments } from '@modules/groups/group-selects.ts'
import type { ParentNoteInput } from './parent-notes.types.ts'

type LecturerParams = {
  organizationId: string
  userId: string
}

type StudentParams = LecturerParams & {
  studentId: string
}

type SendNoteParams = StudentParams & {
  input: ParentNoteInput
}

const studentSelect = { id: true, first_name: true, last_name: true } as const satisfies Prisma.StudentSelect

const noteSelect = { id: true, body: true, created_at: true } as const satisfies Prisma.StudentParentNoteSelect

const toNote = ({ id, body, created_at }: { id: string; body: string; created_at: Date }): ParentNote => ({ id, body, created_at: created_at.toISOString() })

const byStudentName: Prisma.GroupEnrolmentOrderByWithRelationInput[] = [{ student: { first_name: 'asc' } }, { student: { last_name: 'asc' } }, { student: { id: 'asc' } }]

/** The lecturer record linked to the login; 403 when there is none */
const requireLecturerId = async ({ organizationId, userId }: LecturerParams) => {
  const lecturerId = await findLecturerId({ db: prisma, organizationId, userId })
  if (!lecturerId) {
    throw new HttpError(403, 'Your account isn’t linked to a lecturer record yet.')
  }
  return lecturerId
}

type CurrentGroupsParams = {
  organizationId: string
  lecturerId: string
}

/** The active groups this lecturer is the permanent lecturer of today, the same rule as the student roster */
const currentGroupsFilter = async ({ organizationId, lecturerId }: CurrentGroupsParams): Promise<Prisma.GroupWhereInput> => {
  const today = toDate(await getOrganizationToday({ db: prisma, organizationId }))
  return { organization_id: organizationId, status: 'ACTIVE', lecturer_assignments: { some: { lecturer_id: lecturerId, start_date: { lte: today }, OR: [{ end_date: null }, { end_date: { gte: today } }] } } }
}

/** 404 when the student isn't the organization's own; 403 when the lecturer doesn't currently teach them */
const requireTaughtStudent = async ({ organizationId, lecturerId, studentId }: CurrentGroupsParams & { studentId: string }) => {
  const student = await prisma.student.findFirst({ where: { id: studentId, organization_id: organizationId }, select: { ...studentSelect, status: true } })
  if (!student) {
    throw new HttpError(404, 'Student not found')
  }
  const groups = await currentGroupsFilter({ organizationId, lecturerId })
  const isTaught = (await prisma.groupEnrolment.count({ where: { student_id: studentId, ...activeEnrolments, group: groups } })) > 0
  if (!isTaught || student.status !== 'ACTIVE') {
    throw new HttpError(403, 'You don’t teach this student.')
  }
  return student
}

export const ParentNotesService = {
  /** The groups the lecturer teaches now with their active students; empty when they aren't linked to a record */
  listGroups: async ({ organizationId, userId }: LecturerParams): Promise<ParentNoteGroup[]> => {
    const lecturerId = await findLecturerId({ db: prisma, organizationId, userId })
    if (!lecturerId) return []
    const groups = await prisma.group.findMany({
      where: await currentGroupsFilter({ organizationId, lecturerId }),
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, enrolments: { where: { ...activeEnrolments, student: { status: 'ACTIVE' } }, orderBy: byStudentName, select: { student: { select: studentSelect } } } },
    })
    return groups.map(({ id, name, enrolments }) => ({ id, name, students: enrolments.map((enrolment) => enrolment.student) }))
  },

  /** One entry per student the lecturer wrote to, the one with the newest note first */
  listConversations: async ({ organizationId, userId }: LecturerParams): Promise<ParentNoteConversation[]> => {
    const lecturerId = await findLecturerId({ db: prisma, organizationId, userId })
    if (!lecturerId) return []
    const latest = await prisma.studentParentNote.findMany({
      where: { organization_id: organizationId, lecturer_id: lecturerId },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      distinct: ['student_id'],
      select: { ...noteSelect, student: { select: studentSelect } },
    })
    return latest.map(({ student, ...note }) => ({ student, last_note: toNote(note) }))
  },

  // A student who left the lecturer's groups stays readable once they were written to, so the history isn't lost
  getThread: async ({ organizationId, userId, studentId }: StudentParams): Promise<ParentNoteThread> => {
    const lecturerId = await requireLecturerId({ organizationId, userId })
    const notes = await prisma.studentParentNote.findMany({ where: { organization_id: organizationId, lecturer_id: lecturerId, student_id: studentId }, orderBy: [{ created_at: 'asc' }, { id: 'asc' }], select: noteSelect })
    if (notes.length === 0) {
      await requireTaughtStudent({ organizationId, lecturerId, studentId })
    }
    const student = await prisma.student.findFirstOrThrow({ where: { id: studentId, organization_id: organizationId }, select: studentSelect })
    const links = await prisma.studentGuardian.findMany({
      where: { student_id: studentId, guardian: { organization_id: organizationId } },
      orderBy: [{ created_at: 'asc' }, { guardian_id: 'asc' }],
      select: { relationship: true, guardian: { select: { id: true, first_name: true, last_name: true, email: true, phone: true } } },
    })
    const guardians = links.map(({ relationship, guardian }) => ({ ...guardian, relationship }))
    return { student, guardians, notes: notes.map(toNote) }
  },

  // 422 when the student has no guardian to read it, so a note never goes nowhere
  sendNote: async ({ organizationId, userId, studentId, input }: SendNoteParams): Promise<ParentNote> => {
    const lecturerId = await requireLecturerId({ organizationId, userId })
    const student = await requireTaughtStudent({ organizationId, lecturerId, studentId })
    const guardianCount = await prisma.studentGuardian.count({ where: { student_id: studentId, guardian: { organization_id: organizationId } } })
    if (guardianCount === 0) {
      throw new HttpError(422, `${student.first_name} has no parent or guardian on file yet. Ask the school to add one first.`)
    }
    const note = await prisma.studentParentNote.create({ data: { organization_id: organizationId, student_id: studentId, lecturer_id: lecturerId, body: input.body }, select: noteSelect })
    return toNote(note)
  },
}
