// Who is in which space (a group or a course), worked out when it is read: nothing is stored per member. A group's people are its actively enrolled students
// and the lecturers who permanently teach it today; a course's are those of its active groups. The owner and admins reach every group and course.
// Discussions and learning materials share this rule; each decides what its people may do there.
import type { MemberRole } from '@shigjetademy/shared/auth'
import type { Space, SpaceKind, SpaceRef } from '@shigjetademy/shared/spaces'
import type { Prisma } from '@generated/prisma/client.ts'
import { toDate } from '@lib/calendar-day.ts'
import { getOrganizationToday } from '@lib/current-period.ts'
import { prisma } from '@lib/prisma.ts'
import { activeEnrolments, assignmentCoveringDay } from './group-selects.ts'

type OrganizationScope = {
  organizationId: string
}

/** Who is asking, in the organization of the path */
export type SpaceViewer = {
  membershipId: string
  userId: string
  role: MemberRole
}

/** The columns a row stored in a space selects to name its space and tell whether it is archived */
export const spaceSelect = {
  space_kind: true,
  group: { select: { id: true, name: true, status: true, course: { select: { name: true } } } },
  course: { select: { id: true, name: true, status: true } },
} as const

type StoredInSpace = {
  id: string
  space_kind: SpaceKind
  group: { id: string; name: string; course: { name: string } } | null
  course: { id: string; name: string } | null
}

/** The group or course a stored row lives in */
export const toSpaceRef = (row: StoredInSpace): SpaceRef => {
  if (row.space_kind === 'GROUP' && row.group) return { kind: 'GROUP', id: row.group.id, name: row.group.name, course_name: row.group.course.name }
  if (row.course) return { kind: 'COURSE', id: row.course.id, name: row.course.name, course_name: null }
  throw new Error(`${row.id} has no space`)
}

type LoadViewerSpacesParams = OrganizationScope & {
  viewer: SpaceViewer
}

/** The spaces a viewer can read, and whether they moderate them */
export type ViewerSpaces = {
  /** can_post is false for an archived group or course, which takes nothing new */
  spaces: Space[]
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

const toGroupSpace = (group: MemberGroup): Space => {
  const isArchived = group.status === 'ARCHIVED'
  return { kind: 'GROUP', id: group.id, name: group.name, course_name: group.course.name, is_archived: isArchived, can_post: !isArchived }
}

const toCourseSpace = (course: MemberGroup['course']): Space => {
  const isArchived = course.status === 'ARCHIVED'
  return { kind: 'COURSE', id: course.id, name: course.name, course_name: null, is_archived: isArchived, can_post: !isArchived }
}

const byName = (first: Space, second: Space) => first.name.localeCompare(second.name)

/** Courses first, then groups, each by name */
const sortSpaces = (spaces: Space[]) => [...spaces.filter((space) => space.kind === 'COURSE').sort(byName), ...spaces.filter((space) => space.kind === 'GROUP').sort(byName)]

const loadStaffSpaces = async ({ organizationId }: OrganizationScope): Promise<Space[]> => {
  const [courses, groups] = await Promise.all([
    prisma.course.findMany({ where: { organization_id: organizationId }, select: { id: true, name: true, status: true } }),
    prisma.group.findMany({ where: { organization_id: organizationId }, select: memberGroupSelect }),
  ])
  return sortSpaces([...courses.map(toCourseSpace), ...groups.map(toGroupSpace)])
}

/** A course reaches the people of its active groups; once the course is archived, all its groups are, and they still reach it */
const loadMemberSpaces = async (params: LoadViewerSpacesParams): Promise<Space[]> => {
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

type SpaceKey = Pick<Space, 'kind' | 'id'>

export const findViewerSpace = ({ viewerSpaces, kind, id }: { viewerSpaces: ViewerSpaces } & SpaceKey) => viewerSpaces.spaces.find((space) => space.kind === kind && space.id === id) ?? null

type SpaceIdsOfKindParams = {
  viewerSpaces: ViewerSpaces
  kind: SpaceKind
}

/** The ids of the viewer's spaces of one kind, to find what is stored in them */
export const spaceIdsOfKind = ({ viewerSpaces, kind }: SpaceIdsOfKindParams) => viewerSpaces.spaces.filter((space) => space.kind === kind).map((space) => space.id)
