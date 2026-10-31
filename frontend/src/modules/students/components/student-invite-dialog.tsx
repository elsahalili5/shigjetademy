import { useId } from 'react'
import type { RefObject } from 'react'
import { INVITATION_VALID_DAYS } from '@shigjetademy/shared/invitations'
import type { InviteStudentInput } from '@shigjetademy/shared/invitations'
import { getStudentName } from '@shigjetademy/shared/students'
import type { Student } from '@shigjetademy/shared/students'
import { FormAlert } from '#/components/FormAlert'
import { FormDialog } from '#/components/FormDialog'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useInviteStudent } from '../hooks/use-invite-student'
import { useStudentInviteForm } from '../hooks/use-student-invite-form'

/** Who the dialog invites; a new openCount remounts the form so each opening starts empty */
export type StudentInviteTarget = { student: Student; openCount: number }

interface StudentInviteDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  target: StudentInviteTarget | null
  onInvited: (student: Student) => void
}

export function StudentInviteDialog({ dialogRef, organizationId, target, onInvited }: StudentInviteDialogProps) {
  const handleClose = () => dialogRef.current?.close()

  const handleInvited = (student: Student) => {
    handleClose()
    onInvited(student)
  }

  return (
    <FormDialog
      dialogRef={dialogRef}
      title={target ? `Invite ${getStudentName(target.student)} to log in` : 'Invite to log in'}
      subtitle={`They get an email with a link that works for ${INVITATION_VALID_DAYS} days. Their login is linked to this record.`}
      onClose={handleClose}
    >
      {target ? (
        <StudentInviteForm
          key={`${target.student.id}-${target.openCount}`}
          organizationId={organizationId}
          studentId={target.student.id}
          onInvited={handleInvited}
          onCancel={handleClose}
        />
      ) : null}
    </FormDialog>
  )
}

interface StudentInviteFormProps {
  organizationId: string
  studentId: string
  onInvited: (student: Student) => void
  onCancel: () => void
}

function StudentInviteForm({ organizationId, studentId, onInvited, onCancel }: StudentInviteFormProps) {
  const form = useStudentInviteForm()
  const inviteStudent = useInviteStudent(organizationId)
  const emailId = useId()
  const emailError = getFieldError<InviteStudentInput>({ fieldName: 'email', formErrors: form.formState.errors, backendError: inviteStudent.error })
  // A field error from the server already shows under the email
  const hasFormError = inviteStudent.isError && !emailError

  const handleSubmit = form.handleSubmit((input: InviteStudentInput) => {
    inviteStudent.mutate({ studentId, ...input }, { onSuccess: onInvited })
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
          placeholder="student@example.com"
          disabled={inviteStudent.isPending}
          error={emailError}
          {...form.register('email')}
        />
        {hasFormError ? <FormAlert>{getErrorMessage(inviteStudent.error)}</FormAlert> : null}
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={inviteStudent.isPending}>
          {inviteStudent.isPending ? 'Sending…' : 'Send invitation'}
        </button>
      </footer>
    </form>
  )
}
