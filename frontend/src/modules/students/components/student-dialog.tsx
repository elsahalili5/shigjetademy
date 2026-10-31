import { useId } from 'react'
import type { RefObject } from 'react'
import { getStudentName } from '@shigjetademy/shared/students'
import type { CreateStudentInput, Student } from '@shigjetademy/shared/students'
import { FormAlert } from '#/components/FormAlert'
import { FormDialog } from '#/components/FormDialog'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useSaveStudent } from '../hooks/use-save-student'
import { useStudentForm } from '../hooks/use-student-form'

export type StudentDialogMode = { kind: 'add'; openCount: number } | { kind: 'edit'; student: Student }

interface StudentDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  mode: StudentDialogMode
  onSaved: (saved: Student) => void
}

export function StudentDialog({ dialogRef, organizationId, mode, onSaved }: StudentDialogProps) {
  const student = mode.kind === 'edit' ? mode.student : undefined
  // A new key per opening remounts the form, so every add starts empty and every edit from the student's values
  const formKey = mode.kind === 'edit' ? `edit-${mode.student.id}` : `add-${mode.openCount}`

  const handleClose = () => dialogRef.current?.close()

  const handleSaved = (saved: Student) => {
    handleClose()
    onSaved(saved)
  }

  return (
    <FormDialog
      dialogRef={dialogRef}
      title={student ? `Edit ${getStudentName(student)}` : 'Add a student'}
      subtitle="A record the school keeps. No email or account is needed."
      onClose={handleClose}
    >
      <StudentForm key={formKey} organizationId={organizationId} student={student} onSaved={handleSaved} onCancel={handleClose} />
    </FormDialog>
  )
}

interface StudentFormProps {
  organizationId: string
  student?: Student
  onSaved: (saved: Student) => void
  onCancel: () => void
}

function StudentForm({ organizationId, student, onSaved, onCancel }: StudentFormProps) {
  const form = useStudentForm(student)
  const saveStudent = useSaveStudent(organizationId)
  const ids = { firstName: useId(), lastName: useId(), dateOfBirth: useId(), enrolledOn: useId(), studentNumber: useId(), notes: useId() }
  const { errors } = form.formState
  const isPending = saveStudent.isPending
  const fieldError = (fieldName: keyof CreateStudentInput) => getFieldError<CreateStudentInput>({ fieldName, formErrors: errors, backendError: saveStudent.error })

  const handleSubmit = form.handleSubmit((input: CreateStudentInput) => {
    const params = student ? { kind: 'edit' as const, studentId: student.id, input } : { kind: 'add' as const, input }
    saveStudent.mutate(params, { onSuccess: onSaved })
  })

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-4 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <AuthField id={ids.firstName} label="First name" autoComplete="off" disabled={isPending} error={fieldError('first_name')} {...form.register('first_name')} />
          <AuthField id={ids.lastName} label="Last name" autoComplete="off" disabled={isPending} error={fieldError('last_name')} {...form.register('last_name')} />
        </div>
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <AuthField id={ids.dateOfBirth} label="Date of birth (optional)" type="date" disabled={isPending} error={fieldError('date_of_birth')} {...form.register('date_of_birth')} />
          <AuthField id={ids.enrolledOn} label="Enrolled on" type="date" disabled={isPending} error={fieldError('enrolled_on')} {...form.register('enrolled_on')} />
        </div>
        <div className="grid gap-1.5">
          <AuthField
            id={ids.studentNumber}
            label="Student number"
            autoComplete="off"
            placeholder={student ? undefined : 'Assigned automatically'}
            disabled={isPending}
            error={fieldError('student_number')}
            {...form.register('student_number')}
          />
          <p className="text-[0.93rem] text-ink-3">
            {student ? 'Unique in your organization.' : 'Leave it empty to get the next number, like STU-0001, or type your own.'}
          </p>
        </div>
        <AuthField id={ids.notes} label="Notes (optional)" autoComplete="off" disabled={isPending} error={fieldError('notes')} {...form.register('notes')} />

        {saveStudent.isError ? <FormAlert>{getErrorMessage(saveStudent.error)}</FormAlert> : null}
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={isPending}>
          {student ? 'Save changes' : 'Add student'}
        </button>
      </footer>
    </form>
  )
}
