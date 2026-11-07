import { useId } from 'react'
import type { RefObject } from 'react'
import { INVITATION_VALID_DAYS } from '@shigjetademy/shared/invitations'
import type { InviteRecordInput } from '@shigjetademy/shared/invitations'
import { getLecturerName } from '@shigjetademy/shared/lecturers'
import type { Lecturer } from '@shigjetademy/shared/lecturers'
import { FormAlert } from '#/components/FormAlert'
import { FormDialog } from '#/components/FormDialog'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useInviteLecturer } from '../hooks/use-invite-lecturer'
import { useLecturerInviteForm } from '../hooks/use-lecturer-invite-form'

/** Who the dialog invites; a new openCount remounts the form so each opening starts from the record's email */
export type LecturerInviteTarget = { lecturer: Lecturer; openCount: number }

interface LecturerInviteDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  target: LecturerInviteTarget | null
  onInvited: (lecturer: Lecturer) => void
}

export function LecturerInviteDialog({ dialogRef, organizationId, target, onInvited }: LecturerInviteDialogProps) {
  const handleClose = () => dialogRef.current?.close()

  const handleInvited = (lecturer: Lecturer) => {
    handleClose()
    onInvited(lecturer)
  }

  return (
    <FormDialog
      dialogRef={dialogRef}
      title={target ? `Invite ${getLecturerName(target.lecturer)} to log in` : 'Invite to log in'}
      subtitle={`They get an email with a link that works for ${INVITATION_VALID_DAYS} days. Their login is linked to this record.`}
      onClose={handleClose}
    >
      {target ? (
        <LecturerInviteForm key={`${target.lecturer.id}-${target.openCount}`} organizationId={organizationId} lecturer={target.lecturer} onInvited={handleInvited} onCancel={handleClose} />
      ) : null}
    </FormDialog>
  )
}

interface LecturerInviteFormProps {
  organizationId: string
  lecturer: Lecturer
  onInvited: (lecturer: Lecturer) => void
  onCancel: () => void
}

function LecturerInviteForm({ organizationId, lecturer, onInvited, onCancel }: LecturerInviteFormProps) {
  const form = useLecturerInviteForm(lecturer.email)
  const inviteLecturer = useInviteLecturer(organizationId)
  const emailId = useId()
  const emailError = getFieldError<InviteRecordInput>({ fieldName: 'email', formErrors: form.formState.errors, backendError: inviteLecturer.error })
  // A field error from the server already shows under the email
  const hasFormError = inviteLecturer.isError && !emailError

  const handleSubmit = form.handleSubmit((input: InviteRecordInput) => {
    inviteLecturer.mutate({ lecturerId: lecturer.id, ...input }, { onSuccess: onInvited })
  })

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-4 overflow-y-auto px-6 py-5">
        <AuthField
          id={emailId}
          label="Email"
          type="email"
          autoComplete="off"
          inputMode="email"
          placeholder="lecturer@example.com"
          disabled={inviteLecturer.isPending}
          error={emailError}
          {...form.register('email')}
        />
        {hasFormError ? <FormAlert>{getErrorMessage(inviteLecturer.error)}</FormAlert> : null}
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={inviteLecturer.isPending}>
          {inviteLecturer.isPending ? 'Sending…' : 'Send invitation'}
        </button>
      </footer>
    </form>
  )
}
