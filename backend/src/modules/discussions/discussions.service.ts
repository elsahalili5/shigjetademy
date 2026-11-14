// Educational conversations in a group or a course. Who may read, post and moderate is decided here from the group's and course's current people (see
// discussion-access). Topics and replies are removed softly. A topic is unread for someone when another person posted in it after they last read it.
import type {
  DiscussionReply,
  DiscussionSpace,
  DiscussionSpaceRef,
  DiscussionTopicDetail,
  DiscussionTopicSummary,
  DiscussionUnreadCount,
} from '@shigjetademy/shared/discussions'
import type { Prisma } from '@generated/prisma/client.ts'
import { HttpError } from '@lib/httpError.ts'
import { prisma } from '@lib/prisma.ts'
import { findViewerSpace, loadViewerSpaces, topicsInSpaces } from './discussion-access.ts'
import type { CreateDiscussionTopicInput, DiscussionReplyInput, DiscussionViewer, UpdateDiscussionTopicInput } from './discussions.types.ts'

/** The list holds this many topics at most, pinned first and then the latest activity; older ones stay stored */
const LIST_LIMIT = 200

/** A topic shows this many replies at most, oldest first */
const REPLY_LIMIT = 1000

const NOT_FOUND = 'Topic not found'

const archivedMessage = (space: Pick<DiscussionSpace, 'kind'>) => (space.kind === 'GROUP' ? 'This group is archived, so it takes no new topics or replies.' : 'This course is archived, so it takes no new topics or replies.')

const authorSelect = { select: { user: { select: { first_name: true, last_name: true } } } } as const

const topicSelect = {
  id: true,
  space_kind: true,
  title: true,
  body: true,
  is_pinned: true,
  is_locked: true,
  status: true,
  removed_by: true,
  edited_at: true,
  last_activity_at: true,
  created_at: true,
  author_membership_id: true,
  author: authorSelect,
  group: { select: { id: true, name: true, status: true, course: { select: { name: true } } } },
  course: { select: { id: true, name: true, status: true } },
  _count: { select: { replies: { where: { status: 'ACTIVE' } } } },
} as const satisfies Prisma.DiscussionTopicSelect

type StoredTopic = Prisma.DiscussionTopicGetPayload<{ select: typeof topicSelect }>

const replySelect = {
  id: true,
  topic_id: true,
  body: true,
  status: true,
  removed_by: true,
  edited_at: true,
  created_at: true,
  author_membership_id: true,
  author: authorSelect,
} as const satisfies Prisma.DiscussionReplySelect

type StoredReply = Prisma.DiscussionReplyGetPayload<{ select: typeof replySelect }>

type ViewerScope = {
  organizationId: string
  viewer: DiscussionViewer
}

type TopicScope = ViewerScope & {
  topicId: string
}

type ReplyScope = TopicScope & {
  replyId: string
}

const toSpaceRef = (topic: StoredTopic): DiscussionSpaceRef => {
  if (topic.space_kind === 'GROUP' && topic.group) return { kind: 'GROUP', id: topic.group.id, name: topic.group.name, course_name: topic.group.course.name }
  if (topic.course) return { kind: 'COURSE', id: topic.course.id, name: topic.course.name, course_name: null }
  throw new Error(`Discussion topic ${topic.id} has no space`)
}

const isSpaceArchived = (topic: StoredTopic) => (topic.space_kind === 'GROUP' ? topic.group?.status === 'ARCHIVED' : topic.course?.status === 'ARCHIVED')

const toAuthor = ({ membershipId, author }: { membershipId: string; author: StoredTopic['author'] }) => ({ membership_id: membershipId, first_name: author.user.first_name, last_name: author.user.last_name })

type ToSummaryParams = {
  topic: StoredTopic
  isUnread: boolean
}

const toSummary = ({ topic, isUnread }: ToSummaryParams): DiscussionTopicSummary => ({
  id: topic.id,
  // A removed topic keeps no words
  title: topic.status === 'REMOVED' ? '' : topic.title,
  space: toSpaceRef(topic),
  author: toAuthor({ membershipId: topic.author_membership_id, author: topic.author }),
  is_pinned: topic.is_pinned,
  is_locked: topic.is_locked,
  status: topic.status,
  removed_by: topic.removed_by,
  // A removed topic's replies go with it
  reply_count: topic.status === 'REMOVED' ? 0 : topic._count.replies,
  last_activity_at: topic.last_activity_at.toISOString(),
  created_at: topic.created_at.toISOString(),
  is_unread: isUnread,
  is_space_archived: isSpaceArchived(topic) ?? false,
})

type ReplyViewer = {
  viewer: DiscussionViewer
  isModerator: boolean
  /** An archived group or course takes no edits, even of what was written before */
  isSpaceArchived: boolean
}

const toReply = ({ reply, viewer, isModerator, isSpaceArchived: isArchived }: ReplyViewer & { reply: StoredReply }): DiscussionReply => {
  const isActive = reply.status === 'ACTIVE'
  const isAuthor = reply.author_membership_id === viewer.membershipId
  return {
    id: reply.id,
    author: toAuthor({ membershipId: reply.author_membership_id, author: reply.author }),
    // A removed reply keeps no words
    body: isActive ? reply.body : '',
    status: reply.status,
    removed_by: reply.removed_by,
    edited_at: reply.edited_at?.toISOString() ?? null,
    created_at: reply.created_at.toISOString(),
    can_edit: isActive && isAuthor && !isArchived,
    can_remove: isActive && (isAuthor || isModerator),
  }
}

type ToDetailParams = Omit<ReplyViewer, 'isSpaceArchived'> & {
  topic: StoredTopic
  replies: StoredReply[]
  isUnread: boolean
}

const toDetail = ({ topic, replies, viewer, isModerator, isUnread }: ToDetailParams): DiscussionTopicDetail => {
  const isActive = topic.status === 'ACTIVE'
  const isAuthor = topic.author_membership_id === viewer.membershipId
  return {
    ...toSummary({ topic, isUnread }),
    body: isActive ? topic.body : '',
    edited_at: topic.edited_at?.toISOString() ?? null,
    // The replies of a removed topic go with it
    replies: isActive ? replies.map((reply) => toReply({ reply, viewer, isModerator, isSpaceArchived: isSpaceArchived(topic) })) : [],
    can_moderate: isModerator,
    can_edit: isActive && isAuthor && !isSpaceArchived(topic),
    can_remove: isActive && (isAuthor || isModerator),
    can_reply: isActive && !topic.is_locked && !isSpaceArchived(topic),
  }
}

const loadReplies = (topicId: string) => prisma.discussionReply.findMany({ where: { topic_id: topicId }, orderBy: { created_at: 'asc' }, take: REPLY_LIMIT, select: replySelect })

/** The topic for someone who reads its space; 404 for everyone else, as for one that doesn't exist */
const findReachableTopic = async ({ organizationId, viewer, topicId }: TopicScope) => {
  const topic = await prisma.discussionTopic.findFirst({ where: { id: topicId, organization_id: organizationId }, select: topicSelect })
  if (!topic) throw new HttpError(404, NOT_FOUND)
  const viewerSpaces = await loadViewerSpaces({ organizationId, viewer })
  const space = toSpaceRef(topic)
  if (!findViewerSpace({ viewerSpaces, kind: space.kind, id: space.id })) throw new HttpError(404, NOT_FOUND)
  return { topic, isModerator: viewerSpaces.isModerator }
}

type UnreadCandidate = Pick<StoredTopic, 'id' | 'author_membership_id' | 'created_at'>

/** The topics where someone else posted, the topic itself or a reply, after the viewer last read it (or they never opened it) */
const findUnreadTopicIds = async ({ viewer, topics }: { viewer: DiscussionViewer; topics: UnreadCandidate[] }) => {
  if (topics.length === 0) return new Set<string>()
  const ids = topics.map((topic) => topic.id)
  const [reads, newestReplies] = await Promise.all([
    prisma.discussionRead.findMany({ where: { membership_id: viewer.membershipId, topic_id: { in: ids } }, select: { topic_id: true, last_read_at: true } }),
    prisma.discussionReply.groupBy({
      by: ['topic_id'],
      where: { topic_id: { in: ids }, status: 'ACTIVE', author_membership_id: { not: viewer.membershipId } },
      _max: { created_at: true },
    }),
  ])
  const readAt = new Map(reads.map((read) => [read.topic_id, read.last_read_at]))
  const newestReplyAt = new Map(newestReplies.map((row) => [row.topic_id, row._max.created_at]))
  const unread = new Set<string>()
  for (const topic of topics) {
    const times = [topic.author_membership_id === viewer.membershipId ? null : topic.created_at, newestReplyAt.get(topic.id) ?? null]
    const newest = times.reduce<Date | null>((latest, time) => (time && (!latest || time > latest) ? time : latest), null)
    const lastRead = readAt.get(topic.id)
    if (newest && (!lastRead || newest > lastRead)) unread.add(topic.id)
  }
  return unread
}

/** Records the newest activity the viewer saw. It only moves forward and writes nothing when nothing is newer. */
const markRead = async ({ topicId, membershipId, at }: { topicId: string; membershipId: string; at: Date }) => {
  const existing = await prisma.discussionRead.findUnique({ where: { topic_id_membership_id: { topic_id: topicId, membership_id: membershipId } }, select: { last_read_at: true } })
  if (existing && existing.last_read_at >= at) return
  if (!existing) await prisma.discussionRead.createMany({ data: [{ topic_id: topicId, membership_id: membershipId, last_read_at: at }], skipDuplicates: true })
  await prisma.discussionRead.updateMany({ where: { topic_id: topicId, membership_id: membershipId, last_read_at: { lt: at } }, data: { last_read_at: at } })
}

const newest = (dates: Date[]) => dates.reduce((latest, date) => (date > latest ? date : latest))

/** The topic and its replies as the viewer sees them after a change */
const loadDetail = async ({ topicId, viewer, isModerator, organizationId }: TopicScope & { isModerator: boolean }) => {
  const topic = await prisma.discussionTopic.findFirstOrThrow({ where: { id: topicId, organization_id: organizationId }, select: topicSelect })
  return toDetail({ topic, replies: await loadReplies(topicId), viewer, isModerator, isUnread: false })
}

/** A reply of a topic the viewer reads; 404 otherwise */
const findReachableReply = async ({ replyId, ...scope }: ReplyScope) => {
  const { topic, isModerator } = await findReachableTopic(scope)
  if (topic.status === 'REMOVED') throw new HttpError(409, 'This topic was removed.')
  const reply = await prisma.discussionReply.findFirst({ where: { id: replyId, topic_id: scope.topicId, organization_id: scope.organizationId }, select: replySelect })
  if (!reply) throw new HttpError(404, 'Reply not found')
  return { reply, isModerator, isSpaceArchived: isSpaceArchived(topic) }
}

export const DiscussionService = {
  // Pinned first, then the latest activity
  list: async ({ organizationId, viewer }: ViewerScope): Promise<DiscussionTopicSummary[]> => {
    const viewerSpaces = await loadViewerSpaces({ organizationId, viewer })
    if (viewerSpaces.spaces.length === 0) return []
    const topics = await prisma.discussionTopic.findMany({
      where: topicsInSpaces({ organizationId, viewerSpaces }),
      orderBy: [{ is_pinned: 'desc' }, { last_activity_at: 'desc' }],
      take: LIST_LIMIT,
      select: topicSelect,
    })
    const unread = await findUnreadTopicIds({ viewer, topics: topics.filter((topic) => topic.status === 'ACTIVE') })
    return topics.map((topic) => toSummary({ topic, isUnread: unread.has(topic.id) }))
  },

  getUnreadCount: async ({ organizationId, viewer }: ViewerScope): Promise<DiscussionUnreadCount> => {
    const viewerSpaces = await loadViewerSpaces({ organizationId, viewer })
    if (viewerSpaces.spaces.length === 0) return { unread_count: 0 }
    const topics = await prisma.discussionTopic.findMany({
      where: { ...topicsInSpaces({ organizationId, viewerSpaces }), status: 'ACTIVE' },
      select: { id: true, author_membership_id: true, created_at: true },
    })
    return { unread_count: (await findUnreadTopicIds({ viewer, topics })).size }
  },

  // The spaces the viewer reads; they can start a topic in the ones that are not archived
  listSpaces: async ({ organizationId, viewer }: ViewerScope): Promise<DiscussionSpace[]> => (await loadViewerSpaces({ organizationId, viewer })).spaces,

  // Opening a topic marks it read up to the newest activity it shows
  get: async (scope: TopicScope): Promise<DiscussionTopicDetail> => {
    const { topic, isModerator } = await findReachableTopic(scope)
    const replies = await loadReplies(topic.id)
    const seenUntil = newest([topic.created_at, ...replies.map((reply) => reply.created_at)])
    await markRead({ topicId: topic.id, membershipId: scope.viewer.membershipId, at: seenUntil })
    return toDetail({ topic, replies, viewer: scope.viewer, isModerator, isUnread: false })
  },

  create: async ({ organizationId, viewer, data }: ViewerScope & { data: CreateDiscussionTopicInput }): Promise<DiscussionTopicDetail> => {
    const exists =
      data.space_kind === 'GROUP'
        ? await prisma.group.count({ where: { id: data.space_id, organization_id: organizationId } })
        : await prisma.course.count({ where: { id: data.space_id, organization_id: organizationId } })
    if (exists === 0) throw new HttpError(404, data.space_kind === 'GROUP' ? 'Group not found' : 'Course not found')
    const viewerSpaces = await loadViewerSpaces({ organizationId, viewer })
    const space = findViewerSpace({ viewerSpaces, kind: data.space_kind, id: data.space_id })
    if (!space) throw new HttpError(403, 'You can only start topics in your own groups and courses.')
    if (!space.can_post) throw new HttpError(409, archivedMessage(space))
    const now = new Date()
    const topic = await prisma.discussionTopic.create({
      data: {
        organization_id: organizationId,
        author_membership_id: viewer.membershipId,
        space_kind: data.space_kind,
        group_id: data.space_kind === 'GROUP' ? data.space_id : null,
        course_id: data.space_kind === 'COURSE' ? data.space_id : null,
        title: data.title,
        body: data.body,
        created_at: now,
        last_activity_at: now,
      },
      select: topicSelect,
    })
    return toDetail({ topic, replies: [], viewer, isModerator: viewerSpaces.isModerator, isUnread: false })
  },

  // The author edits their own topic, moderators don't edit what others wrote
  update: async ({ data, ...scope }: TopicScope & { data: UpdateDiscussionTopicInput }): Promise<DiscussionTopicDetail> => {
    const { topic, isModerator } = await findReachableTopic(scope)
    if (topic.author_membership_id !== scope.viewer.membershipId) throw new HttpError(403, 'You can only edit your own topics.')
    if (topic.status === 'REMOVED') throw new HttpError(409, 'A removed topic can’t be edited.')
    if (isSpaceArchived(topic)) throw new HttpError(409, archivedMessage({ kind: topic.space_kind }))
    if (data.title !== topic.title || data.body !== topic.body) {
      await prisma.discussionTopic.update({ where: { id: topic.id }, data: { title: data.title, body: data.body, edited_at: new Date() } })
    }
    return loadDetail({ ...scope, isModerator })
  },

  // The author removes their own topic, a moderator anyone's; the row stays
  remove: async (scope: TopicScope): Promise<DiscussionTopicDetail> => {
    const { topic, isModerator } = await findReachableTopic(scope)
    const isAuthor = topic.author_membership_id === scope.viewer.membershipId
    if (!isAuthor && !isModerator) throw new HttpError(403, 'You can only remove your own topics.')
    if (topic.status === 'ACTIVE') {
      await prisma.discussionTopic.update({ where: { id: topic.id }, data: { status: 'REMOVED', removed_by: isAuthor ? 'AUTHOR' : 'MODERATOR', is_pinned: false } })
    }
    return loadDetail({ ...scope, isModerator })
  },

  pin: async ({ isPinned, ...scope }: TopicScope & { isPinned: boolean }): Promise<DiscussionTopicDetail> => {
    const { topic, isModerator } = await findReachableTopic(scope)
    if (!isModerator) throw new HttpError(403, 'Only the lecturers of this space and school staff can pin topics.')
    if (topic.status === 'REMOVED') throw new HttpError(409, 'A removed topic can’t be pinned.')
    if (topic.is_pinned !== isPinned) await prisma.discussionTopic.update({ where: { id: topic.id }, data: { is_pinned: isPinned } })
    return loadDetail({ ...scope, isModerator })
  },

  lock: async ({ isLocked, ...scope }: TopicScope & { isLocked: boolean }): Promise<DiscussionTopicDetail> => {
    const { topic, isModerator } = await findReachableTopic(scope)
    if (!isModerator) throw new HttpError(403, 'Only the lecturers of this space and school staff can lock topics.')
    if (topic.status === 'REMOVED') throw new HttpError(409, 'A removed topic can’t be locked.')
    if (topic.is_locked !== isLocked) await prisma.discussionTopic.update({ where: { id: topic.id }, data: { is_locked: isLocked } })
    return loadDetail({ ...scope, isModerator })
  },

  reply: async ({ data, ...scope }: TopicScope & { data: DiscussionReplyInput }): Promise<DiscussionReply> => {
    const { topic, isModerator } = await findReachableTopic(scope)
    if (topic.status === 'REMOVED') throw new HttpError(409, 'This topic was removed.')
    if (isSpaceArchived(topic)) throw new HttpError(409, archivedMessage({ kind: topic.space_kind }))
    if (topic.is_locked) throw new HttpError(409, 'This topic is locked.')
    const now = new Date()
    const [reply] = await prisma.$transaction([
      prisma.discussionReply.create({
        data: { topic_id: topic.id, organization_id: scope.organizationId, author_membership_id: scope.viewer.membershipId, body: data.body, created_at: now },
        select: replySelect,
      }),
      prisma.discussionTopic.update({ where: { id: topic.id }, data: { last_activity_at: now } }),
    ])
    return toReply({ reply, viewer: scope.viewer, isModerator, isSpaceArchived: false })
  },

  updateReply: async ({ replyId, data, ...scope }: ReplyScope & { data: DiscussionReplyInput }): Promise<DiscussionReply> => {
    const { reply, isModerator, isSpaceArchived } = await findReachableReply({ ...scope, replyId })
    if (reply.author_membership_id !== scope.viewer.membershipId) throw new HttpError(403, 'You can only edit your own replies.')
    if (reply.status === 'REMOVED') throw new HttpError(409, 'A removed reply can’t be edited.')
    if (isSpaceArchived) throw new HttpError(409, 'This space is archived, so nothing in it can be edited.')
    const stored = reply.body === data.body ? reply : await prisma.discussionReply.update({ where: { id: reply.id }, data: { body: data.body, edited_at: new Date() }, select: replySelect })
    return toReply({ reply: stored, viewer: scope.viewer, isModerator, isSpaceArchived })
  },

  removeReply: async ({ replyId, ...scope }: ReplyScope): Promise<DiscussionReply> => {
    const { reply, isModerator, isSpaceArchived } = await findReachableReply({ ...scope, replyId })
    const isAuthor = reply.author_membership_id === scope.viewer.membershipId
    if (!isAuthor && !isModerator) throw new HttpError(403, 'You can only remove your own replies.')
    const stored =
      reply.status === 'ACTIVE'
        ? await prisma.discussionReply.update({ where: { id: reply.id }, data: { status: 'REMOVED', removed_by: isAuthor ? 'AUTHOR' : 'MODERATOR' }, select: replySelect })
        : reply
    return toReply({ reply: stored, viewer: scope.viewer, isModerator, isSpaceArchived })
  },
}
