// Who an announcement reaches, worked out when it is read: nothing is stored per recipient. A group's people are its actively enrolled students with their
// guardians and the lecturers who permanently teach it today; a course's are those of its active groups. Only active members with a login can be reached.
import type { Prisma } from '@generated/prisma/client.ts'
import { toDate } from '@lib/calendar-day.ts'
import { getOrganizationToday } from '@lib/current-period.ts'
import { prisma } from '@lib/prisma.ts'
import { activeEnrolments, assignmentCoveringDay } from '@modules/groups/group-selects.ts'
import type { AnnouncementViewer, StoredAudience } from './announcements.types.ts'

type OrganizationScope = {
  organizationId: string
}

type TeachingScope = OrganizationScope & {
  userId: string
}

const getToday = async ({ organizationId }: OrganizationScope) => toDate(await getOrganizationToday({ db: prisma, organizationId }))

const groupSelect = { id: true, name: true, course: { select: { id: true, name: true } } } as const satisfies Prisma.GroupSelect

/** The active groups this login permanently teaches today, with their courses */
export const loadTaughtGroups = async ({ organizationId, userId }: TeachingScope) => {
  const today = await getToday({ organizationId })
  return prisma.group.findMany({
    where: { organization_id: organizationId, status: 'ACTIVE', lecturer_assignments: { some: { ...assignmentCoveringDay(today), lecturer: { organization_id: organizationId, status: 'ACTIVE', user_id: userId } } } },
    orderBy: { name: 'asc' },
    select: groupSelect,
  })
}

/** The groups and courses whose announcements a member receives */
export type ViewerProfile = {
  role: AnnouncementViewer['role']
  groupIds: string[]
  courseIds: string[]
}

type LoadViewerProfileParams = OrganizationScope & {
  viewer: AnnouncementViewer
}

const unique = (values: string[]) => [...new Set(values)]

const toProfile = ({ role, groups }: { role: ViewerProfile['role']; groups: { id: string; course_id: string }[] }): ViewerProfile => ({
  role,
  groupIds: unique(groups.map((group) => group.id)),
  courseIds: unique(groups.map((group) => group.course_id)),
})

/** Which active groups put this member in an audience: a student's own, a guardian's children's, a lecturer's taught today; staff have none */
export const loadViewerProfile = async ({ organizationId, viewer }: LoadViewerProfileParams): Promise<ViewerProfile> => {
  const groupSelectIds = { id: true, course_id: true } as const
  switch (viewer.role) {
    case 'STUDENT': {
      const groups = await prisma.group.findMany({
        where: { organization_id: organizationId, status: 'ACTIVE', enrolments: { some: { ...activeEnrolments, student: { organization_id: organizationId, status: 'ACTIVE', user_id: viewer.userId } } } },
        select: groupSelectIds,
      })
      return toProfile({ role: viewer.role, groups })
    }
    case 'GUARDIAN': {
      const groups = await prisma.group.findMany({
        where: {
          organization_id: organizationId,
          status: 'ACTIVE',
          enrolments: { some: { ...activeEnrolments, student: { organization_id: organizationId, status: 'ACTIVE', guardians: { some: { guardian: { organization_id: organizationId, user_id: viewer.userId } } } } } },
        },
        select: groupSelectIds,
      })
      return toProfile({ role: viewer.role, groups })
    }
    case 'LECTURER': {
      const groups = await loadTaughtGroups({ organizationId, userId: viewer.userId })
      return toProfile({ role: viewer.role, groups: groups.map((group) => ({ id: group.id, course_id: group.course.id })) })
    }
    case 'OWNER':
    case 'ADMIN':
      return { role: viewer.role, groupIds: [], courseIds: [] }
    default: {
      const unhandled: never = viewer.role
      throw new Error(`Unhandled member role: ${String(unhandled)}`)
    }
  }
}

/** The announcements addressed to someone with this profile: the whole school, their role, and their groups and courses */
export const audienceFilter = (profile: ViewerProfile): Prisma.AnnouncementWhereInput => ({
  OR: [
    { audience_kind: 'SCHOOL' },
    { audience_kind: 'ROLE', audience_role: profile.role },
    { audience_kind: 'GROUP', group_id: { in: profile.groupIds } },
    { audience_kind: 'COURSE', course_id: { in: profile.courseIds }, course: { status: 'ACTIVE' } },
  ],
})

type CountAudienceParams = OrganizationScope & {
  audience: StoredAudience
  announcementId: string
  /** The author is never part of the count */
  authorMembershipId: string
}

/** The memberships an announcement reaches (a course audience reaches nobody once its course is archived), as a filter the database counts with; only a group's or course's people are loaded, as logins */
const audienceMembershipWhere = async ({ organizationId, audience, authorMembershipId }: Omit<CountAudienceParams, 'announcementId'>): Promise<Prisma.MembershipWhereInput> => {
  const base: Prisma.MembershipWhereInput = { organization_id: organizationId, status: 'ACTIVE', user: { status: 'ACTIVE' }, id: { not: authorMembershipId } }
  switch (audience.audience_kind) {
    case 'SCHOOL':
      return base
    case 'ROLE':
      return { ...base, role: audience.audience_role ?? undefined }
    case 'GROUP':
    case 'COURSE': {
      const today = await getToday({ organizationId })
      const groups: Prisma.GroupWhereInput = { organization_id: organizationId, status: 'ACTIVE', ...(audience.audience_kind === 'GROUP' ? { id: audience.group_id ?? undefined } : { course_id: audience.course_id ?? undefined, course: { status: 'ACTIVE' } }) }
      const [enrolments, assignments] = await Promise.all([
        prisma.groupEnrolment.findMany({
          where: { ...activeEnrolments, group: groups, student: { organization_id: organizationId, status: 'ACTIVE' } },
          select: { student: { select: { user_id: true, guardians: { select: { guardian: { select: { user_id: true } } } } } } },
        }),
        prisma.groupLecturerAssignment.findMany({
          where: { ...assignmentCoveringDay(today), group: groups, lecturer: { organization_id: organizationId, status: 'ACTIVE' } },
          select: { lecturer: { select: { user_id: true } } },
        }),
      ])
      const students = new Set<string>()
      const guardians = new Set<string>()
      const lecturers = new Set<string>()
      for (const { student } of enrolments) {
        if (student.user_id) students.add(student.user_id)
        for (const { guardian } of student.guardians) {
          if (guardian.user_id) guardians.add(guardian.user_id)
        }
      }
      for (const { lecturer } of assignments) {
        if (lecturer.user_id) lecturers.add(lecturer.user_id)
      }
      return {
        ...base,
        OR: [
          { role: 'STUDENT', user_id: { in: [...students] } },
          { role: 'GUARDIAN', user_id: { in: [...guardians] } },
          { role: 'LECTURER', user_id: { in: [...lecturers] } },
        ],
      }
    }
    default: {
      const unhandled: never = audience.audience_kind
      throw new Error(`Unhandled audience kind: ${String(unhandled)}`)
    }
  }
}

/** How many people an announcement reaches and how many of them opened it, both counted by the database; a read by someone who left the audience doesn't count */
export const countAudience = async ({ announcementId, ...scope }: CountAudienceParams) => {
  const membership = await audienceMembershipWhere(scope)
  const [audienceSize, readCount] = await Promise.all([
    prisma.membership.count({ where: membership }),
    prisma.announcementRead.count({ where: { announcement_id: announcementId, membership } }),
  ])
  return { audienceSize, readCount }
}
