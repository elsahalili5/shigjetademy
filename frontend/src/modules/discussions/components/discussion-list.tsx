import { MessagesSquare } from 'lucide-react'
import type { DiscussionTopicSummary } from '@shigjetademy/shared/discussions'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SkeletonRows } from '#/components/SkeletonRows'
import { fullName } from '#/lib/full-name'
import { useFormatDateTime } from '#/lib/use-format-date'
import { getSpaceLabel } from '../utils/space'
import { TopicChips } from './discussion-chips'

const getTopicTitle = (topic: DiscussionTopicSummary) => (topic.status === 'REMOVED' ? 'Removed topic' : topic.title)

interface DiscussionListProps {
  status: 'pending' | 'error' | 'success'
  topics?: DiscussionTopicSummary[]
  /** The member is in no group or course, so there is nothing to show or post */
  hasNoSpaces: boolean
  /** A space is chosen in the filter, so an empty list says so */
  isFiltered: boolean
  selectedId: string | null
  onSelect: (topicId: string) => void
  onRetry: () => void
}

/** The topics of the chosen space or of all of them, pinned first and then the latest activity; unread ones carry a dot */
export function DiscussionList({ status, topics, hasNoSpaces, isFiltered, selectedId, onSelect, onRetry }: DiscussionListProps) {
  const formatDateTime = useFormatDateTime()

  if (status === 'error') return <LoadError what="topics" onRetry={onRetry} />
  if (!topics) return <SkeletonRows />
  if (topics.length === 0 && hasNoSpaces) return <EmptyMessage icon={MessagesSquare} title="You are not in a group or course yet." text="Discussions open for the groups and courses you belong to." />
  if (topics.length === 0) {
    return isFiltered ? (
      <EmptyMessage icon={MessagesSquare} title="No topics here yet." text="Start one with New topic." />
    ) : (
      <EmptyMessage icon={MessagesSquare} title="No topics yet." text="Start a conversation with the people of your groups and courses." />
    )
  }
  return (
    <ul aria-label="Topics">
      {topics.map((topic) => {
        const isSelected = topic.id === selectedId
        const isRemoved = topic.status === 'REMOVED'
        return (
          <li key={topic.id} className="border-b border-rule last:border-b-0">
            <button
              type="button"
              aria-current={isSelected ? 'true' : undefined}
              className={`grid w-full gap-1 px-5 py-3.5 text-left transition-colors duration-150 hover:bg-mist ${isSelected ? 'bg-green-wash' : ''}`}
              onClick={() => onSelect(topic.id)}
            >
              <span className="flex items-center justify-between gap-3">
                <span className={`flex min-w-0 items-center gap-2 ${topic.is_unread ? 'font-bold' : 'font-semibold'}`}>
                  {topic.is_unread ? <span className="size-2 flex-none rounded-full bg-green-deep" role="img" aria-label="Unread" /> : null}
                  <span className={`truncate ${isRemoved ? 'font-normal text-ink-3 italic' : ''}`}>{getTopicTitle(topic)}</span>
                </span>
                <span className="flex flex-none items-center gap-1.5">
                  <TopicChips isPinned={topic.is_pinned} isLocked={topic.is_locked} isSpaceArchived={topic.is_space_archived} />
                </span>
              </span>
              <span className="truncate text-[0.82rem] text-ink-3">
                {getSpaceLabel(topic.space)} · {fullName(topic.author)}
              </span>
              <span className="flex flex-wrap gap-x-2 text-[0.82rem] text-ink-3">
                <span>{topic.reply_count === 1 ? '1 reply' : `${topic.reply_count} replies`}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={topic.last_activity_at}>{formatDateTime(topic.last_activity_at)}</time>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
