import { useId } from 'react'
import type { RefObject } from 'react'
import { Users } from 'lucide-react'
import type { InboxContact, StartConversationInput } from '@shigjetademy/shared/inbox'
import { EmptyMessage } from '#/components/EmptyMessage'
import { FormAlert } from '#/components/FormAlert'
import { FormDialog } from '#/components/FormDialog'
import { LoadError } from '#/components/LoadError'
import { fullName } from '#/lib/full-name'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { FieldError, INPUT_CLASS } from '#/modules/auth/components/auth-field'
import { ROLE_LABELS } from '#/modules/auth/utils/role-labels'
import { useInboxContacts } from '../hooks/use-inbox-contacts'
import { useNewMessageForm } from '../hooks/use-new-message-form'
import { useStartConversation } from '../hooks/use-start-conversation'
import { groupContacts } from '../utils/group-contacts'

interface NewMessageDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  onStarted: (conversationId: string) => void
}

/** Pick someone from the contacts the server allows, write the first message and send it */
export function NewMessageDialog({ dialogRef, organizationId, onStarted }: NewMessageDialogProps) {
  const contacts = useInboxContacts(organizationId)
  const handleClose = () => dialogRef.current?.close()

  const handleStarted = (conversationId: string) => {
    handleClose()
    onStarted(conversationId)
  }

  return (
    <FormDialog dialogRef={dialogRef} title="New message" subtitle="Choose who to write to. Only the two of you can read it." onClose={handleClose}>
      {contacts.status === 'error' ? <LoadError what="contacts" onRetry={() => void contacts.refetch()} /> : null}
      {contacts.status === 'pending' ? <p className="px-6 py-8 text-ink-2">Loading contacts…</p> : null}
      {contacts.data ? <NewMessageForm organizationId={organizationId} contacts={contacts.data} onStarted={handleStarted} onCancel={handleClose} /> : null}
    </FormDialog>
  )
}

interface NewMessageFormProps {
  organizationId: string
  contacts: InboxContact[]
  onStarted: (conversationId: string) => void
  onCancel: () => void
}

function NewMessageForm({ organizationId, contacts, onStarted, onCancel }: NewMessageFormProps) {
  const form = useNewMessageForm()
  const startConversation = useStartConversation(organizationId)
  const bodyId = useId()
  const { errors } = form.formState
  const isPending = startConversation.isPending
  const fieldError = (fieldName: keyof StartConversationInput) => getFieldError<StartConversationInput>({ fieldName, formErrors: errors, backendError: startConversation.error })

  if (contacts.length === 0) {
    return (
      <>
        <EmptyMessage icon={Users} title="There is nobody you can message yet." text="Who you can write to depends on your role and, for lecturers and students, on the groups you share." />
        <footer className="flex justify-end border-t border-rule px-6 py-4">
          <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
            Close
          </button>
        </footer>
      </>
    )
  }

  const handleSubmit = form.handleSubmit((input: StartConversationInput) => {
    const recipient = contacts.find((contact) => contact.membership_id === input.recipient_membership_id)
    if (!recipient) return
    startConversation.mutate(
      { recipient, body: input.body },
      {
        onSuccess: ({ conversation_id: conversationId }) => {
          form.reset()
          onStarted(conversationId)
        },
      },
    )
  })

  const recipientError = fieldError('recipient_membership_id')
  const bodyError = fieldError('body')

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-5 overflow-y-auto px-6 py-5">
        <fieldset className="grid gap-4" disabled={isPending} aria-describedby={recipientError ? 'recipient-error' : undefined}>
          <legend className="mb-2 text-[0.987rem] font-[650]">To</legend>
          {groupContacts(contacts).map((group) => (
            <div key={group.title} role="group" aria-label={group.title} className="grid gap-1">
              <p className="text-[0.82rem] font-semibold tracking-[0.04em] text-ink-3 uppercase">{group.title}</p>
              {group.contacts.map((contact) => (
                <label key={contact.membership_id} className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 hover:bg-mist has-checked:border-green-deep has-checked:bg-green-wash">
                  <input type="radio" className="size-4 accent-green-deep" value={contact.membership_id} {...form.register('recipient_membership_id')} />
                  <span className="grid leading-tight">
                    <span className="font-semibold">{fullName(contact)}</span>
                    <span className="text-[0.87rem] text-ink-3">{ROLE_LABELS[contact.role]}</span>
                  </span>
                </label>
              ))}
            </div>
          ))}
          {recipientError ? <FieldError id="recipient-error">{recipientError}</FieldError> : null}
        </fieldset>

        <div className="grid gap-1.5">
          <label className="text-[0.987rem] font-[650]" htmlFor={bodyId}>
            Message
          </label>
          <textarea id={bodyId} className={`${INPUT_CLASS} min-h-[110px] resize-y py-3`} aria-invalid={!!bodyError} disabled={isPending} {...form.register('body')} />
          {bodyError ? <FieldError id={`${bodyId}-error`}>{bodyError}</FieldError> : null}
        </div>

        {startConversation.isError ? <FormAlert>{getErrorMessage(startConversation.error)}</FormAlert> : null}
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={isPending}>
          {isPending ? 'Sending…' : 'Send message'}
        </button>
      </footer>
    </form>
  )
}
