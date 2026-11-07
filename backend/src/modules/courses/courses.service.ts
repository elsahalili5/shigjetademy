import type { Prisma } from '@generated/prisma/client.ts'
import { HttpError, refuseField } from '@lib/httpError.ts'
import { escapeLike } from '@lib/like-pattern.ts'
import { lockOrganization } from '@lib/organization-lock.ts'
import type { OrganizationScope } from '@lib/organization-lock.ts'
import { prisma } from '@lib/prisma.ts'
import { archiveCourseGroups } from '@modules/groups/groups.service.ts'
import type { CourseInput, CourseStatus, ListCoursesQuery } from './courses.types.ts'

const courseSelect = {
  id: true,
  name: true,
  code: true,
  description: true,
  level: true,
  status: true,
  created_at: true,
  department: { select: { id: true, name: true } },
} as const satisfies Prisma.CourseSelect

type FindCourseParams = OrganizationScope & {
  courseId: string
}

/** The organization's course, or a 404 when the id belongs to no course of this organization */
const findCourse = async ({ tx, organizationId, courseId }: FindCourseParams) => {
  const course = await tx.course.findFirst({ where: { id: courseId, organization_id: organizationId }, select: courseSelect })
  if (!course) {
    throw new HttpError(404, 'Course not found')
  }
  return course
}

const byName = [{ name: 'asc' }, { id: 'asc' }] as const satisfies Prisma.CourseOrderByWithRelationInput[]

type CheckCourseParams = OrganizationScope & {
  data: CourseInput
  /** The course being edited, which may keep its own name and code */
  courseId?: string
}

/** Names and codes are unique in the organization whatever their case, archived courses included, and the department must be its own */
const checkCourse = async ({ tx, organizationId, data, courseId }: CheckCourseParams) => {
  const others = { organization_id: organizationId, id: courseId ? { not: courseId } : undefined }
  const sameName = await tx.course.findFirst({ where: { ...others, name: { equals: escapeLike(data.name), mode: 'insensitive' } }, select: { id: true } })
  if (sameName) {
    throw refuseField({ field: 'name', status: 409, message: 'There is already a course with this name.' })
  }
  if (data.code) {
    const sameCode = await tx.course.findFirst({ where: { ...others, code: { equals: escapeLike(data.code), mode: 'insensitive' } }, select: { id: true } })
    if (sameCode) {
      throw refuseField({ field: 'code', status: 409, message: 'There is already a course with this code.' })
    }
  }
  if (data.department_id) {
    const department = await tx.department.findFirst({ where: { id: data.department_id, organization_id: organizationId }, select: { id: true } })
    if (!department) {
      throw refuseField({ field: 'department_id', status: 400, message: 'Choose one of your organization’s departments.' })
    }
  }
}

// Optional fields come in as '' when left empty and are stored as null
const toCourseData = (data: CourseInput) => ({
  name: data.name,
  code: data.code || null,
  description: data.description || null,
  level: data.level || null,
  department_id: data.department_id,
})

/** Every word of the search matches a name, a code or a level, in any case */
const matching = (search: string): Prisma.CourseWhereInput => ({
  AND: search
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeLike)
    .map((word) => ({
      OR: [{ name: { contains: word, mode: 'insensitive' } }, { code: { contains: word, mode: 'insensitive' } }, { level: { contains: word, mode: 'insensitive' } }],
    })),
})

type ListCoursesParams = {
  organizationId: string
  query: ListCoursesQuery
}

type CreateCourseParams = {
  organizationId: string
  actorId: string
  data: CourseInput
}

type UpdateCourseParams = CreateCourseParams & {
  courseId: string
}

type SetCourseStatusParams = {
  organizationId: string
  courseId: string
  actorId: string
  status: CourseStatus
}

const STATUS_CHANGE = {
  ARCHIVED: { action: 'COURSE_ARCHIVED', alreadyMessage: 'This course is already archived.' },
  ACTIVE: { action: 'COURSE_RESTORED', alreadyMessage: 'This course is already active.' },
} as const satisfies Record<CourseStatus, { action: Prisma.ActivityLogCreateInput['action']; alreadyMessage: string }>

export const CourseService = {
  // Counts follow the search, so each status tab says how many of its courses match
  listCourses: async ({ organizationId, query }: ListCoursesParams) => {
    const where: Prisma.CourseWhereInput = { organization_id: organizationId, ...matching(query.search) }
    const [courses, statuses] = await Promise.all([
      prisma.course.findMany({
        where: { ...where, status: query.status },
        orderBy: byName,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        select: courseSelect,
      }),
      prisma.course.groupBy({ by: ['status'], where, _count: { _all: true } }),
    ])
    const countOf = (status: CourseStatus) => statuses.find((item) => item.status === status)?._count._all ?? 0
    const counts = { ACTIVE: countOf('ACTIVE'), ARCHIVED: countOf('ARCHIVED') }
    return { courses, total: counts[query.status], counts }
  },

  /** Every course, for the group forms and filters */
  listCourseOptions: (organizationId: string) =>
    prisma.course.findMany({ where: { organization_id: organizationId }, orderBy: byName, select: { id: true, name: true, status: true } }),

  createCourse: ({ organizationId, actorId, data }: CreateCourseParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      await checkCourse({ tx, organizationId, data })
      const course = await tx.course.create({ data: { organization_id: organizationId, ...toCourseData(data) }, select: courseSelect })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'COURSE_ADDED', organization_id: organizationId, subject_name: course.name } })
      return course
    }),

  updateCourse: ({ organizationId, courseId, actorId, data }: UpdateCourseParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      await findCourse({ tx, organizationId, courseId })
      await checkCourse({ tx, organizationId, data, courseId })
      const course = await tx.course.update({ where: { id: courseId }, data: toCourseData(data), select: courseSelect })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'COURSE_UPDATED', organization_id: organizationId, subject_name: course.name } })
      return course
    }),

  // Filtering on the other status makes a repeated archive or restore change nothing, which answers 409.
  // Archiving takes the course's active groups with it; restoring leaves them archived, to bring back one by one.
  setCourseStatus: ({ organizationId, courseId, actorId, status }: SetCourseStatusParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const change = STATUS_CHANGE[status]
      const { count } = await tx.course.updateMany({ where: { id: courseId, organization_id: organizationId, status: { not: status } }, data: { status } })
      const course = await findCourse({ tx, organizationId, courseId })
      if (count === 0) {
        throw new HttpError(409, change.alreadyMessage)
      }
      await tx.activityLog.create({ data: { actor_id: actorId, action: change.action, organization_id: organizationId, subject_name: course.name } })
      if (status === 'ARCHIVED') {
        await archiveCourseGroups({ tx, organizationId, courseId, actorId })
      }
      return course
    }),
}
