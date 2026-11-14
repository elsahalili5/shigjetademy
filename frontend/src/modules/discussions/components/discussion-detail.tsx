import { Fragment, useRef, useState } from 'react'
import { CalendarClock, Layers, MessagesSquare, UserRound, UsersRound } from 'lucide-react'
import type { DiscussionTopicDetail } from '@shigjetademy/shared/discussions'
import { LoadError } from '#/components/LoadError'
import { fullName } from '#/lib/full-name'
import { getDayLabel, getMessageDayKey } from '#/lib/message-days'
import { useFormatDate, useFormatDateTime, useFormatTime } from '#/lib/use-format-date'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { useDiscussion } from '../hooks/use-discussion'
import { hasTopicActions } from '../utils/has-topic-actions'
import { getRemovedLabel } from '../utils/removed-label'
import { getSpaceLabel } from '../utils/space'
import { TopicChips } from './discussion-chips'
import { DiscussionFormDialog } from './discussion-form-dialog'
import { DiscussionBubble } from './discussion-bubble'
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
  const formatDate = useFormatDate()
  const formatTime = useFormatTime()
  const myMembershipId = useActiveMembership()?.id
  // Read once, so the "Today" headings don't change while the topic is open
  const [now] = useState(() => new Date())
  const editDialogRef = useRef<HTMLDialogElement>(null)
  const isRemoved = topic.status === 'REMOVED'
  const SpaceIcon = topic.space.kind === 'GROUP' ? UsersRound : Layers
  // The topic's own text is the first bubble, then the replies in time order; a run is consecutive posts by one person on one day
  const posts = [topic, ...topic.replies]
  const runOf = (index: number) => {
    const post = posts[index]
    const previous = posts[index - 1]
    const next = posts[index + 1]
    const dayKey = getMessageDayKey(post.created_at)
    const isNewDay = !previous || getMessageDayKey(previous.created_at) !== dayKey
    return {
      isNewDay,
      isFirst: isNewDay || previous?.author.membership_id !== post.author.membership_id,
      isLast: !next || getMessageDayKey(next.created_at) !== dayKey || next.author.membership_id !== post.author.membership_id,
    }
  }

  return (
    <article className="flex min-h-0 flex-1 flex-col" aria-labelledby="discussion-title">
      <header className="grid gap-3 border-b border-rule px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <h2 id="discussion-title" className={`min-w-0 flex-1 text-[1.35rem] leading-tight font-[680] tracking-[-0.02em] break-words ${isRemoved ? 'font-normal text-ink-3 italic' : ''}`}>
            {isRemoved ? 'Removed topic' : topic.title}
          </h2>
          <span className="flex flex-wrap items-center gap-1.5">
            <TopicChips isPinned={topic.is_pinned} isLocked={topic.is_locked} isSpaceArchived={topic.is_space_archived} />
          </span>
        </div>
        <ul aria-label="About this topic" className="flex flex-wrap items-center gap-2 text-[0.88rem]">
          <li className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-green-wash px-3 py-1 font-semibold text-green-deep">
            <SpaceIcon className="flex-none" size={14} strokeWidth={2} aria-hidden="true" />
            <span className="truncate">{getSpaceLabel(topic.space)}</span>
          </li>
          <li className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-3 py-1 text-ink-2 ring-1 ring-rule">
            <UserRound className="flex-none text-ink-3" size={14} strokeWidth={2} aria-hidden="true" />
            <span className="truncate">{fullName(topic.author)}</span>
          </li>
          <li className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-ink-2 ring-1 ring-rule">
            <CalendarClock className="flex-none text-ink-3" size={14} strokeWidth={2} aria-hidden="true" />
            <time dateTime={topic.created_at}>{formatDateTime(topic.created_at)}</time>
          </li>
        </ul>
      </header>

      <div className="max-h-[min(58svh,600px)] min-h-[260px] flex-1 overflow-y-auto bg-mist/40 px-5 py-5">
        <div className="grid">
          <DayHeading label={getDayLabel({ iso: topic.created_at, now, formatDate })} />
          <DiscussionBubble
            author={topic.author}
            isMine={topic.author.membership_id === myMembershipId}
            isFirstInRun
            isLastInRun={runOf(0).isLast}
            meta={
              <>
                {topic.edited_at && !isRemoved ? <span>(edited)</span> : null}
                <time dateTime={topic.created_at}>{formatTime(topic.created_at)}</time>
              </>
            }
          >
            {isRemoved ? <p className="italic opacity-80">{getRemovedLabel(topic.removed_by)}</p> : <p className="break-words whitespace-pre-wrap">{topic.body}</p>}
          </DiscussionBubble>
        </div>
        {topic.replies.length > 0 ? (
          <ul aria-label="Replies" className="grid">
            {topic.replies.map((reply, index) => {
              const { isNewDay, isFirst, isLast } = runOf(index + 1)
              return (
                <Fragment key={reply.id}>
                  {isNewDay ? <DayHeading label={getDayLabel({ iso: reply.created_at, now, formatDate })} /> : null}
                  <DiscussionReplyItem
                    organizationId={organizationId}
                    topicId={topic.id}
                    reply={reply}
                    isMine={reply.author.membership_id === myMembershipId}
                    isFirstInRun={isFirst}
                    isLastInRun={isLast}
                    isLatest={index === topic.replies.length - 1}
                  />
                </Fragment>
              )
            })}
          </ul>
        ) : null}
        {topic.replies.length === 0 && !isRemoved ? <p className="pt-4 text-center text-[0.95rem] text-ink-3">No replies yet.</p> : null}
      </div>

      {hasTopicActions(topic) ? <DiscussionTopicActions organizationId={organizationId} topic={topic} onEdit={() => editDialogRef.current?.showModal()} /> : null}
      <DiscussionReplyBox organizationId={organizationId} topicId={topic.id} blockedHint={getBlockedHint(topic)} />
      {topic.can_edit ? <DiscussionFormDialog dialogRef={editDialogRef} organizationId={organizationId} topic={topic} onSaved={() => undefined} /> : null}
    </article>
  )
}

interface DayHeadingProps {
  label: string
}

/** The pill between days of a chat: Today, Yesterday or a date */
function DayHeading({ label }: DayHeadingProps) {
  return (
    <li role="separator" aria-label={label} className="my-3 flex justify-center first:mt-0">
      <span className="rounded-full bg-white px-3 py-1 text-[0.8rem] font-semibold text-ink-3 shadow-[0_1px_1px_rgba(22,34,46,0.06)] ring-1 ring-rule">{label}</span>
    </li>
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
