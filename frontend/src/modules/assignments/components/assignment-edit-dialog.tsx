import { useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import type { Assignment } from '@shigjetademy/shared/assignments'
import { FormDialog } from '#/components/FormDialog'
import { useAssignmentForm } from '../hooks/use-assignment-form'
import { useUpdateAssignment } from '../hooks/use-update-assignment'
import { toAssignmentFormValues, toUpdateFields } from '../utils/assignment-form'
import type { AssignmentFormValues } from '../utils/assignment-form'
import { AssignmentFormFields } from './assignment-form-fields'

interface AssignmentEditDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  assignment: Assignment
  timeZone: string
}

/** Change an assignment's details and file; its group stays */
export function AssignmentEditDialog({ dialogRef, organizationId, assignment, timeZone }: AssignmentEditDialogProps) {
  const form = useAssignmentForm(toAssignmentFormValues({ assignment, timeZone }))
  const updateAssignment = useUpdateAssignment({ organizationId, assignmentId: assignment.id })

  // Bumped on close, so the file input, which the form can't clear, starts empty again
  const [fieldsKey, setFieldsKey] = useState(0)

  const handleClose = () => {
    dialogRef.current?.close()
    form.reset()
    updateAssignment.reset()
    setFieldsKey((key) => key + 1)
  }

  const handleValid = (values: AssignmentFormValues) => updateAssignment.mutate({ fields: toUpdateFields({ values, timeZone }), file: values.file }, { onSuccess: () => dialogRef.current?.close() })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => void form.handleSubmit(handleValid)(event)

  return (
    <FormDialog dialogRef={dialogRef} title="Edit assignment" subtitle="Changes show to the group’s students right away." onClose={handleClose}>
      <AssignmentFormFields
        key={fieldsKey}
        form={form}
        savedFile={assignment.file}
        submitLabel="Save changes"
        timeZone={timeZone}
        isPending={updateAssignment.isPending}
        error={updateAssignment.error}
        onSubmit={handleSubmit}
        onCancel={handleClose}
      />
    </FormDialog>
  )
}
