import { MessageSquareText } from 'lucide-react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { ParentNoteConversation } from '@shigjetademy/shared/parent-notes'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SkeletonRows } from '#/components/SkeletonRows'
import { fullName } from '#/lib/full-name'
import { initials } from '#/lib/initials'
import { useFormatDateTime } from '#/lib/use-format-date'

interface ParentNoteConversationListProps {
  conversations: UseQueryResult<ParentNoteConversation[]>
  selectedStudentId: string | null
  onSelect: (studentId: string) => void
}

/** Every student the lecturer wrote to, the latest note first, like the chats of a messaging app */
export function ParentNoteConversationList({ conversations, selectedStudentId, onSelect }: ParentNoteConversationListProps) {
  return (
    <SectionCard title="Conversations">
      <ConversationListContent conversations={conversations} selectedStudentId={selectedStudentId} onSelect={onSelect} />
    </SectionCard>
  )
}

function ConversationListContent({ conversations, selectedStudentId, onSelect }: ParentNoteConversationListProps) {
  const formatDateTime = useFormatDateTime()
  if (conversations.status === 'error') return <LoadError what="conversations" onRetry={() => void conversations.refetch()} />
  if (!conversations.data) return <SkeletonRows />
  if (conversations.data.length === 0) {
    return <EmptyMessage icon={MessageSquareText} title="No conversations yet" text="Send a note to a student’s parents and the conversation shows up here." />
  }
  return (
    <ul aria-label="Conversations" className="max-h-[min(60svh,560px)] overflow-y-auto">
      {conversations.data.map(({ student, last_note }) => {
        const name = fullName(student)
        return (
          <li key={student.id} className="border-b border-rule last:border-b-0">
            <button
              type="button"
              onClick={() => onSelect(student.id)}
              aria-current={student.id === selectedStudentId ? 'true' : undefined}
              className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors duration-150 hover:bg-mist aria-[current=true]:bg-green-wash"
            >
              <span className="grid size-10 flex-none place-items-center rounded-full bg-green-wash text-[0.9rem] font-bold text-green-deep" aria-hidden="true">
                {initials(name)}
              </span>
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-semibold" title={name}>
                    {name}
                  </span>
                  <time className="tabular flex-none text-[0.85rem] text-ink-3" dateTime={last_note.created_at}>
                    {formatDateTime(last_note.created_at)}
                  </time>
                </span>
                <span className="truncate text-[0.93rem] text-ink-2" title={last_note.body}>
                  {last_note.body}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
