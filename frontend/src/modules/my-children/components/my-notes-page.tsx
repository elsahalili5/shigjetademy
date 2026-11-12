import { MessageSquareText } from 'lucide-react'
import type { MyNote } from '@shigjetademy/shared/parent-notes'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SkeletonRows } from '#/components/SkeletonRows'
import { fullName } from '#/lib/full-name'
import { useFormatDateTime } from '#/lib/use-format-date'
import { useMyNotes } from '../hooks/use-my-notes'

interface MyNotesPageProps {
  organizationId: string
  organizationName: string
}

/** A guardian's Notes: everything the teachers wrote about their children, newest first, read-only */
export function MyNotesPage({ organizationId, organizationName }: MyNotesPageProps) {
  const notes = useMyNotes(organizationId)

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={MessageSquareText} title="Notes" subtitle={organizationName} />
      <div className="grid max-w-[880px] gap-5 px-[clamp(20px,3.4vw,44px)] pb-10">
        <SectionCard title="Notes from teachers">
          <NoteList status={notes.status} items={notes.data} onRetry={() => void notes.refetch()} />
        </SectionCard>
      </div>
    </div>
  )
}

interface NoteListProps {
  status: 'pending' | 'error' | 'success'
  items?: MyNote[]
  onRetry: () => void
}

function NoteList({ status, items, onRetry }: NoteListProps) {
  const formatDateTime = useFormatDateTime()
  if (status === 'error') return <LoadError what="your notes" onRetry={onRetry} />
  if (!items) return <SkeletonRows />
  if (items.length === 0) return <EmptyMessage icon={MessageSquareText} title="No notes yet" text="When a teacher writes to you about your child, it shows up here." />
  return (
    <ul aria-label="Notes">
      {items.map((note) => (
        <li key={note.id} className="grid gap-1.5 border-b border-rule px-5 py-4 last:border-b-0">
          <p className="text-[0.93rem] font-[650] text-ink-2">About {fullName(note.student)}</p>
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
