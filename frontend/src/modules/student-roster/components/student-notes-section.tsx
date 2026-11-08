import { useId } from 'react'
import { NotebookPen } from 'lucide-react'
import type { StudentNoteEntry } from '@shigjetademy/shared/student-notes'
import type { CreateStudentNoteInput } from '@shigjetademy/shared/student-notes'
import { FormAlert } from '#/components/FormAlert'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SelectField } from '#/components/SelectField'
import { SkeletonRows } from '#/components/SkeletonRows'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { useFormatDateTime } from '#/lib/use-format-date'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useStudentNoteForm } from '../hooks/use-student-note-form'
import { useStudentNotes } from '../hooks/use-student-notes'
import { useWriteStudentNote } from '../hooks/use-write-student-note'

interface StudentNotesSectionProps {
  organizationId: string
  studentId: string
  /** The groups this viewer currently shares with the student; the form asks which one when there's more than one */
  groups: { id: string; name: string }[]
}

/** A lecturer's running, append-only log about a student, in the context of one shared group */
export function StudentNotesSection({ organizationId, studentId, groups }: StudentNotesSectionProps) {
  const notes = useStudentNotes({ organizationId, studentId })

  return (
    <SectionCard title="Notes">
      <StudentNoteForm organizationId={organizationId} studentId={studentId} groups={groups} />
      <StudentNoteList notes={notes.data} isError={notes.status === 'error'} onRetry={() => void notes.refetch()} />
    </SectionCard>
  )
}

interface StudentNoteFormProps {
  organizationId: string
  studentId: string
  groups: { id: string; name: string }[]
}

function StudentNoteForm({ organizationId, studentId, groups }: StudentNoteFormProps) {
  const form = useStudentNoteForm({ defaultGroupId: groups.length === 1 ? groups[0].id : '' })
  const writeNote = useWriteStudentNote({ organizationId, studentId })
  const groupId = useId()
  const bodyId = useId()
  const isPending = writeNote.isPending

  const handleSubmit = form.handleSubmit((input: CreateStudentNoteInput) => {
    writeNote.mutate(input, { onSuccess: () => form.reset({ group_id: input.group_id, body: '' }) })
  })

  if (groups.length === 0) return null

  return (
    <form className="grid gap-4 border-b border-rule px-5 py-5" noValidate onSubmit={handleSubmit}>
      {groups.length > 1 ? (
        <SelectField id={groupId} label="Group" error={getFieldError<CreateStudentNoteInput>({ fieldName: 'group_id', formErrors: form.formState.errors, backendError: writeNote.error })} disabled={isPending} {...form.register('group_id')}>
          <option value="" disabled>
            Choose a group
          </option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </SelectField>
      ) : null}
      <AuthField
        id={bodyId}
        label="Note"
        autoComplete="off"
        disabled={isPending}
        error={getFieldError<CreateStudentNoteInput>({ fieldName: 'body', formErrors: form.formState.errors, backendError: writeNote.error })}
        {...form.register('body')}
      />
      {writeNote.isError ? <FormAlert>{getErrorMessage(writeNote.error)}</FormAlert> : null}
      <div>
        <button className="button button--primary min-h-11 px-5 text-base" type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Add note'}
        </button>
      </div>
    </form>
  )
}

interface StudentNoteListProps {
  notes: StudentNoteEntry[] | undefined
  isError: boolean
  onRetry: () => void
}

function StudentNoteList({ notes, isError, onRetry }: StudentNoteListProps) {
  const formatDateTime = useFormatDateTime()

  if (!notes) {
    if (isError) return <LoadError what="notes" onRetry={onRetry} />
    return <SkeletonRows />
  }
  if (notes.length === 0) {
    return <EmptyMessage icon={NotebookPen} title="No notes yet" text="Notes written about this student will show up here." />
  }
  return (
    <ul aria-label="Notes">
      {notes.map((note) => (
        <li key={note.id} className="grid gap-1.5 border-b border-rule px-5 py-3.5 last:border-b-0">
          <p>{note.body}</p>
          <p className="text-[0.88rem] text-ink-3">
            {note.group.name} · {note.lecturer ? `${note.lecturer.first_name} ${note.lecturer.last_name}` : 'A deleted user'} · {formatDateTime(note.created_at)}
          </p>
        </li>
      ))}
    </ul>
  )
}
