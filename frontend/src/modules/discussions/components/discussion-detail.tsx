import { useRef } from 'react'
import { MessagesSquare } from 'lucide-react'
import type { DiscussionTopicDetail } from '@shigjetademy/shared/discussions'
import { LoadError } from '#/components/LoadError'
import { fullName } from '#/lib/full-name'
import { useFormatDateTime } from '#/lib/use-format-date'
import { useDiscussion } from '../hooks/use-discussion'
import { hasTopicActions } from '../utils/has-topic-actions'
import { getRemovedLabel } from '../utils/removed-label'
import { getSpaceLabel } from '../utils/space'
import { TopicChips } from './discussion-chips'
import { DiscussionFormDialog } from './discussion-form-dialog'
import { DiscussionReplyBox } from './discussion-reply-box'
import { DiscussionReplyItem } from './discussion-reply-item'
import { DiscussionTopicActions } from './discussion-topic-actions'

interface DiscussionDetailPaneProps {
  organizationId: string
  topicId: string
}

/** One open topic: its text, the replies in time order, the reply box, and what the member may do with it */
export function DiscussionDetailPane({ organizationId, topicId }: DiscussionDetailPaneProps) {
  const topic = useDiscussion({ organizationId, topicId })

  if (topic.status === 'error') return <LoadError what="topic" onRetry={() => void topic.refetch()} />
  if (!topic.data) return <DetailSkeleton />
  return <LoadedTopic organizationId={organizationId} topic={topic.data} />
}

/** Why the member can't reply, or null when they can */
const getBlockedHint = (topic: DiscussionTopicDetail) => {
  if (topic.can_reply) return null
  if (topic.status === 'REMOVED') return 'This topic was removed.'
  if (topic.is_space_archived) return `This ${topic.space.kind === 'GROUP' ? 'group' : 'course'} is archived, so it takes no new replies.`
  return 'This topic is locked. It takes no new replies.'
}

interface LoadedTopicProps {
  organizationId: string
  topic: DiscussionTopicDetail
}

function LoadedTopic({ organizationId, topic }: LoadedTopicProps) {
  const formatDateTime = useFormatDateTime()
  const editDialogRef = useRef<HTMLDialogElement>(null)
  const isRemoved = topic.status === 'REMOVED'

  return (
    <article className="flex min-h-0 flex-1 flex-col" aria-labelledby="discussion-title">
      <header className="grid gap-2 border-b border-rule px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 id="discussion-title" className={`min-w-0 text-[1.3rem] leading-tight font-[680] break-words ${isRemoved ? 'font-normal text-ink-3 italic' : ''}`}>
            {isRemoved ? 'Removed topic' : topic.title}
          </h2>
          <span className="flex flex-wrap items-center gap-1.5">
            <TopicChips isPinned={topic.is_pinned} isLocked={topic.is_locked} isSpaceArchived={topic.is_space_archived} />
          </span>
        </div>
        <dl className="grid gap-x-6 gap-y-1 text-[0.93rem] text-ink-2 sm:grid-cols-2">
          <div className="flex gap-1.5">
            <dt className="text-ink-3">In</dt>
            <dd>{getSpaceLabel(topic.space)}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-ink-3">From</dt>
            <dd>{fullName(topic.author)}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-ink-3">Posted</dt>
            <dd>
              <time dateTime={topic.created_at}>{formatDateTime(topic.created_at)}</time>
              {topic.edited_at && !isRemoved ? <span> (edited)</span> : null}
            </dd>
          </div>
        </dl>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-rule px-5 py-5">
          {isRemoved ? <p className="text-ink-3 italic">{getRemovedLabel(topic.removed_by)}</p> : <p className="whitespace-pre-wrap break-words">{topic.body}</p>}
        </div>
        {topic.replies.length > 0 ? (
          <ul aria-label="Replies">
            {topic.replies.map((reply) => (
              <DiscussionReplyItem key={reply.id} organizationId={organizationId} topicId={topic.id} reply={reply} />
            ))}
          </ul>
        ) : null}
        {topic.replies.length === 0 && !isRemoved ? <p className="px-5 py-5 text-[0.95rem] text-ink-3">No replies yet.</p> : null}
      </div>

      {hasTopicActions(topic) ? <DiscussionTopicActions organizationId={organizationId} topic={topic} onEdit={() => editDialogRef.current?.showModal()} /> : null}
      <DiscussionReplyBox organizationId={organizationId} topicId={topic.id} blockedHint={getBlockedHint(topic)} />
      {topic.can_edit ? <DiscussionFormDialog dialogRef={editDialogRef} organizationId={organizationId} topic={topic} onSaved={() => undefined} /> : null}
    </article>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid flex-1 content-start gap-4 px-5 py-5" aria-busy="true" aria-label="Loading">
      <span className="h-6 w-2/3 animate-pulse rounded bg-mist" aria-hidden="true" />
      <span className="h-4 w-1/2 animate-pulse rounded bg-mist" aria-hidden="true" />
      <span className="h-24 w-full animate-pulse rounded-2xl bg-mist" aria-hidden="true" />
    </div>
  )
}

/** What the topic side shows before a topic is picked */
export function NoDiscussionSelected() {
  return (
    <div className="grid flex-1 place-content-center justify-items-center gap-2 px-5 py-16 text-center text-ink-2">
      <MessagesSquare className="text-ink-3" size={26} strokeWidth={1.6} aria-hidden="true" />
      <p className="font-semibold text-ink">Pick a topic</p>
      <p>Choose one on the left, or start a new topic.</p>
    </div>
  )
}
