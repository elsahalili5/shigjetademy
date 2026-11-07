import { Prisma } from '@generated/prisma/client.ts'
import { getLecturerName } from '@shigjetademy/shared/lecturers'
import { toDate, toDay } from '@lib/calendar-day.ts'
import { HttpError } from '@lib/httpError.ts'
import { lockOrganization } from '@lib/organization-lock.ts'
import type { OrganizationScope } from '@lib/organization-lock.ts'
import { prisma } from '@lib/prisma.ts'
import { revokePendingRecordInvitation } from '@modules/invitations/invitations.service.ts'
import type { LecturerInput, LecturerLoginStatus, LecturerStatus, ListLecturersQuery } from './lecturers.types.ts'

const placeSelect = { id: true, name: true } as const

const lecturerSelect = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  phone: true,
  subjects: true,
  employment_type: true,
  started_on: true,
  notes: true,
  status: true,
  created_at: true,
  department: { select: placeSelect },
  locations: { select: { location: { select: placeSelect } }, orderBy: { location: { name: 'asc' } } },
  // Read only to derive login_status; the user id itself never leaves the server
  user_id: true,
  invitations: { where: { status: 'PENDING' }, select: { email: true, expires_at: true }, orderBy: { created_at: 'desc' }, take: 1 },
} as const satisfies Prisma.LecturerSelect

type StoredLecturer = Prisma.LecturerGetPayload<{ select: typeof lecturerSelect }>

const toLecturerJson = ({ started_on, locations, user_id, invitations, ...lecturer }: StoredLecturer) => {
  // A pending invitation past its expiry no longer counts
  const invitation = invitations.find((item) => item.expires_at > new Date()) ?? null
  const loginStatus: LecturerLoginStatus = user_id ? 'LINKED' : invitation ? 'INVITED' : 'NONE'
  return {
    ...lecturer,
    started_on: started_on ? toDay(started_on) : null,
    locations: locations.map((item) => item.location),
    login_status: loginStatus,
    invitation: loginStatus === 'INVITED' ? invitation : null,
  }
}

const byName = [{ last_name: 'asc' }, { first_name: 'asc' }, { id: 'asc' }] as const satisfies Prisma.LecturerOrderByWithRelationInput[]

type FindLecturerParams = {
  tx: Prisma.TransactionClient
  organizationId: string
  lecturerId: string
}

/** The organization's lecturer, or a 404 when the id belongs to no lecturer of this organization */
const findLecturer = async ({ tx, organizationId, lecturerId }: FindLecturerParams) => {
  const lecturer = await tx.lecturer.findFirst({ where: { id: lecturerId, organization_id: organizationId }, select: lecturerSelect })
  if (!lecturer) {
    throw new HttpError(404, 'Lecturer not found')
  }
  return lecturer
}

type RefuseOtherPlacesParams = OrganizationScope & {
  data: LecturerInput
}

/** The department and every location must be the organization's own */
const refuseOtherPlaces = async ({ tx, organizationId, data }: RefuseOtherPlacesParams) => {
  if (data.department_id) {
    const department = await tx.department.findFirst({ where: { id: data.department_id, organization_id: organizationId }, select: { id: true } })
    if (!department) {
      const message = 'Choose one of your organization’s departments.'
      throw new HttpError(400, message, { fieldErrors: { department_id: [message] } })
    }
  }
  if (data.location_ids.length > 0) {
    const owned = await tx.location.count({ where: { id: { in: data.location_ids }, organization_id: organizationId } })
    if (owned !== data.location_ids.length) {
      const message = 'Choose your organization’s locations only.'
      throw new HttpError(400, message, { fieldErrors: { location_ids: [message] } })
    }
  }
}

type OrganizationSubjectsParams = {
  tx: Prisma.TransactionClient
  organizationId: string
  /** The lecturer being edited, whose own subjects don't hold a casing */
  exceptLecturerId?: string
}

/** Every subject the organization's lecturers have, archived ones included, each once */
const organizationSubjects = async ({ tx, organizationId, exceptLecturerId }: OrganizationSubjectsParams) => {
  const rows = await tx.$queryRaw<{ subject: string }[]>`
    SELECT DISTINCT unnest(subjects) AS subject FROM "Lecturer"
    WHERE organization_id = ${organizationId}::uuid AND (${exceptLecturerId ?? null}::uuid IS NULL OR id <> ${exceptLecturerId ?? null}::uuid)`
  return rows.map((row) => row.subject)
}

type InOrganizationCasingParams = OrganizationSubjectsParams & {
  subjects: string[]
}

/** A subject the organization already uses, in any case, takes the casing it already has, so "maths" and "Maths" stay one subject */
const inOrganizationCasing = async ({ subjects, ...scope }: InOrganizationCasingParams) => {
  const known = new Map<string, string>()
  for (const subject of await organizationSubjects(scope)) {
    if (!known.has(subject.toLowerCase())) known.set(subject.toLowerCase(), subject)
  }
  return subjects.map((subject) => known.get(subject.toLowerCase()) ?? subject)
}

// Optional fields come in as '' when left empty and are stored as null
const toLecturerData = ({ data, subjects }: { data: LecturerInput; subjects: string[] }) => ({
  first_name: data.first_name,
  last_name: data.last_name,
  email: data.email || null,
  phone: data.phone || null,
  subjects,
  employment_type: data.employment_type,
  started_on: data.started_on ? toDate(data.started_on) : null,
  notes: data.notes || null,
  department_id: data.department_id,
})

const toLocationLinks = (locationIds: string[]) => locationIds.map((locationId) => ({ location_id: locationId }))

/** A LIKE pattern that finds the word anywhere, with its own % and _ taken literally */
const containing = (word: string) => `%${word.replace(/[\\%_]/g, (character) => `\\${character}`)}%`

type MatchingIdsParams = {
  organizationId: string
  search: string
  subject?: string
}

/**
 * The ids of lecturers where every word of the search is in a name, the email or a subject, and who teach the subject, in any case;
 * undefined when there is neither. Raw SQL, since Prisma can't search inside a text array.
 */
const matchingIds = async ({ organizationId, search, subject }: MatchingIdsParams) => {
  const words = search.split(/\s+/).filter(Boolean)
  if (words.length === 0 && !subject) return undefined
  const conditions = words.map((word) => {
    const pattern = containing(word)
    return Prisma.sql`(first_name ILIKE ${pattern} OR last_name ILIKE ${pattern} OR email ILIKE ${pattern} OR EXISTS (SELECT 1 FROM unnest(subjects) AS s WHERE s ILIKE ${pattern}))`
  })
  if (subject) {
    conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM unnest(subjects) AS s WHERE lower(s) = lower(${subject}))`)
  }
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Lecturer" WHERE organization_id = ${organizationId}::uuid AND ${Prisma.join(conditions, ' AND ')}`
  return rows.map((row) => row.id)
}

type ListLecturersParams = {
  organizationId: string
  query: ListLecturersQuery
}

type GetLecturerParams = {
  organizationId: string
  lecturerId: string
}

type CreateLecturerParams = {
  organizationId: string
  actorId: string
  data: LecturerInput
}

type LecturerChangeParams = {
  organizationId: string
  lecturerId: string
  actorId: string
}

type UpdateLecturerParams = LecturerChangeParams & {
  data: LecturerInput
}

type SetLecturerStatusParams = LecturerChangeParams & {
  status: LecturerStatus
}

const STATUS_CHANGE = {
  ARCHIVED: { action: 'LECTURER_ARCHIVED', alreadyMessage: 'This lecturer is already archived.' },
  ACTIVE: { action: 'LECTURER_RESTORED', alreadyMessage: 'This lecturer is already active.' },
} as const satisfies Record<LecturerStatus, { action: Prisma.ActivityLogCreateInput['action']; alreadyMessage: string }>

const bySubjectName = (first: string, second: string) => first.localeCompare(second, undefined, { sensitivity: 'base' })

export const LecturerService = {
  // Counts follow the search and filters, so each status tab says how many of its lecturers match
  listLecturers: async ({ organizationId, query }: ListLecturersParams) => {
    const ids = await matchingIds({ organizationId, search: query.search, subject: query.subject })
    const where: Prisma.LecturerWhereInput = {
      organization_id: organizationId,
      id: ids ? { in: ids } : undefined,
      department_id: query.department_id,
      locations: query.location_id ? { some: { location_id: query.location_id } } : undefined,
    }
    const [lecturers, groups] = await Promise.all([
      prisma.lecturer.findMany({
        where: { ...where, status: query.status },
        orderBy: byName,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        select: lecturerSelect,
      }),
      prisma.lecturer.groupBy({ by: ['status'], where, _count: { _all: true } }),
    ])
    const countOf = (status: LecturerStatus) => groups.find((group) => group.status === status)?._count._all ?? 0
    const counts = { ACTIVE: countOf('ACTIVE'), ARCHIVED: countOf('ARCHIVED') }
    return { lecturers: lecturers.map(toLecturerJson), total: counts[query.status], counts }
  },

  getLecturer: async ({ organizationId, lecturerId }: GetLecturerParams) => toLecturerJson(await findLecturer({ tx: prisma, organizationId, lecturerId })),

  /** The subjects already used in the organization, for suggestions while typing */
  listSubjects: async (organizationId: string) => (await organizationSubjects({ tx: prisma, organizationId })).sort(bySubjectName),

  createLecturer: ({ organizationId, actorId, data }: CreateLecturerParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      await refuseOtherPlaces({ tx, organizationId, data })
      const subjects = await inOrganizationCasing({ tx, organizationId, subjects: data.subjects })
      const lecturer = await tx.lecturer.create({
        data: { organization_id: organizationId, ...toLecturerData({ data, subjects }), locations: { create: toLocationLinks(data.location_ids) } },
        select: lecturerSelect,
      })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'LECTURER_ADDED', organization_id: organizationId, subject_name: getLecturerName(lecturer) } })
      return toLecturerJson(lecturer)
    }),

  updateLecturer: ({ organizationId, lecturerId, actorId, data }: UpdateLecturerParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      await findLecturer({ tx, organizationId, lecturerId })
      await refuseOtherPlaces({ tx, organizationId, data })
      const subjects = await inOrganizationCasing({ tx, organizationId, subjects: data.subjects, exceptLecturerId: lecturerId })
      const lecturer = await tx.lecturer.update({
        where: { id: lecturerId },
        data: { ...toLecturerData({ data, subjects }), locations: { deleteMany: {}, create: toLocationLinks(data.location_ids) } },
        select: lecturerSelect,
      })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'LECTURER_UPDATED', organization_id: organizationId, subject_name: getLecturerName(lecturer) } })
      return toLecturerJson(lecturer)
    }),

  // Filtering on the other status makes a repeated archive or restore change nothing, which answers 409.
  // The lock, like an invitation's, keeps an invite racing an archive from leaving a pending invite on an archived lecturer.
  setLecturerStatus: ({ organizationId, lecturerId, actorId, status }: SetLecturerStatusParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const change = STATUS_CHANGE[status]
      const { count } = await tx.lecturer.updateMany({ where: { id: lecturerId, organization_id: organizationId, status: { not: status } }, data: { status } })
      const lecturer = await findLecturer({ tx, organizationId, lecturerId })
      if (count === 0) {
        throw new HttpError(409, change.alreadyMessage)
      }
      await tx.activityLog.create({ data: { actor_id: actorId, action: change.action, organization_id: organizationId, subject_name: getLecturerName(lecturer) } })
      if (status === 'ARCHIVED') {
        await revokePendingRecordInvitation({ tx, organizationId, record: { kind: 'LECTURER', id: lecturerId }, actorId })
      }
      return toLecturerJson(await findLecturer({ tx, organizationId, lecturerId }))
    }),
}
