// Who may take part in which space, worked out when it is read: nothing is stored per member. A group's people are its actively enrolled students and the
// lecturers who permanently teach it today; a course's are those of its active groups. The owner and admins reach every group and course.
// A group or course that is archived stays readable for its people but takes no new topics or replies.
import type { DiscussionSpace } from '@shigjetademy/shared/discussions'
import type { Prisma } from '@generated/prisma/client.ts'
import { toDate } from '@lib/calendar-day.ts'
import { getOrganizationToday } from '@lib/current-period.ts'
import { prisma } from '@lib/prisma.ts'
import { activeEnrolments, assignmentCoveringDay } from '@modules/groups/group-selects.ts'
import type { DiscussionViewer } from './discussions.types.ts'

type OrganizationScope = {
  organizationId: string
}

type LoadViewerSpacesParams = OrganizationScope & {
  viewer: DiscussionViewer
}

/** The spaces a viewer can read, and whether they moderate them */
export type ViewerSpaces = {
  spaces: DiscussionSpace[]
  /** The owner and admins reach every space */
  isStaff: boolean
  /** Staff, and the lecturers of the spaces they teach, moderate; a lecturer only ever has the spaces they teach */
  isModerator: boolean
}

type MemberGroup = {
  id: string
  name: string
  status: 'ACTIVE' | 'ARCHIVED'
  course: { id: string; name: string; status: 'ACTIVE' | 'ARCHIVED' }
}

const memberGroupSelect = { id: true, name: true, status: true, course: { select: { id: true, name: true, status: true } } } as const satisfies Prisma.GroupSelect

/** The groups a student is actively enrolled in, or a lecturer permanently teaches today, whatever their status */
const loadMemberGroups = async ({ organizationId, viewer }: LoadViewerSpacesParams): Promise<MemberGroup[]> => {
  switch (viewer.role) {
    case 'STUDENT':
      return prisma.group.findMany({
        where: { organization_id: organizationId, enrolments: { some: { ...activeEnrolments, student: { organization_id: organizationId, status: 'ACTIVE', user_id: viewer.userId } } } },
        select: memberGroupSelect,
      })
    case 'LECTURER': {
      const today = toDate(await getOrganizationToday({ db: prisma, organizationId }))
      return prisma.group.findMany({
        where: { organization_id: organizationId, lecturer_assignments: { some: { ...assignmentCoveringDay(today), lecturer: { organization_id: organizationId, status: 'ACTIVE', user_id: viewer.userId } } } },
        select: memberGroupSelect,
      })
    }
    case 'GUARDIAN':
    case 'OWNER':
    case 'ADMIN':
      return []
    default: {
      const unhandled: never = viewer.role
      throw new Error(`Unhandled member role: ${String(unhandled)}`)
    }
  }
}

const toGroupSpace = (group: MemberGroup): DiscussionSpace => {
  const isArchived = group.status === 'ARCHIVED'
  return { kind: 'GROUP', id: group.id, name: group.name, course_name: group.course.name, is_archived: isArchived, can_post: !isArchived }
}

const toCourseSpace = (course: MemberGroup['course']): DiscussionSpace => {
  const isArchived = course.status === 'ARCHIVED'
  return { kind: 'COURSE', id: course.id, name: course.name, course_name: null, is_archived: isArchived, can_post: !isArchived }
}

const byName = (first: DiscussionSpace, second: DiscussionSpace) => first.name.localeCompare(second.name)

/** Courses first, then groups, each by name */
const sortSpaces = (spaces: DiscussionSpace[]) => [...spaces.filter((space) => space.kind === 'COURSE').sort(byName), ...spaces.filter((space) => space.kind === 'GROUP').sort(byName)]

const loadStaffSpaces = async ({ organizationId }: OrganizationScope): Promise<DiscussionSpace[]> => {
  const [courses, groups] = await Promise.all([
    prisma.course.findMany({ where: { organization_id: organizationId }, select: { id: true, name: true, status: true } }),
    prisma.group.findMany({ where: { organization_id: organizationId }, select: memberGroupSelect }),
  ])
  return sortSpaces([...courses.map(toCourseSpace), ...groups.map(toGroupSpace)])
}

/** A course reaches the people of its active groups; once the course is archived, all its groups are, and they still reach it */
const loadMemberSpaces = async (params: LoadViewerSpacesParams): Promise<DiscussionSpace[]> => {
  const groups = await loadMemberGroups(params)
  const courses = new Map<string, MemberGroup['course']>()
  for (const group of groups) {
    if (group.status === 'ACTIVE' || group.course.status === 'ARCHIVED') courses.set(group.course.id, group.course)
  }
  return sortSpaces([...[...courses.values()].map(toCourseSpace), ...groups.map(toGroupSpace)])
}

export const loadViewerSpaces = async (params: LoadViewerSpacesParams): Promise<ViewerSpaces> => {
  const isStaff = params.viewer.role === 'OWNER' || params.viewer.role === 'ADMIN'
  const spaces = isStaff ? await loadStaffSpaces(params) : await loadMemberSpaces(params)
  return { spaces, isStaff, isModerator: isStaff || params.viewer.role === 'LECTURER' }
}

type SpaceRef = Pick<DiscussionSpace, 'kind' | 'id'>

export const findViewerSpace = ({ viewerSpaces, kind, id }: { viewerSpaces: ViewerSpaces } & SpaceRef) => viewerSpaces.spaces.find((space) => space.kind === kind && space.id === id) ?? null

/** The topics in the spaces the viewer reads */
export const topicsInSpaces = ({ organizationId, viewerSpaces }: OrganizationScope & { viewerSpaces: ViewerSpaces }): Prisma.DiscussionTopicWhereInput => {
  if (viewerSpaces.isStaff) return { organization_id: organizationId }
  const idsOf = (kind: SpaceRef['kind']) => viewerSpaces.spaces.filter((space) => space.kind === kind).map((space) => space.id)
  return {
    organization_id: organizationId,
    OR: [
      { space_kind: 'GROUP', group_id: { in: idsOf('GROUP') } },
      { space_kind: 'COURSE', course_id: { in: idsOf('COURSE') } },
    ],
  }
}
