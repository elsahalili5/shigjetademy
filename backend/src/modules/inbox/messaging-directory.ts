// Who in an organization is who to the messaging rules: each active member with the students they are tied to.
import type { MemberRole } from '@shigjetademy/shared/auth'
import { toDate } from '@lib/calendar-day.ts'
import { getOrganizationToday } from '@lib/current-period.ts'
import { prisma } from '@lib/prisma.ts'
import { activeEnrolments } from '@modules/groups/group-selects.ts'
import type { MessagingContext, MessagingParty } from './inbox.types.ts'

export type MessagingPerson = MessagingParty & {
  firstName: string
  lastName: string
}

export type MessagingDirectory = {
  context: MessagingContext
  /** Active members of the organization with an active login, by membership id */
  people: Map<string, MessagingPerson>
}

type LoadMessagingDirectoryParams = {
  organizationId: string
}

type StudentsByUser = Map<string, Set<string>>

const addStudent = (studentsByUser: StudentsByUser, userId: string | null, studentId: string) => {
  if (!userId) return
  studentsByUser.set(userId, (studentsByUser.get(userId) ?? new Set()).add(studentId))
}

/**
 * Everything canMessage needs for one organization, read at once. A lecturer "teaches" a student the way the student roster says: the student is
 * actively enrolled in an active group whose permanent lecturer today is the lecturer; a guardian is tied to their active linked children.
 */
export const loadMessagingDirectory = async ({ organizationId }: LoadMessagingDirectoryParams): Promise<MessagingDirectory> => {
  const today = toDate(await getOrganizationToday({ db: prisma, organizationId }))
  const coversToday = { start_date: { lte: today }, OR: [{ end_date: null }, { end_date: { gte: today } }], lecturer: { status: 'ACTIVE' as const, user_id: { not: null } } }
  const [settings, memberships, students, guardianLinks, enrolments] = await Promise.all([
    prisma.organizationSettings.findUnique({ where: { organization_id: organizationId }, select: { student_messaging_enabled: true } }),
    prisma.membership.findMany({
      where: { organization_id: organizationId, status: 'ACTIVE', user: { status: 'ACTIVE' } },
      select: { id: true, role: true, user_id: true, user: { select: { first_name: true, last_name: true } } },
    }),
    prisma.student.findMany({ where: { organization_id: organizationId, status: 'ACTIVE', user_id: { not: null } }, select: { id: true, user_id: true } }),
    prisma.studentGuardian.findMany({
      where: { student: { organization_id: organizationId, status: 'ACTIVE' }, guardian: { organization_id: organizationId, user_id: { not: null } } },
      select: { student_id: true, guardian: { select: { user_id: true } } },
    }),
    prisma.groupEnrolment.findMany({
      where: { ...activeEnrolments, student: { organization_id: organizationId, status: 'ACTIVE' }, group: { organization_id: organizationId, status: 'ACTIVE', lecturer_assignments: { some: coversToday } } },
      select: { student_id: true, group: { select: { lecturer_assignments: { where: coversToday, select: { lecturer: { select: { user_id: true } } } } } } },
    }),
  ])
  // Kept per role, so a login that is a lecturer and also a guardian's login reaches only what its membership role allows
  const ownRecords: StudentsByUser = new Map()
  const children: StudentsByUser = new Map()
  const taught: StudentsByUser = new Map()
  for (const student of students) addStudent(ownRecords, student.user_id, student.id)
  for (const link of guardianLinks) addStudent(children, link.guardian.user_id, link.student_id)
  for (const enrolment of enrolments) {
    for (const assignment of enrolment.group.lecturer_assignments) addStudent(taught, assignment.lecturer.user_id, enrolment.student_id)
  }
  const studentsOf = ({ role, userId }: { role: MemberRole; userId: string }) => {
    switch (role) {
      case 'STUDENT':
        return ownRecords.get(userId)
      case 'GUARDIAN':
        return children.get(userId)
      case 'LECTURER':
        return taught.get(userId)
      case 'OWNER':
      case 'ADMIN':
        return undefined
      default: {
        const unhandled: never = role
        throw new Error(`Unhandled member role: ${String(unhandled)}`)
      }
    }
  }
  const people = new Map<string, MessagingPerson>()
  for (const membership of memberships) {
    people.set(membership.id, {
      membershipId: membership.id,
      role: membership.role,
      studentIds: studentsOf({ role: membership.role, userId: membership.user_id }) ?? new Set(),
      firstName: membership.user.first_name,
      lastName: membership.user.last_name,
    })
  }
  return { context: { isStudentMessagingEnabled: settings?.student_messaging_enabled ?? false }, people }
}
