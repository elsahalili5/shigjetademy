import { useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import type { AssignmentGroup } from '@shigjetademy/shared/assignments'
import { FormDialog } from '#/components/FormDialog'
import { useAssignmentForm } from '../hooks/use-assignment-form'
import { useSetAssignment } from '../hooks/use-set-assignment'
import { EMPTY_ASSIGNMENT_FORM, toCreateFields } from '../utils/assignment-form'
import type { AssignmentFormValues } from '../utils/assignment-form'
import { AssignmentFormFields } from './assignment-form-fields'

interface AssignmentFormDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  /** The group chosen on the page */
  group: AssignmentGroup
  timeZone: string
}

/** Set an assignment for the chosen group */
export function AssignmentFormDialog({ dialogRef, organizationId, group, timeZone }: AssignmentFormDialogProps) {
  const form = useAssignmentForm(EMPTY_ASSIGNMENT_FORM)
  const setAssignment = useSetAssignment(organizationId)
  // Bumped on close, so the file input, which the form can't clear, starts empty again
  const [fieldsKey, setFieldsKey] = useState(0)

  const handleClose = () => {
    dialogRef.current?.close()
    form.reset(EMPTY_ASSIGNMENT_FORM)
    setAssignment.reset()
    setFieldsKey((key) => key + 1)
  }

  const handleValid = (values: AssignmentFormValues) => setAssignment.mutate({ fields: toCreateFields({ values, timeZone, groupId: group.id }), file: values.file }, { onSuccess: handleClose })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => void form.handleSubmit(handleValid)(event)

  return (
    <FormDialog dialogRef={dialogRef} title="Set assignment" subtitle={`For ${group.name} · ${group.course_name}. Its students see it once it is set.`} onClose={handleClose}>
      <AssignmentFormFields key={fieldsKey} form={form} savedFile={null} submitLabel="Set assignment" timeZone={timeZone} isPending={setAssignment.isPending} error={setAssignment.error} onSubmit={handleSubmit} onCancel={handleClose} />
    </FormDialog>
  )
}
