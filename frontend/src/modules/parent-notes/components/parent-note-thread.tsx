import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, Mail, Phone, Send } from 'lucide-react'
import { parentNoteSchema } from '@shigjetademy/shared/parent-notes'
import type { ParentNoteThread as ParentNoteThreadData } from '@shigjetademy/shared/parent-notes'
import { EmptyMessage } from '#/components/EmptyMessage'
import { FormAlert } from '#/components/FormAlert'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SkeletonRows } from '#/components/SkeletonRows'
import { getErrorMessage } from '#/lib/error-message'
import { fullName } from '#/lib/full-name'
import { useFormatDateTime } from '#/lib/use-format-date'
import { RELATIONSHIP_LABELS } from '#/modules/guardians/utils/relationship-labels'
import { useParentNoteThread } from '../hooks/use-parent-note-thread'
import { useSendParentNote } from '../hooks/use-send-parent-note'

interface ParentNoteThreadProps {
  organizationId: string
  studentId: string
  onBack: () => void
}

/** One student's conversation: their guardians, every note sent with its date and time, and the note to write next */
export function ParentNoteThread({ organizationId, studentId, onBack }: ParentNoteThreadProps) {
  const thread = useParentNoteThread({ organizationId, studentId })
  if (thread.status === 'error') {
    return (
      <SectionCard title="Conversation" action={<BackButton onBack={onBack} />}>
        <LoadError what="conversation" onRetry={() => void thread.refetch()} />
      </SectionCard>
    )
  }
  if (!thread.data) {
    return (
      <SectionCard title="Conversation" action={<BackButton onBack={onBack} />}>
        <SkeletonRows />
      </SectionCard>
    )
  }
  return <ParentNoteThreadView organizationId={organizationId} thread={thread.data} onBack={onBack} />
}

interface ParentNoteThreadViewProps {
  organizationId: string
  thread: ParentNoteThreadData
  onBack: () => void
}

interface BackButtonProps {
  onBack: () => void
}

function BackButton({ onBack }: BackButtonProps) {
  return (
    <button type="button" className="button button--ghost min-h-11 px-4" onClick={onBack}>
      <ArrowLeft size={17} strokeWidth={2.2} aria-hidden="true" />
      Back
    </button>
  )
}

function ParentNoteThreadView({ organizationId, thread, onBack }: ParentNoteThreadViewProps) {
  const { student, guardians, notes } = thread
  const formatDateTime = useFormatDateTime()
  const name = fullName(student)

  return (
    <SectionCard title={name} action={<BackButton onBack={onBack} />}>
      <div className="grid gap-5 p-5">
        <section aria-label="Parents and guardians" className="grid gap-2.5">
          <h3 className="text-[0.95rem] font-[650] text-ink-2">Parents and guardians</h3>
          {guardians.length === 0 ? (
            <p className="text-ink-2">{name} has no parent or guardian on file yet, so notes can’t be sent.</p>
          ) : (
            <ul className="grid gap-2.5 min-[700px]:grid-cols-2">
              {guardians.map((guardian) => (
                <li key={guardian.id} className="grid gap-1 rounded-xl border border-rule px-4 py-3">
                  <span className="font-semibold">{fullName(guardian)}</span>
                  <span className="text-[0.93rem] text-ink-2">{RELATIONSHIP_LABELS[guardian.relationship]}</span>
                  {guardian.email ? (
                    <span className="flex items-center gap-1.5 text-[0.93rem] break-all text-ink-2">
                      <Mail className="flex-none" size={14} strokeWidth={1.9} aria-hidden="true" />
                      {guardian.email}
                    </span>
                  ) : null}
                  {guardian.phone ? (
                    <span className="flex items-center gap-1.5 text-[0.93rem] text-ink-2">
                      <Phone className="flex-none" size={14} strokeWidth={1.9} aria-hidden="true" />
                      {guardian.phone}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Notes sent" className="grid gap-2.5">
          <h3 className="text-[0.95rem] font-[650] text-ink-2">Notes sent</h3>
          {notes.length === 0 ? (
            <EmptyMessage icon={Send} title="No notes yet" text={`Your first note to ${name}’s parents starts the conversation.`} />
          ) : (
            <ul className="grid gap-3">
              {notes.map((note) => (
                <li key={note.id} className="grid max-w-[min(100%,640px)] gap-1.5 justify-self-end rounded-2xl rounded-br-md border border-rule bg-mist px-4 py-3">
                  <p className="break-words whitespace-pre-wrap">{note.body}</p>
                  <time className="tabular text-[0.85rem] text-ink-3" dateTime={note.created_at}>
                    {formatDateTime(note.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>

        <NoteComposer organizationId={organizationId} studentId={student.id} studentName={name} canSend={guardians.length > 0} />
      </div>
    </SectionCard>
  )
}

interface NoteComposerProps {
  organizationId: string
  studentId: string
  studentName: string
  canSend: boolean
}

function NoteComposer({ organizationId, studentId, studentName, canSend }: NoteComposerProps) {
  const sendNote = useSendParentNote({ organizationId, studentId })
  const [body, setBody] = useState('')
  const [validationError, setValidationError] = useState('')
  const textareaId = useId()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = parentNoteSchema.safeParse({ body })
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Write a note first.')
      return
    }
    setValidationError('')
    sendNote.mutate(parsed.data.body, { onSuccess: () => setBody('') })
  }

  const errorMessage = validationError || (sendNote.isError ? getErrorMessage(sendNote.error) : '')

  return (
    <form className="grid gap-2.5 border-t border-rule pt-5" noValidate onSubmit={handleSubmit}>
      <label htmlFor={textareaId} className="text-[0.987rem] font-[650]">
        Note to {studentName}’s parents
      </label>
      <textarea
        id={textareaId}
        rows={4}
        value={body}
        disabled={sendNote.isPending}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Write a note…"
        className="min-h-28 w-full resize-y rounded-xl border border-rule-strong bg-white px-3.5 py-3 text-base transition-[border-color,box-shadow] duration-150 placeholder:text-ink-3 hover:border-ink-3 focus:border-green-deep focus:shadow-[0_0_0_3px_var(--green-wash)] focus:outline-none disabled:opacity-60"
      />
      {errorMessage ? <FormAlert>{errorMessage}</FormAlert> : null}
      <div className="flex justify-end">
        <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={sendNote.isPending || !canSend}>
          <Send size={16} strokeWidth={2} aria-hidden="true" />
          Send
        </button>
      </div>
    </form>
  )
}
