import type { Prisma } from '@generated/prisma/client.ts'
import { getStudentName } from '@shigjetademy/shared/students'
import { toDate, toDay } from '@lib/calendar-day.ts'
import { HttpError } from '@lib/httpError.ts'
import { lockOrganization } from '@lib/organization-lock.ts'
import type { OrganizationScope } from '@lib/organization-lock.ts'
import { prisma } from '@lib/prisma.ts'
import type { CreateStudentInput, ListStudentsQuery, StudentLoginStatus, StudentStatus, UpdateStudentInput } from './students.types.ts'

const studentSelect = {
  id: true,
  first_name: true,
  last_name: true,
  date_of_birth: true,
  student_number: true,
  enrolled_on: true,
  status: true,
  notes: true,
  created_at: true,
  // Read only to derive login_status; the user id itself never leaves the server
  user_id: true,
  invitations: { where: { status: 'PENDING' }, select: { email: true, expires_at: true }, orderBy: { created_at: 'desc' }, take: 1 },
} as const satisfies Prisma.StudentSelect

type StoredStudent = Prisma.StudentGetPayload<{ select: typeof studentSelect }>

const toStudentJson = ({ date_of_birth, enrolled_on, user_id, invitations, ...student }: StoredStudent) => {
  // A pending invitation past its expiry no longer counts
  const invitation = invitations.find((item) => item.expires_at > new Date()) ?? null
  const loginStatus: StudentLoginStatus = user_id ? 'LINKED' : invitation ? 'INVITED' : 'NONE'
  return {
    ...student,
    date_of_birth: date_of_birth ? toDay(date_of_birth) : null,
    enrolled_on: toDay(enrolled_on),
    login_status: loginStatus,
    invitation: loginStatus === 'INVITED' ? invitation : null,
  }
}

const byName = [{ last_name: 'asc' }, { first_name: 'asc' }, { id: 'asc' }] as const satisfies Prisma.StudentOrderByWithRelationInput[]

const STUDENT_NUMBER_PREFIX = 'STU-'

const STUDENT_NUMBER_DIGITS = 4

/** One past the highest STU-number the organization has used, archived students included, so a number is never handed out twice */
const nextStudentNumber = async ({ tx, organizationId }: OrganizationScope) => {
  // Up to 9 digits, so a hand-typed number that is far too long can't overflow the cast
  const [row] = await tx.$queryRaw<{ highest: number | null }[]>`
    SELECT MAX(substring(student_number FROM '^STU-([0-9]{1,9})$')::int) AS highest
    FROM "Student" WHERE organization_id = ${organizationId}::uuid`
  return `${STUDENT_NUMBER_PREFIX}${String((row?.highest ?? 0) + 1).padStart(STUDENT_NUMBER_DIGITS, '0')}`
}

type RefuseTakenNumberParams = OrganizationScope & {
  studentNumber: string
  /** The student being edited, who may keep their own number */
  studentId?: string
}

const refuseTakenNumber = async ({ tx, organizationId, studentNumber, studentId }: RefuseTakenNumberParams) => {
  const taken = await tx.student.findFirst({
    where: { organization_id: organizationId, student_number: studentNumber, id: studentId ? { not: studentId } : undefined },
    select: { id: true },
  })
  if (taken) {
    const message = `Another student already has the number ${studentNumber}.`
    throw new HttpError(409, message, { fieldErrors: { student_number: [message] } })
  }
}

type FindStudentParams = {
  tx: Prisma.TransactionClient
  organizationId: string
  studentId: string
}

/** The organization's student, or a 404 when the id belongs to no student of this organization */
const findStudent = async ({ tx, organizationId, studentId }: FindStudentParams) => {
  const student = await tx.student.findFirst({ where: { id: studentId, organization_id: organizationId }, select: studentSelect })
  if (!student) {
    throw new HttpError(404, 'Student not found')
  }
  return student
}

// Optional fields come in as '' when left empty and are stored as null
const toStudentData = (data: UpdateStudentInput) => ({
  first_name: data.first_name,
  last_name: data.last_name,
  date_of_birth: data.date_of_birth ? toDate(data.date_of_birth) : null,
  enrolled_on: toDate(data.enrolled_on),
  student_number: data.student_number,
  notes: data.notes || null,
})

/** Every word of the search matches a first name, a last name or a student number, in any case */
const matching = (search: string): Prisma.StudentWhereInput => ({
  AND: search
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => ({
      OR: [
        { first_name: { contains: word, mode: 'insensitive' } },
        { last_name: { contains: word, mode: 'insensitive' } },
        { student_number: { contains: word, mode: 'insensitive' } },
      ],
    })),
})

type ListStudentsParams = {
  organizationId: string
  query: ListStudentsQuery
}

type GetStudentParams = {
  organizationId: string
  studentId: string
}

type CreateStudentParams = {
  organizationId: string
  actorId: string
  data: CreateStudentInput
}

type StudentChangeParams = {
  organizationId: string
  studentId: string
  actorId: string
}

type UpdateStudentParams = StudentChangeParams & {
  data: UpdateStudentInput
}

type SetStudentStatusParams = StudentChangeParams & {
  status: StudentStatus
}

type RevokePendingInvitationParams = FindStudentParams & {
  actorId: string
}

/** An archived student can't be invited, so archiving withdraws their open login invitation */
const revokePendingInvitation = async ({ tx, organizationId, studentId, actorId }: RevokePendingInvitationParams) => {
  const pending = await tx.invitation.findFirst({ where: { organization_id: organizationId, student_id: studentId, status: 'PENDING' }, select: { id: true, email: true } })
  if (!pending) return
  await tx.invitation.update({ where: { id: pending.id }, data: { status: 'REVOKED', revoked_at: new Date() } })
  await tx.activityLog.create({ data: { actor_id: actorId, action: 'INVITATION_REVOKED', organization_id: organizationId, subject_name: pending.email } })
}

const STATUS_CHANGE = {
  ARCHIVED: { action: 'STUDENT_ARCHIVED', alreadyMessage: 'This student is already archived.' },
  ACTIVE: { action: 'STUDENT_RESTORED', alreadyMessage: 'This student is already active.' },
} as const satisfies Record<StudentStatus, { action: Prisma.ActivityLogCreateInput['action']; alreadyMessage: string }>

export const StudentService = {
  // Counts follow the search, so each status tab says how many of its students match
  listStudents: async ({ organizationId, query }: ListStudentsParams) => {
    const where = { organization_id: organizationId, ...matching(query.search) }
    const [students, groups] = await Promise.all([
      prisma.student.findMany({
        where: { ...where, status: query.status },
        orderBy: byName,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        select: studentSelect,
      }),
      prisma.student.groupBy({ by: ['status'], where, _count: { _all: true } }),
    ])
    const countOf = (status: StudentStatus) => groups.find((group) => group.status === status)?._count._all ?? 0
    const counts = { ACTIVE: countOf('ACTIVE'), ARCHIVED: countOf('ARCHIVED') }
    return { students: students.map(toStudentJson), total: counts[query.status], counts }
  },

  getStudent: async ({ organizationId, studentId }: GetStudentParams) => toStudentJson(await findStudent({ tx: prisma, organizationId, studentId })),

  createStudent: ({ organizationId, actorId, data }: CreateStudentParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const studentNumber = data.student_number || (await nextStudentNumber({ tx, organizationId }))
      await refuseTakenNumber({ tx, organizationId, studentNumber })
      const student = await tx.student.create({
        data: { organization_id: organizationId, ...toStudentData({ ...data, student_number: studentNumber }) },
        select: studentSelect,
      })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'STUDENT_ADDED', organization_id: organizationId, subject_name: getStudentName(student) } })
      return toStudentJson(student)
    }),

  updateStudent: ({ organizationId, studentId, actorId, data }: UpdateStudentParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      await findStudent({ tx, organizationId, studentId })
      await refuseTakenNumber({ tx, organizationId, studentNumber: data.student_number, studentId })
      const student = await tx.student.update({ where: { id: studentId }, data: toStudentData(data), select: studentSelect })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'STUDENT_UPDATED', organization_id: organizationId, subject_name: getStudentName(student) } })
      return toStudentJson(student)
    }),

  // Filtering on the other status makes a repeated archive or restore change nothing, which answers 409
  setStudentStatus: ({ organizationId, studentId, actorId, status }: SetStudentStatusParams) =>
    prisma.$transaction(async (tx) => {
      const change = STATUS_CHANGE[status]
      const { count } = await tx.student.updateMany({ where: { id: studentId, organization_id: organizationId, status: { not: status } }, data: { status } })
      const student = await findStudent({ tx, organizationId, studentId })
      if (count === 0) {
        throw new HttpError(409, change.alreadyMessage)
      }
      await tx.activityLog.create({ data: { actor_id: actorId, action: change.action, organization_id: organizationId, subject_name: getStudentName(student) } })
      if (status === 'ARCHIVED') {
        await revokePendingInvitation({ tx, organizationId, studentId, actorId })
      }
      return toStudentJson(await findStudent({ tx, organizationId, studentId }))
    }),
}
