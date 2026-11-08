import type { Prisma } from '@generated/prisma/client.ts'
import type { GroupEnrolment, GroupEnrolmentInput, GroupMoveInput, GroupStudentOption } from '@shigjetademy/shared/groups'
import { getStudentName } from '@shigjetademy/shared/students'
import { addDays, toDate, toDay } from '@lib/calendar-day.ts'
import { getOrganizationToday } from '@lib/current-period.ts'
import { HttpError, refuseField } from '@lib/httpError.ts'
import { lockOrganization } from '@lib/organization-lock.ts'
import type { OrganizationScope } from '@lib/organization-lock.ts'
import { prisma } from '@lib/prisma.ts'
import { activeEnrolments } from './group-selects.ts'

const studentOptionSelect = { id: true, first_name: true, last_name: true, student_number: true } as const

const enrolmentSelect = { id: true, enrolled_on: true, withdrawn_on: true, student: { select: { ...studentOptionSelect, status: true } } } as const

const ALREADY_IN_GROUP = 'This student is already in this group.'

const ARCHIVED_GROUP = 'This group is archived. Restore it first.'

/** What the enrolment rules read of a group, whether it's the one in the path or a move's target */
const groupRulesSelect = { id: true, name: true, status: true, capacity: true, academic_year: { select: { end_date: true } } } as const satisfies Prisma.GroupSelect

type StoredEnrolment = Omit<GroupEnrolment, 'enrolled_on' | 'withdrawn_on'> & {
  enrolled_on: Date
  withdrawn_on: Date | null
}

const toEnrolmentJson = (enrolment: StoredEnrolment): GroupEnrolment => ({
  ...enrolment,
  enrolled_on: toDay(enrolment.enrolled_on),
  withdrawn_on: enrolment.withdrawn_on && toDay(enrolment.withdrawn_on),
})

type FindGroupParams = OrganizationScope & {
  groupId: string
}

/** The organization's group, or a 404 */
const findGroup = async ({ tx, organizationId, groupId }: FindGroupParams) => {
  const group = await tx.group.findFirst({ where: { id: groupId, organization_id: organizationId }, select: groupRulesSelect })
  if (!group) {
    throw new HttpError(404, 'Group not found')
  }
  return group
}

type CountActiveParams = Pick<OrganizationScope, 'tx'> & {
  groupId: string
}

const countActive = ({ tx, groupId }: CountActiveParams) => tx.groupEnrolment.count({ where: { group_id: groupId, ...activeEnrolments } })

type CheckCapacityKeptParams = CountActiveParams & {
  capacity: number | null
}

/** A group's capacity can't drop below its active students; the caller holds the organization lock, so no enrolment slips in between */
export const checkCapacityKept = async ({ tx, groupId, capacity }: CheckCapacityKeptParams) => {
  if (capacity === null) return
  const active = await countActive({ tx, groupId })
  if (active > capacity) {
    throw refuseField({ field: 'capacity', status: 409, message: `This group has ${active} students. Keep at least ${active} seats, or withdraw students first.` })
  }
}

type EnrolParams = OrganizationScope & {
  group: Awaited<ReturnType<typeof findGroup>>
  studentId: string
  today: string
  /** The seat's first day: today for an enrolment; tomorrow for a move, since the student is still on the old group's register today */
  startsOn: string
  /** The form field a refusal shows under: the student picker, or the target group of a move */
  field: 'student_id' | 'group_id'
}

/** Every rule a new enrolment keeps: an active group in a school year that hasn't ended, with a free seat, and an active student of the organization who isn't in it yet. The caller holds the organization lock. */
const enrol = async ({ tx, organizationId, group, studentId, today, startsOn, field }: EnrolParams) => {
  if (group.status === 'ARCHIVED') {
    throw field === 'group_id' ? refuseField({ field, status: 409, message: ARCHIVED_GROUP }) : new HttpError(409, ARCHIVED_GROUP)
  }
  // The same rule as a new lecturer: the year may still be running today, its last day included
  if (toDay(group.academic_year.end_date) < today) {
    throw refuseField({ field, status: 409, message: 'This group’s school year has ended, so it can’t take new students.' })
  }
  const student = await tx.student.findFirst({ where: { id: studentId, organization_id: organizationId }, select: { status: true } })
  if (!student) {
    throw refuseField({ field, status: 400, message: 'Choose one of your organization’s students.' })
  }
  if (student.status === 'ARCHIVED') {
    throw refuseField({ field, status: 409, message: 'This student is archived. Restore them first.' })
  }
  const existing = await tx.groupEnrolment.findFirst({ where: { group_id: group.id, student_id: studentId, ...activeEnrolments }, select: { id: true } })
  if (existing) {
    throw refuseField({ field, status: 409, message: ALREADY_IN_GROUP })
  }
  if (group.capacity !== null && (await countActive({ tx, groupId: group.id })) >= group.capacity) {
    throw refuseField({ field, status: 409, message: 'This group is full.' })
  }
  return tx.groupEnrolment.create({ data: { group_id: group.id, student_id: studentId, enrolled_on: toDate(startsOn) }, select: enrolmentSelect })
}

type FindActiveEnrolmentParams = Pick<OrganizationScope, 'tx'> & {
  group: Awaited<ReturnType<typeof findGroup>>
  enrolmentId: string
}

/** The group's enrolment that is still active, or a 404 when it isn't this group's. An archived group's students stay as they are. */
const findActiveEnrolment = async ({ tx, group, enrolmentId }: FindActiveEnrolmentParams) => {
  const enrolment = await tx.groupEnrolment.findFirst({ where: { id: enrolmentId, group_id: group.id }, select: { student_id: true, withdrawn_on: true, student: { select: { first_name: true, last_name: true } } } })
  if (!enrolment) {
    throw new HttpError(404, 'Enrolment not found')
  }
  if (group.status === 'ARCHIVED') {
    throw new HttpError(409, ARCHIVED_GROUP)
  }
  if (enrolment.withdrawn_on) {
    throw new HttpError(409, 'This student has already left the group.')
  }
  return { studentId: enrolment.student_id, studentName: getStudentName(enrolment.student) }
}

type GroupScopeParams = {
  organizationId: string
  groupId: string
}

type EnrolStudentParams = GroupScopeParams & {
  actorId: string
  data: GroupEnrolmentInput
}

type WithdrawStudentParams = GroupScopeParams & {
  enrolmentId: string
  actorId: string
}

type MoveStudentParams = WithdrawStudentParams & {
  data: GroupMoveInput
}

export const GroupEnrolmentService = {
  listStudentOptions: (organizationId: string): Promise<GroupStudentOption[]> =>
    prisma.student.findMany({
      where: { organization_id: organizationId, status: 'ACTIVE' },
      orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }, { id: 'asc' }],
      select: studentOptionSelect,
    }),

  // Active and withdrawn, newest first
  listEnrolments: async ({ organizationId, groupId }: GroupScopeParams): Promise<GroupEnrolment[]> => {
    const group = await prisma.group.findFirst({
      where: { id: groupId, organization_id: organizationId },
      select: { enrolments: { orderBy: [{ enrolled_on: 'desc' }, { created_at: 'desc' }], select: enrolmentSelect } },
    })
    if (!group) {
      throw new HttpError(404, 'Group not found')
    }
    return group.enrolments.map(toEnrolmentJson)
  },

  enrolStudent: ({ organizationId, groupId, actorId, data }: EnrolStudentParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const group = await findGroup({ tx, organizationId, groupId })
      const today = await getOrganizationToday({ db: tx, organizationId })
      const enrolment = await enrol({ tx, organizationId, group, studentId: data.student_id, today, startsOn: today, field: 'student_id' })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'GROUP_STUDENT_ENROLLED', organization_id: organizationId, subject_name: `${getStudentName(enrolment.student)} in ${group.name}` } })
      return toEnrolmentJson(enrolment)
    }),

  // The row stays with its last day, so the history shows it and the seat is free again
  withdrawStudent: ({ organizationId, groupId, enrolmentId, actorId }: WithdrawStudentParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const group = await findGroup({ tx, organizationId, groupId })
      const { studentName } = await findActiveEnrolment({ tx, group, enrolmentId })
      const today = await getOrganizationToday({ db: tx, organizationId })
      const enrolment = await tx.groupEnrolment.update({ where: { id: enrolmentId }, data: { withdrawn_on: toDate(today) }, select: enrolmentSelect })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'GROUP_STUDENT_WITHDRAWN', organization_id: organizationId, subject_name: `${studentName} from ${group.name}` } })
      return toEnrolmentJson(enrolment)
    }),

  // Withdraws and enrols in one transaction, so a refused target leaves the student where they were. Any active group of the organization can be the target.
  // The new seat is taken at once but starts tomorrow, so today the student is on the old group's register only.
  moveStudent: ({ organizationId, groupId, enrolmentId, actorId, data }: MoveStudentParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const group = await findGroup({ tx, organizationId, groupId })
      const { studentId, studentName } = await findActiveEnrolment({ tx, group, enrolmentId })
      if (data.group_id === groupId) {
        throw refuseField({ field: 'group_id', status: 409, message: 'The student is already in this group.' })
      }
      const target = await tx.group.findFirst({ where: { id: data.group_id, organization_id: organizationId }, select: groupRulesSelect })
      if (!target) {
        throw refuseField({ field: 'group_id', status: 400, message: 'Choose one of your organization’s groups.' })
      }
      const today = await getOrganizationToday({ db: tx, organizationId })
      await tx.groupEnrolment.update({ where: { id: enrolmentId }, data: { withdrawn_on: toDate(today) } })
      const enrolment = await enrol({ tx, organizationId, group: target, studentId, today, startsOn: addDays({ day: today, days: 1 }), field: 'group_id' })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'GROUP_STUDENT_MOVED', organization_id: organizationId, subject_name: `${studentName} from ${group.name} to ${target.name}` } })
      return toEnrolmentJson(enrolment)
    }),
}
