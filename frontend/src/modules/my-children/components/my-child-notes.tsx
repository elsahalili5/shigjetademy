import { MessageSquareText } from 'lucide-react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { MyChildNote } from '@shigjetademy/shared/parent-notes'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SkeletonRows } from '#/components/SkeletonRows'
import { fullName } from '#/lib/full-name'
import { useFormatDateTime } from '#/lib/use-format-date'

interface MyChildNotesProps {
  notes: UseQueryResult<MyChildNote[]>
}

/** What the child's lecturers wrote to their parents, newest first, read-only */
export function MyChildNotes({ notes }: MyChildNotesProps) {
  const formatDateTime = useFormatDateTime()
  return (
    <SectionCard title="Notes from teachers">
      <MyChildNotesContent notes={notes} formatDateTime={formatDateTime} />
    </SectionCard>
  )
}

interface MyChildNotesContentProps extends MyChildNotesProps {
  formatDateTime: (iso: string) => string
}

function MyChildNotesContent({ notes, formatDateTime }: MyChildNotesContentProps) {
  if (notes.status === 'error') return <LoadError what="notes" onRetry={() => void notes.refetch()} />
  if (!notes.data) return <SkeletonRows />
  if (notes.data.length === 0) return <EmptyMessage icon={MessageSquareText} title="No notes yet" text="When a teacher writes to you about your child, it shows up here." />
  return (
    <ul aria-label="Notes from teachers">
      {notes.data.map((note) => (
        <li key={note.id} className="grid gap-1.5 border-b border-rule px-5 py-4 last:border-b-0">
          <p className="break-words whitespace-pre-wrap">{note.body}</p>
          <p className="text-[0.93rem] text-ink-2">
            <span className="font-semibold">{fullName(note.author)}</span> ·{' '}
            <time className="tabular" dateTime={note.created_at}>
              {formatDateTime(note.created_at)}
            </time>
          </p>
        </li>
      ))}
    </ul>
  )
}
