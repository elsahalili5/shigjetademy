import type { FormEvent, RefObject } from 'react'
import type { TestGroup } from '@shigjetademy/shared/tests'
import { FormDialog } from '#/components/FormDialog'
import { useSetTest } from '../hooks/use-set-test'
import { useTestForm } from '../hooks/use-test-form'
import { EMPTY_TEST_FORM, toCreateTestInput } from '../utils/test-form'
import type { TestFormValues } from '../utils/test-form'
import { TestFormFields } from './test-form-fields'

interface TestFormDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  /** The group chosen on the page */
  group: TestGroup
  timeZone: string
}

/** Set a test for the chosen group */
export function TestFormDialog({ dialogRef, organizationId, group, timeZone }: TestFormDialogProps) {
  const form = useTestForm(EMPTY_TEST_FORM)
  const setTest = useSetTest(organizationId)

  const handleClose = () => {
    dialogRef.current?.close()
    form.reset(EMPTY_TEST_FORM)
    setTest.reset()
  }

  const handleValid = (values: TestFormValues) => setTest.mutate(toCreateTestInput({ values, timeZone, groupId: group.id }), { onSuccess: handleClose })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => void form.handleSubmit(handleValid)(event)

  return (
    <FormDialog dialogRef={dialogRef} title="Set test" subtitle={`For ${group.name} · ${group.course_name}. Its students see it once it is set.`} onClose={handleClose}>
      <TestFormFields form={form} submitLabel="Set test" timeZone={timeZone} isPending={setTest.isPending} error={setTest.error} onSubmit={handleSubmit} onCancel={handleClose} />
    </FormDialog>
  )
}
