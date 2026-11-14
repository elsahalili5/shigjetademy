// Official one-way notices. Who may write them and to whom is decided here, and who receives one is worked out when it is read (see announcement-audience).
// A scheduled announcement needs no job: it is visible once its publish time has passed, which every read compares with the clock.
import type { Prisma } from '@generated/prisma/client.ts'
import type {
  AnnouncementAudienceOptions,
  AnnouncementAudienceRole,
  AnnouncementDetail,
  AnnouncementPublishMode,
  AnnouncementReadCounts,
  AnnouncementStatus,
  AnnouncementSummary,
  AnnouncementUnreadCount,
} from '@shigjetademy/shared/announcements'
import { ANNOUNCEMENT_AUDIENCE_ROLES } from '@shigjetademy/shared/announcements'
import { HttpError, refuseField } from '@lib/httpError.ts'
import { prisma } from '@lib/prisma.ts'
import { audienceFilter, loadTaughtGroups, loadViewerProfile, countAudience } from './announcement-audience.ts'
import type { ViewerProfile } from './announcement-audience.ts'
import type { AnnouncementViewer, CreateAnnouncementInput, StoredAudience, UpdateAnnouncementInput } from './announcements.types.ts'

/** The list holds this many announcements at most, newest first; older ones stay stored */
const LIST_LIMIT = 200

const announcementSelect = {
  id: true,
  title: true,
  body: true,
  audience_kind: true,
  audience_role: true,
  course_id: true,
  group_id: true,
  status: true,
  publish_at: true,
  edited_at: true,
  created_at: true,
  author_membership_id: true,
  author: { select: { user: { select: { first_name: true, last_name: true } } } },
  course: { select: { id: true, name: true } },
  group: { select: { id: true, name: true } },
} as const satisfies Prisma.AnnouncementSelect

type StoredAnnouncement = Prisma.AnnouncementGetPayload<{ select: typeof announcementSelect }>

type ViewerScope = {
  organizationId: string
  viewer: AnnouncementViewer
}

type AnnouncementScope = ViewerScope & {
  announcementId: string
}

const isStaff = (viewer: AnnouncementViewer) => viewer.role === 'OWNER' || viewer.role === 'ADMIN'

const canWrite = (viewer: AnnouncementViewer) => isStaff(viewer) || viewer.role === 'LECTURER'

/** Owner and admins manage every announcement; a lecturer only their own */
const canManage = ({ viewer, authorMembershipId }: { viewer: AnnouncementViewer; authorMembershipId: string }) =>
  isStaff(viewer) || (viewer.role === 'LECTURER' && authorMembershipId === viewer.membershipId)

const isOut = ({ status, publish_at }: Pick<StoredAnnouncement, 'status' | 'publish_at'>, now: Date) => (status === 'PUBLISHED' || status === 'SCHEDULED') && !!publish_at && publish_at <= now

const toStatus = (announcement: Pick<StoredAnnouncement, 'status' | 'publish_at'>, now: Date): AnnouncementStatus => {
  if (announcement.status === 'ARCHIVED') return 'ARCHIVED'
  if (announcement.status === 'DRAFT') return 'DRAFT'
  return isOut(announcement, now) ? 'PUBLISHED' : 'SCHEDULED'
}

const toAudienceRole = (role: StoredAnnouncement['audience_role']): AnnouncementAudienceRole | null => ANNOUNCEMENT_AUDIENCE_ROLES.find((item) => item === role) ?? null

type ToSummaryParams = ViewerScope & {
  announcement: StoredAnnouncement
  now: Date
  isUnread: boolean
}

const toSummary = ({ announcement, viewer, now, isUnread }: ToSummaryParams): AnnouncementSummary => ({
  id: announcement.id,
  title: announcement.title,
  audience_kind: announcement.audience_kind,
  audience_role: toAudienceRole(announcement.audience_role),
  course: announcement.course,
  group: announcement.group,
  author: { membership_id: announcement.author_membership_id, first_name: announcement.author.user.first_name, last_name: announcement.author.user.last_name },
  status: toStatus(announcement, now),
  publish_at: announcement.publish_at?.toISOString() ?? null,
  edited_at: announcement.edited_at?.toISOString() ?? null,
  is_unread: isUnread,
  can_manage: canManage({ viewer, authorMembershipId: announcement.author_membership_id }),
})

/** What a recipient receives: out already, not archived, addressed to them, written by someone else */
const recipientWhere = ({ organizationId, viewer, profile, now }: ViewerScope & { profile: ViewerProfile; now: Date }): Prisma.AnnouncementWhereInput => ({
  organization_id: organizationId,
  author_membership_id: { not: viewer.membershipId },
  status: { in: ['PUBLISHED', 'SCHEDULED'] },
  publish_at: { lte: now },
  ...audienceFilter(profile),
})

/** How many of the people an announcement reached opened it, counted by the database */
const readCountsOf = async ({ organizationId, announcement }: { organizationId: string; announcement: StoredAnnouncement }): Promise<AnnouncementReadCounts> => {
  const { audienceSize, readCount } = await countAudience({ organizationId, audience: announcement, announcementId: announcement.id, authorMembershipId: announcement.author_membership_id })
  return { read_count: readCount, audience_size: audienceSize }
}

type ToDetailParams = ToSummaryParams

const toDetail = async ({ announcement, viewer, now, isUnread, organizationId }: ToDetailParams): Promise<AnnouncementDetail> => {
  const summary = toSummary({ announcement, organizationId, viewer, now, isUnread })
  const hasGoneOut = announcement.status !== 'DRAFT' && !!announcement.publish_at && announcement.publish_at <= now
  return {
    ...summary,
    body: announcement.body,
    read_counts: summary.can_manage && hasGoneOut ? await readCountsOf({ organizationId, announcement }) : null,
    can_change_audience: summary.can_manage && announcement.status !== 'ARCHIVED' && (isStaff(viewer) || !isOut(announcement, now)),
    can_change_publishing: summary.can_manage && (announcement.status === 'DRAFT' || announcement.status === 'SCHEDULED') && !isOut(announcement, now),
  }
}

const toStoredAudience = (input: CreateAnnouncementInput | UpdateAnnouncementInput): StoredAudience => ({
  audience_kind: input.audience_kind,
  audience_role: input.audience_kind === 'ROLE' ? (input.audience_role ?? null) : null,
  course_id: input.audience_kind === 'COURSE' ? (input.course_id ?? null) : null,
  group_id: input.audience_kind === 'GROUP' ? (input.group_id ?? null) : null,
})

const isSameAudience = (first: StoredAudience, second: StoredAudience) =>
  first.audience_kind === second.audience_kind && first.audience_role === second.audience_role && first.course_id === second.course_id && first.group_id === second.group_id

/** What a viewer manages besides what is addressed to them: all of it for staff, their own for a lecturer, nothing for a student or guardian */
const managedWhere = ({ organizationId, viewer }: ViewerScope): Prisma.AnnouncementWhereInput | null => {
  if (isStaff(viewer)) return { organization_id: organizationId }
  if (viewer.role === 'LECTURER') return { organization_id: organizationId, author_membership_id: viewer.membershipId }
  return null
}

/** A draft has no publish time and sorts first, where its author finds it */
const END_OF_TIME = new Date(8.64e15)

const FORBIDDEN_AUDIENCE = 'You can only write to the groups and courses you currently teach.'

/** Staff address anyone; a lecturer only the groups and courses they currently teach. 403 when not allowed, 404 for a course or group that isn't the organization's. */
const assertCanAddress = async ({ organizationId, viewer, audience }: ViewerScope & { audience: StoredAudience }) => {
  switch (audience.audience_kind) {
    case 'SCHOOL':
    case 'ROLE':
      if (!isStaff(viewer)) throw new HttpError(403, 'Only school staff can write to the whole school or to a role.')
      return
    case 'COURSE': {
      // A lecturer who currently teaches any active group of a course may address the whole course, the students and lecturers of its other groups included
      if (!isStaff(viewer)) {
        const taught = await loadTaughtGroups({ organizationId, userId: viewer.userId })
        if (!taught.some((group) => group.course.id === audience.course_id)) throw new HttpError(403, FORBIDDEN_AUDIENCE)
      }
      const course = await prisma.course.findFirst({ where: { id: audience.course_id ?? undefined, organization_id: organizationId }, select: { status: true } })
      if (!course) throw new HttpError(404, 'Course not found')
      if (course.status !== 'ACTIVE') throw refuseField({ field: 'course_id', status: 400, message: 'This course is archived.' })
      return
    }
    case 'GROUP': {
      if (!isStaff(viewer)) {
        const taught = await loadTaughtGroups({ organizationId, userId: viewer.userId })
        if (!taught.some((group) => group.id === audience.group_id)) throw new HttpError(403, FORBIDDEN_AUDIENCE)
        return
      }
      const group = await prisma.group.findFirst({ where: { id: audience.group_id ?? undefined, organization_id: organizationId }, select: { status: true } })
      if (!group) throw new HttpError(404, 'Group not found')
      if (group.status !== 'ACTIVE') throw refuseField({ field: 'group_id', status: 400, message: 'This group is archived.' })
      return
    }
    default: {
      const unhandled: never = audience.audience_kind
      throw new Error(`Unhandled audience kind: ${String(unhandled)}`)
    }
  }
}

type ToPublishingParams = {
  mode: AnnouncementPublishMode
  publishAt: string | null | undefined
  now: Date
}

/** The status and publish time a publishing choice means */
const toPublishing = ({ mode, publishAt, now }: ToPublishingParams) => {
  switch (mode) {
    case 'DRAFT':
      return { status: 'DRAFT', publish_at: null } as const
    case 'NOW':
      return { status: 'PUBLISHED', publish_at: now } as const
    case 'SCHEDULED': {
      const at = new Date(publishAt ?? '')
      if (Number.isNaN(at.getTime()) || at <= now) throw refuseField({ field: 'publish_at', status: 400, message: 'Choose a time in the future.' })
      return { status: 'SCHEDULED', publish_at: at } as const
    }
    default: {
      const unhandled: never = mode
      throw new Error(`Unhandled publish mode: ${String(unhandled)}`)
    }
  }
}

const findAnnouncement = async ({ organizationId, announcementId }: { organizationId: string; announcementId: string }) => {
  const announcement = await prisma.announcement.findFirst({ where: { id: announcementId, organization_id: organizationId }, select: announcementSelect })
  if (!announcement) throw new HttpError(404, 'Announcement not found')
  return announcement
}

const isAddressedTo = async ({ organizationId, viewer, announcementId, now }: AnnouncementScope & { now: Date }) => {
  const profile = await loadViewerProfile({ organizationId, viewer })
  return (await prisma.announcement.count({ where: { id: announcementId, ...recipientWhere({ organizationId, viewer, profile, now }) } })) > 0
}

/** The announcement for someone who manages it or is addressed by it; 404 for everyone else, as for one that doesn't exist */
const findReachable = async ({ organizationId, viewer, announcementId, isRecipientNeeded }: AnnouncementScope & { isRecipientNeeded: boolean }) => {
  const announcement = await findAnnouncement({ organizationId, announcementId })
  const now = new Date()
  const isManager = canManage({ viewer, authorMembershipId: announcement.author_membership_id })
  // A manager who only edits or archives needs no recipient check
  const isRecipient = isManager && !isRecipientNeeded ? false : await isAddressedTo({ organizationId, viewer, announcementId, now })
  if (!isManager && !isRecipient) throw new HttpError(404, 'Announcement not found')
  return { announcement, now, isManager, isRecipient }
}

export const AnnouncementService = {
  // Everything addressed to the viewer that is out, plus what they manage: all of it for staff, their own for a lecturer
  list: async ({ organizationId, viewer }: ViewerScope): Promise<AnnouncementSummary[]> => {
    const now = new Date()
    const profile = await loadViewerProfile({ organizationId, viewer })
    const managed = managedWhere({ organizationId, viewer })
    const orderBy = [{ publish_at: { sort: 'desc', nulls: 'first' } }, { created_at: 'desc' }] as const satisfies Prisma.AnnouncementOrderByWithRelationInput[]
    const [received, written] = await Promise.all([
      prisma.announcement.findMany({ where: recipientWhere({ organizationId, viewer, profile, now }), orderBy: [...orderBy], take: LIST_LIMIT, select: announcementSelect }),
      managed ? prisma.announcement.findMany({ where: managed, orderBy: [...orderBy], take: LIST_LIMIT, select: announcementSelect }) : [],
    ])
    const receivedIds = new Set(received.map((announcement) => announcement.id))
    const all = [...received, ...written.filter((announcement) => !receivedIds.has(announcement.id))]
    const reads = await prisma.announcementRead.findMany({ where: { membership_id: viewer.membershipId, announcement_id: { in: [...receivedIds] } }, select: { announcement_id: true } })
    const readIds = new Set(reads.map((read) => read.announcement_id))
    return all
      .sort((first, second) => (second.publish_at ?? END_OF_TIME).getTime() - (first.publish_at ?? END_OF_TIME).getTime() || second.created_at.getTime() - first.created_at.getTime())
      .slice(0, LIST_LIMIT)
      .map((announcement) => toSummary({ announcement, organizationId, viewer, now, isUnread: receivedIds.has(announcement.id) && !readIds.has(announcement.id) }))
  },

  getUnreadCount: async ({ organizationId, viewer }: ViewerScope): Promise<AnnouncementUnreadCount> => {
    const profile = await loadViewerProfile({ organizationId, viewer })
    const unreadCount = await prisma.announcement.count({
      where: { ...recipientWhere({ organizationId, viewer, profile, now: new Date() }), reads: { none: { membership_id: viewer.membershipId } } },
    })
    return { unread_count: unreadCount }
  },

  // Opening one marks it read for the viewer, once
  get: async (scope: AnnouncementScope): Promise<AnnouncementDetail> => {
    const { announcement, now, isRecipient } = await findReachable({ ...scope, isRecipientNeeded: true })
    if (isRecipient) {
      const key = { announcement_id: announcement.id, membership_id: scope.viewer.membershipId }
      const existing = await prisma.announcementRead.findUnique({ where: { announcement_id_membership_id: key }, select: { read_at: true } })
      if (!existing) {
        await prisma.announcementRead.createMany({ data: [key], skipDuplicates: true })
      }
    }
    return toDetail({ announcement, organizationId: scope.organizationId, viewer: scope.viewer, now, isUnread: false })
  },

  create: async ({ organizationId, viewer, data }: ViewerScope & { data: CreateAnnouncementInput }): Promise<AnnouncementDetail> => {
    if (!canWrite(viewer)) throw new HttpError(403, 'You can’t write announcements.')
    const audience = toStoredAudience(data)
    await assertCanAddress({ organizationId, viewer, audience })
    const now = new Date()
    const publishing = toPublishing({ mode: data.publish_mode, publishAt: data.publish_at, now })
    const announcement = await prisma.announcement.create({
      data: { organization_id: organizationId, author_membership_id: viewer.membershipId, title: data.title, body: data.body, ...audience, ...publishing },
      select: announcementSelect,
    })
    return toDetail({ announcement, organizationId, viewer, now, isUnread: false })
  },

  update: async ({ organizationId, viewer, announcementId, data }: AnnouncementScope & { data: UpdateAnnouncementInput }): Promise<AnnouncementDetail> => {
    const { announcement, now, isManager } = await findReachable({ organizationId, viewer, announcementId, isRecipientNeeded: false })
    if (!isManager) throw new HttpError(403, 'You can only edit your own announcements.')
    if (announcement.status === 'ARCHIVED') throw new HttpError(409, 'An archived announcement can’t be edited.')
    const audience = toStoredAudience(data)
    const content = { title: data.title, body: data.body, ...audience }
    const isUnchanged = data.title === announcement.title && data.body === announcement.body && isSameAudience(audience, announcement)
    if (isUnchanged && !data.publish_mode) return toDetail({ announcement, organizationId, viewer, now, isUnread: false })
    if (isOut(announcement, now)) {
      if (data.publish_mode) throw refuseField({ field: 'publish_mode', status: 400, message: 'An announcement that is out can’t be rescheduled.' })
      if (!isSameAudience(audience, announcement)) {
        if (!isStaff(viewer)) throw new HttpError(403, 'Only school staff can change who an announcement is for once it is out.')
        await assertCanAddress({ organizationId, viewer, audience })
      }
      const updated = await prisma.announcement.update({ where: { id: announcementId }, data: { ...content, edited_at: now }, select: announcementSelect })
      return toDetail({ announcement: updated, organizationId, viewer, now, isUnread: false })
    }
    await assertCanAddress({ organizationId, viewer, audience })
    const publishing = data.publish_mode ? toPublishing({ mode: data.publish_mode, publishAt: data.publish_at, now }) : {}
    const updated = await prisma.announcement.update({ where: { id: announcementId }, data: { ...content, ...publishing }, select: announcementSelect })
    return toDetail({ announcement: updated, organizationId, viewer, now, isUnread: false })
  },

  // Archived, never deleted: recipients stop seeing it, the people who manage it still do
  archive: async ({ organizationId, viewer, announcementId }: AnnouncementScope): Promise<AnnouncementDetail> => {
    const { announcement, now, isManager } = await findReachable({ organizationId, viewer, announcementId, isRecipientNeeded: false })
    if (!isManager) throw new HttpError(403, 'You can only archive your own announcements.')
    const archived = announcement.status === 'ARCHIVED' ? announcement : await prisma.announcement.update({ where: { id: announcementId }, data: { status: 'ARCHIVED' }, select: announcementSelect })
    return toDetail({ announcement: archived, organizationId, viewer, now, isUnread: false })
  },

  // What the viewer can pick in the form: everything for staff, the groups and courses a lecturer teaches today
  getAudienceOptions: async ({ organizationId, viewer }: ViewerScope): Promise<AnnouncementAudienceOptions> => {
    if (!canWrite(viewer)) return { can_create: false, can_address_school: false, roles: [], courses: [], groups: [] }
    if (isStaff(viewer)) {
      const [courses, groups] = await Promise.all([
        prisma.course.findMany({ where: { organization_id: organizationId, status: 'ACTIVE' }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
        prisma.group.findMany({ where: { organization_id: organizationId, status: 'ACTIVE' }, orderBy: [{ course: { name: 'asc' } }, { name: 'asc' }], select: { id: true, name: true, course: { select: { name: true } } } }),
      ])
      return { can_create: true, can_address_school: true, roles: [...ANNOUNCEMENT_AUDIENCE_ROLES], courses, groups: groups.map(({ course, ...group }) => ({ ...group, course_name: course.name })) }
    }
    const taught = await loadTaughtGroups({ organizationId, userId: viewer.userId })
    const courses = new Map(taught.map((group) => [group.course.id, group.course]))
    return {
      can_create: true,
      can_address_school: false,
      roles: [],
      courses: [...courses.values()].sort((first, second) => first.name.localeCompare(second.name)),
      groups: taught.map((group) => ({ id: group.id, name: group.name, course_name: group.course.name })),
    }
  },
}
