import type { FormEvent, RefObject } from 'react'
import type { Test } from '@shigjetademy/shared/tests'
import { FormDialog } from '#/components/FormDialog'
import { useTestForm } from '../hooks/use-test-form'
import { useUpdateTest } from '../hooks/use-update-test'
import { toTestFormValues, toUpdateTestInput } from '../utils/test-form'
import type { TestFormValues } from '../utils/test-form'
import { TestFormFields } from './test-form-fields'

interface TestEditDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  test: Test
  timeZone: string
}

/** Change a test's details; its group stays */
export function TestEditDialog({ dialogRef, organizationId, test, timeZone }: TestEditDialogProps) {
  const form = useTestForm(toTestFormValues({ test, timeZone }))
  const updateTest = useUpdateTest({ organizationId, testId: test.id })

  const handleClose = () => {
    dialogRef.current?.close()
    form.reset()
    updateTest.reset()
  }

  const handleValid = (values: TestFormValues) => updateTest.mutate(toUpdateTestInput({ values, timeZone }), { onSuccess: () => dialogRef.current?.close() })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => void form.handleSubmit(handleValid)(event)

  return (
    <FormDialog dialogRef={dialogRef} title="Edit test" subtitle="Changes show to the group’s students right away." onClose={handleClose}>
      <TestFormFields form={form} submitLabel="Save changes" timeZone={timeZone} isPending={updateTest.isPending} error={updateTest.error} onSubmit={handleSubmit} onCancel={handleClose} />
    </FormDialog>
  )
}
