import type { Prisma } from '@generated/prisma/client.ts'
import { toDate } from '@lib/calendar-day.ts'
import { getOrganizationToday } from '@lib/current-period.ts'
import { HttpError, refuseField } from '@lib/httpError.ts'
import { escapeLike } from '@lib/like-pattern.ts'
import { lockOrganization } from '@lib/organization-lock.ts'
import type { OrganizationScope } from '@lib/organization-lock.ts'
import { prisma } from '@lib/prisma.ts'
import { changeLecturer, checkMoveToYear, checkNewLecturer, getLecturerFields, ongoingAssignments } from './group-lecturers.service.ts'
import type { GroupInput, GroupStatus, ListGroupsQuery } from './groups.types.ts'

const relationSelect = { id: true, name: true } as const

const groupFields = {
  id: true,
  name: true,
  capacity: true,
  status: true,
  created_at: true,
  course: { select: { id: true, name: true, status: true } },
  academic_year: { select: relationSelect },
  academic_term: { select: relationSelect },
  location: { select: relationSelect },
} as const satisfies Prisma.GroupSelect

const groupSelectOn = (today: string) => ({ ...groupFields, lecturer_assignments: ongoingAssignments(today) }) satisfies Prisma.GroupSelect

type StoredGroup = Prisma.GroupGetPayload<{ select: ReturnType<typeof groupSelectOn> }>

type ToGroupJsonParams = {
  group: StoredGroup
  today: string
}

/** A group with its lecturer on this day worked out from the rows, so a future date takes effect by itself */
const toGroupJson = ({ group: { lecturer_assignments: assignments, ...group }, today }: ToGroupJsonParams) => ({ ...group, ...getLecturerFields({ assignments, today }) })

const byCourseAndName = [{ course: { name: 'asc' } }, { name: 'asc' }, { id: 'asc' }] as const satisfies Prisma.GroupOrderByWithRelationInput[]

type FindGroupParams = OrganizationScope & {
  groupId: string
}

/** The organization's group, or a 404 when the id belongs to no group of this organization */
const findGroup = async ({ tx, organizationId, groupId }: FindGroupParams) => {
  const group = await tx.group.findFirst({ where: { id: groupId, organization_id: organizationId }, select: groupFields })
  if (!group) {
    throw new HttpError(404, 'Group not found')
  }
  return group
}

type ReadGroupParams = Pick<OrganizationScope, 'tx'> & {
  groupId: string
  today: string
}

/** The group as the API answers it */
const readGroup = async ({ tx, groupId, today }: ReadGroupParams) => {
  const group = await tx.group.findUniqueOrThrow({ where: { id: groupId }, select: groupSelectOn(today) })
  return toGroupJson({ group, today })
}

/** The columns of the group itself; the lecturer lives in rows of its own */
const toGroupColumns = ({ course_id, name, academic_year_id, academic_term_id, location_id, capacity }: GroupInput) => ({ course_id, name, academic_year_id, academic_term_id, location_id, capacity })

type CheckGroupParams = OrganizationScope & {
  data: GroupInput
  /** The group being edited, which keeps its own name and may stay on its archived course */
  current?: { id: string; courseId: string }
}

/** The course, year and location must be the organization's own, the term must be of the chosen year, and an archived course takes no new groups */
const checkGroup = async ({ tx, organizationId, data, current }: CheckGroupParams) => {
  const course = await tx.course.findFirst({ where: { id: data.course_id, organization_id: organizationId }, select: { status: true } })
  if (!course) {
    throw refuseField({ field: 'course_id', status: 400, message: 'Choose one of your organization’s courses.' })
  }
  if (course.status === 'ARCHIVED' && current?.courseId !== data.course_id) {
    throw refuseField({ field: 'course_id', status: 409, message: 'This course is archived. Restore it first.' })
  }
  const year = await tx.academicYear.findFirst({ where: { id: data.academic_year_id, organization_id: organizationId }, select: { id: true } })
  if (!year) {
    throw refuseField({ field: 'academic_year_id', status: 400, message: 'Choose one of your organization’s school years.' })
  }
  if (data.academic_term_id) {
    const term = await tx.academicTerm.findFirst({ where: { id: data.academic_term_id, academic_year_id: data.academic_year_id }, select: { id: true } })
    if (!term) {
      throw refuseField({ field: 'academic_term_id', status: 400, message: 'Choose a term of this school year.' })
    }
  }
  if (data.location_id) {
    const location = await tx.location.findFirst({ where: { id: data.location_id, organization_id: organizationId }, select: { id: true } })
    if (!location) {
      throw refuseField({ field: 'location_id', status: 400, message: 'Choose one of your organization’s locations.' })
    }
  }
  const sameName = await tx.group.findFirst({
    where: { id: current ? { not: current.id } : undefined, course_id: data.course_id, academic_year_id: data.academic_year_id, name: { equals: escapeLike(data.name), mode: 'insensitive' } },
    select: { id: true },
  })
  if (sameName) {
    throw refuseField({ field: 'name', status: 409, message: 'This course already has a group with this name in this year.' })
  }
}

type ListGroupsParams = {
  organizationId: string
  query: ListGroupsQuery
}

type CreateGroupParams = {
  organizationId: string
  actorId: string
  data: GroupInput
}

type UpdateGroupParams = CreateGroupParams & {
  groupId: string
}

type SetGroupStatusParams = {
  organizationId: string
  groupId: string
  actorId: string
  status: GroupStatus
}

type ArchiveCourseGroupsParams = OrganizationScope & {
  courseId: string
  actorId: string
}

const STATUS_CHANGE = {
  ARCHIVED: { action: 'GROUP_ARCHIVED', alreadyMessage: 'This group is already archived.' },
  ACTIVE: { action: 'GROUP_RESTORED', alreadyMessage: 'This group is already active.' },
} as const satisfies Record<GroupStatus, { action: Prisma.ActivityLogCreateInput['action']; alreadyMessage: string }>

/** Archives the active groups of a course being archived, each with its own log entry; the caller holds the organization lock */
export const archiveCourseGroups = async ({ tx, organizationId, courseId, actorId }: ArchiveCourseGroupsParams) => {
  const groups = await tx.group.findMany({ where: { course_id: courseId, status: 'ACTIVE' }, select: { name: true } })
  await tx.group.updateMany({ where: { course_id: courseId, status: 'ACTIVE' }, data: { status: 'ARCHIVED' } })
  await tx.activityLog.createMany({ data: groups.map((group) => ({ actor_id: actorId, action: STATUS_CHANGE.ARCHIVED.action, organization_id: organizationId, subject_name: group.name })) })
}

export const GroupService = {
  // Counts follow the filters, so each status tab says how many of its groups match
  listGroups: async ({ organizationId, query }: ListGroupsParams) => {
    const where: Prisma.GroupWhereInput = { organization_id: organizationId, course_id: query.course_id, academic_year_id: query.academic_year_id }
    const today = await getOrganizationToday({ db: prisma, organizationId })
    const [groups, statuses] = await Promise.all([
      prisma.group.findMany({
        where: { ...where, status: query.status },
        orderBy: byCourseAndName,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        select: groupSelectOn(today),
      }),
      prisma.group.groupBy({ by: ['status'], where, _count: { _all: true } }),
    ])
    const countOf = (status: GroupStatus) => statuses.find((item) => item.status === status)?._count._all ?? 0
    const counts = { ACTIVE: countOf('ACTIVE'), ARCHIVED: countOf('ARCHIVED') }
    return { groups: groups.map((group) => toGroupJson({ group, today })), total: counts[query.status], counts }
  },

  createGroup: ({ organizationId, actorId, data }: CreateGroupParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      await checkGroup({ tx, organizationId, data })
      const today = await getOrganizationToday({ db: tx, organizationId })
      if (data.lecturer_id) {
        const year = await tx.academicYear.findUniqueOrThrow({ where: { id: data.academic_year_id }, select: { end_date: true } })
        await checkNewLecturer({ tx, organizationId, lecturerId: data.lecturer_id, year, today })
      }
      const { id: groupId, name } = await tx.group.create({ data: { organization_id: organizationId, ...toGroupColumns(data) }, select: { id: true, name: true } })
      if (data.lecturer_id) {
        await tx.groupLecturerAssignment.create({ data: { group_id: groupId, lecturer_id: data.lecturer_id, start_date: toDate(today) } })
      }
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'GROUP_ADDED', organization_id: organizationId, subject_name: name } })
      return readGroup({ tx, groupId, today })
    }),

  updateGroup: ({ organizationId, groupId, actorId, data }: UpdateGroupParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const stored = await findGroup({ tx, organizationId, groupId })
      await checkGroup({ tx, organizationId, data, current: { id: groupId, courseId: stored.course.id } })
      const today = await getOrganizationToday({ db: tx, organizationId })
      await changeLecturer({ tx, organizationId, group: stored, data, today })
      if (data.academic_year_id !== stored.academic_year.id) {
        await checkMoveToYear({ tx, groupId, yearId: data.academic_year_id, today })
      }
      const { name } = await tx.group.update({ where: { id: groupId }, data: toGroupColumns(data), select: { name: true } })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'GROUP_UPDATED', organization_id: organizationId, subject_name: name } })
      return readGroup({ tx, groupId, today })
    }),

  // A group comes back only to an active course
  setGroupStatus: ({ organizationId, groupId, actorId, status }: SetGroupStatusParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const stored = await findGroup({ tx, organizationId, groupId })
      const change = STATUS_CHANGE[status]
      if (stored.status === status) {
        throw new HttpError(409, change.alreadyMessage)
      }
      if (status === 'ACTIVE' && stored.course.status === 'ARCHIVED') {
        throw new HttpError(409, `Restore the course ${stored.course.name} first.`)
      }
      await tx.group.update({ where: { id: groupId }, data: { status } })
      await tx.activityLog.create({ data: { actor_id: actorId, action: change.action, organization_id: organizationId, subject_name: stored.name } })
      return readGroup({ tx, groupId, today: await getOrganizationToday({ db: tx, organizationId }) })
    }),
}
